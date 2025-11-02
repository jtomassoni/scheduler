import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/[id]/available-for-trade
 * Get staff available for trading this shift
 * Returns users who:
 * - Work at this venue (or networked venues)
 * - Are not already assigned to this shift
 * - Are not working at this venue or any networked venue on the same date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shiftId = params.id;

    // Get the shift with venue info
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            isNetworked: true,
          },
        },
        assignments: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
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
      select: {
        id: true,
        assignments: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Get all user IDs who are already assigned or working at a conflicting shift
    const unavailableUserIds = new Set<string>();

    // Add users already assigned to this shift
    shift.assignments.forEach((assignment) => {
      unavailableUserIds.add(assignment.userId);
    });

    // Add users working at conflicting shifts
    conflictingShifts.forEach((conflictShift) => {
      conflictShift.assignments.forEach((assignment) => {
        unavailableUserIds.add(assignment.userId);
      });
    });

    // Get all staff who work at this venue (check preferredVenuesOrder)
    // For now, get all active bartenders and barbacks
    // In the future, we could filter by preferredVenuesOrder
    const allStaff = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: {
          in: ['BARTENDER', 'BARBACK'],
        },
        // Exclude users who are unavailable
        id: {
          notIn: Array.from(unavailableUserIds),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isLead: true,
        preferredVenuesOrder: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filter to only include staff who work at this venue or networked venues
    // This means their preferredVenuesOrder includes this venue or any networked venue
    const availableStaff = allStaff.filter((staff) => {
      if (
        !staff.preferredVenuesOrder ||
        staff.preferredVenuesOrder.length === 0
      ) {
        // If no preferred venues, include them (they might work everywhere)
        return true;
      }
      // Check if they have this venue or any networked venue in their preferences
      return staff.preferredVenuesOrder.some((venueId) =>
        networkedVenueIds.includes(venueId)
      );
    });

    return NextResponse.json(availableStaff);
  } catch (error) {
    console.error('Error fetching available staff for trade:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available staff' },
      { status: 500 }
    );
  }
}
