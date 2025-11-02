import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notification-service';

/**
 * POST /api/shifts/[id]/put-up-for-trade
 * Put a shift up for trade (marketplace model)
 * Notifies all eligible staff and managers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const shiftId = resolvedParams.id;
    const body = await request.json();
    const reason = body.reason || null;

    // Get the shift with venue info
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            isNetworked: true,
            managers: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                isLead: true,
              },
            },
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify user is assigned to this shift
    const userAssignment = shift.assignments.find(
      (a) => a.user.id === session.user.id
    );

    if (!userAssignment) {
      return NextResponse.json(
        { error: 'You are not assigned to this shift' },
        { status: 403 }
      );
    }

    if (shift.upForTrade) {
      return NextResponse.json(
        { error: 'This shift is already up for trade' },
        { status: 400 }
      );
    }

    // Get all networked venues if this venue is networked
    let networkedVenueIds: string[] = [shift.venueId];
    if (shift.venue.isNetworked) {
      const networkedVenues = await prisma.venue.findMany({
        where: {
          isNetworked: true,
        },
        select: {
          id: true,
        },
      });
      networkedVenueIds = networkedVenues.map((v) => v.id);
    }

    // Get all shifts on the same date at this venue or any networked venue
    const shiftDate = new Date(shift.date);
    shiftDate.setHours(0, 0, 0, 0);
    const shiftDateEnd = new Date(shiftDate);
    shiftDateEnd.setHours(23, 59, 59, 999);

    const conflictingShifts = await prisma.shift.findMany({
      where: {
        venueId: {
          in: networkedVenueIds,
        },
        date: {
          gte: shiftDate,
          lte: shiftDateEnd,
        },
      },
      include: {
        assignments: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Get all user IDs who are working at conflicting shifts
    const unavailableUserIds = new Set<string>();
    conflictingShifts.forEach((conflictShift) => {
      conflictShift.assignments.forEach((assignment) => {
        unavailableUserIds.add(assignment.userId);
      });
    });

    // Get eligible staff: work at this venue/networked venues, not already working, same role as proposer
    const proposerRole = userAssignment.user.role;
    const proposerIsLead = userAssignment.isLead;

    const eligibleStaff = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: proposerRole, // Must be same role
        id: {
          notIn: Array.from(unavailableUserIds),
          not: session.user.id, // Can't trade with yourself
        },
        ...(proposerIsLead ? { isLead: true } : {}), // If proposer is lead, receiver must also be lead
      },
      select: {
        id: true,
        name: true,
        email: true,
        preferredVenuesOrder: true,
      },
    });

    // Filter to only include staff who work at this venue or networked venues
    const availableStaff = eligibleStaff.filter((staff) => {
      if (
        !staff.preferredVenuesOrder ||
        staff.preferredVenuesOrder.length === 0
      ) {
        return true; // If no preferred venues, include them
      }
      return staff.preferredVenuesOrder.some((venueId) =>
        networkedVenueIds.includes(venueId)
      );
    });

    // Update shift to be up for trade
    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        upForTrade: true,
        upForTradeAt: new Date(),
        upForTradeBy: session.user.id,
        upForTradeReason: reason,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            tipPoolEnabled: true,
            isNetworked: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isLead: true,
              },
            },
          },
        },
      },
    });

    // Notify all eligible staff
    const shiftDateFormatted = new Date(shift.date).toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }
    );

    for (const staff of availableStaff) {
      try {
        await NotificationService.create({
          userId: staff.id,
          type: 'TRADE_PROPOSED',
          title: 'Shift Available for Trade',
          message: `A ${proposerRole.toLowerCase()} shift at ${shift.venue.name} on ${shiftDateFormatted} is available for trade. Check your calendar to claim it.`,
          data: {
            shiftId: shift.id,
            proposerId: session.user.id,
            proposerName: userAssignment.user.name,
          },
        });
      } catch (notifError) {
        console.error(`Failed to notify staff ${staff.id}:`, notifError);
      }
    }

    // Notify all managers for this venue
    for (const manager of shift.venue.managers) {
      try {
        await NotificationService.create({
          userId: manager.id,
          type: 'TRADE_PROPOSED',
          title: 'Shift Put Up for Trade',
          message: `${userAssignment.user.name} put a shift up for trade at ${shift.venue.name} on ${shiftDateFormatted}. Eligible staff have been notified.`,
          data: {
            shiftId: shift.id,
            proposerId: session.user.id,
            proposerName: userAssignment.user.name,
          },
        });
      } catch (notifError) {
        console.error(`Failed to notify manager ${manager.id}:`, notifError);
      }
    }

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error('Error putting shift up for trade:', error);
    return NextResponse.json(
      { error: 'Failed to put shift up for trade' },
      { status: 500 }
    );
  }
}
