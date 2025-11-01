import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { overrideApprovalSchema } from '@/lib/validations';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { NotificationService } from '@/lib/notification-service';

/**
 * POST /api/overrides/[id]/approve
 * Staff member approves or declines an override
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = overrideApprovalSchema.parse({
      ...body,
      overrideId: params.id,
    });

    // Get override
    const override = await prisma.override.findUnique({
      where: { id: params.id },
      include: {
        approvals: true,
      },
    });

    if (!override) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      );
    }

    // Check if override is for this user
    if (override.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only approve overrides for yourself' },
        { status: 403 }
      );
    }

    // Check if already approved
    const existingApproval = override.approvals.find(
      (a) => a.approverId === session.user.id
    );

    if (existingApproval) {
      return NextResponse.json(
        { error: 'You have already responded to this override' },
        { status: 400 }
      );
    }

    // Create approval
    await prisma.overrideApproval.create({
      data: {
        overrideId: params.id,
        approverId: session.user.id,
        approved: validatedData.approved,
        comment: validatedData.comment || null,
      },
    });

    // Update override history
    const historyEntry = {
      action: validatedData.approved ? 'staff_approved' : 'staff_declined',
      userId: session.user.id,
      userName: session.user.name,
      timestamp: new Date().toISOString(),
      note: validatedData.comment || undefined,
    };

    const currentHistory = (override.history as Array<unknown>) || [];
    const updatedHistory = [
      ...currentHistory,
      historyEntry,
    ] as Prisma.InputJsonValue[];

    // Determine new status
    let newStatus = override.status;
    if (validatedData.approved) {
      // Check if both manager and staff have approved
      const managerApproval = override.approvals.find((a) => a.approved);
      if (managerApproval) {
        newStatus = 'ACTIVE';
      } else {
        newStatus = 'APPROVED';
      }
    } else {
      newStatus = 'DECLINED';
    }

    // Update override
    const updatedOverride = await prisma.override.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        history: updatedHistory,
      },
      include: {
        shift: {
          include: {
            venue: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Notify venue managers about the override decision
    try {
      // Get managers for the venue
      const venue = await prisma.venue.findUnique({
        where: { id: updatedOverride.shift.venueId },
        include: {
          managers: {
            select: {
              id: true,
            },
          },
        },
      });

      if (venue && venue.managers.length > 0) {
        const managerIds = venue.managers.map((m) => m.id);
        const statusText =
          newStatus === 'ACTIVE'
            ? 'approved'
            : newStatus === 'DECLINED'
              ? 'declined'
              : 'pending';

        await NotificationService.createBulk(managerIds, {
          type: 'OVERRIDE_APPROVED',
          title: `Override ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
          message:
            newStatus === 'ACTIVE'
              ? `The staff member has approved the override for ${updatedOverride.shift.venue.name} on ${new Date(updatedOverride.shift.date).toLocaleDateString()}. The assignment is now active.`
              : `The staff member has declined the override for ${updatedOverride.shift.venue.name} on ${new Date(updatedOverride.shift.date).toLocaleDateString()}.`,
          data: {
            overrideId: updatedOverride.id,
            shiftId: updatedOverride.shift.id,
            status: newStatus,
          },
        });
      }
    } catch (notifError) {
      console.error(
        'Failed to send override decision notification:',
        notifError
      );
    }

    return NextResponse.json(updatedOverride);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing override approval:', error);
    return NextResponse.json(
      { error: 'Failed to process override approval' },
      { status: 500 }
    );
  }
}
