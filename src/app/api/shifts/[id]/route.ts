import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { shiftUpdateSchema } from '@/lib/validations';
import { z } from 'zod';
import { NotificationService } from '@/lib/notification-service';

/**
 * GET /api/shifts/[id]
 * Get a specific shift by ID
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

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            isNetworked: true,
            tipPoolEnabled: true,
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
                hasDayJob: true,
                dayJobCutoff: true,
              },
            },
          },
        },
        overrides: {
          include: {
            approvals: true,
          },
        },
        trades: {
          include: {
            proposer: {
              select: {
                id: true,
                name: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Error fetching shift:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shifts/[id]
 * Update a shift (Manager or Super Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can update shifts
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = shiftUpdateSchema.parse({ ...body, id: params.id });

    // Get original shift data to compare for changes
    const originalShift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        venue: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!originalShift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check if time/date changed
    const dateChanged =
      validatedData.date &&
      originalShift.date.toISOString() !==
        new Date(validatedData.date).toISOString();
    const timeChanged =
      (validatedData.startTime &&
        originalShift.startTime !== validatedData.startTime) ||
      (validatedData.endTime &&
        originalShift.endTime !== validatedData.endTime);

    // Update shift
    const updatedShift = await prisma.shift.update({
      where: { id: params.id },
      data: {
        ...(validatedData.venueId && { venueId: validatedData.venueId }),
        ...(validatedData.date && { date: validatedData.date }),
        ...(validatedData.startTime && { startTime: validatedData.startTime }),
        ...(validatedData.endTime && { endTime: validatedData.endTime }),
        ...(validatedData.bartendersRequired !== undefined && {
          bartendersRequired: validatedData.bartendersRequired,
        }),
        ...(validatedData.barbacksRequired !== undefined && {
          barbacksRequired: validatedData.barbacksRequired,
        }),
        ...(validatedData.leadsRequired !== undefined && {
          leadsRequired: validatedData.leadsRequired,
        }),
      },
      include: {
        venue: true,
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

    // Notify assigned users if date or time changed
    if ((dateChanged || timeChanged) && updatedShift.assignments.length > 0) {
      try {
        const userIds = updatedShift.assignments.map((a) => a.user.id);
        const changeDescription = [];

        if (dateChanged) {
          changeDescription.push(
            `date changed to ${new Date(updatedShift.date).toLocaleDateString()}`
          );
        }
        if (timeChanged) {
          changeDescription.push(
            `time changed to ${updatedShift.startTime} - ${updatedShift.endTime}`
          );
        }

        await NotificationService.createBulk(userIds, {
          type: 'SHIFT_ASSIGNED',
          title: 'Shift Time Updated',
          message: `Your shift at ${updatedShift.venue.name} has been updated: ${changeDescription.join(', ')}.`,
          data: {
            shiftId: updatedShift.id,
            venueId: updatedShift.venue.id,
            venueName: updatedShift.venue.name,
            date: updatedShift.date,
            startTime: updatedShift.startTime,
            endTime: updatedShift.endTime,
          },
        });
      } catch (notifError) {
        console.error('Failed to send shift update notifications:', notifError);
      }
    }

    return NextResponse.json(updatedShift);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating shift:', error);
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shifts/[id]
 * Delete a shift (Manager or Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can delete shifts
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.shift.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    );
  }
}
