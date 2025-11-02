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

    console.log('API: Fetching shift with ID:', shiftId);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        eventName: true,
        bartendersRequired: true,
        barbacksRequired: true,
        leadsRequired: true,
        tipsPublished: true,
        tipsPublishedAt: true,
        tipsPublishedBy: true,
        venue: {
          select: {
            id: true,
            name: true,
            isNetworked: true,
            tipPoolEnabled: true,
          },
        },
        assignments: {
          select: {
            id: true,
            role: true,
            isLead: true,
            tipAmount: true,
            tipCurrency: true,
            tipEnteredBy: true,
            tipEnteredAt: true,
            tipUpdatedAt: true,
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
          select: {
            id: true,
            userId: true,
            reason: true,
            violationType: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            approvals: {
              select: {
                id: true,
                approverId: true,
                approved: true,
                comment: true,
                createdAt: true,
              },
            },
          },
        },
        trades: {
          select: {
            id: true,
            proposerId: true,
            receiverId: true,
            status: true,
            reason: true,
            approvedBy: true,
            approvedAt: true,
            declinedReason: true,
            createdAt: true,
            updatedAt: true,
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
      console.log('API: Shift not found with ID:', shiftId);
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    console.log('API: Shift found:', shift.id);
    return NextResponse.json(shift);
  } catch (error) {
    console.error('Error fetching shift:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch shift',
        details: error instanceof Error ? error.message : String(error),
      },
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can update shifts
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const shiftId = resolvedParams.id;

    const body = await request.json();

    // Validate request body
    const validatedData = shiftUpdateSchema.parse({ ...body, id: shiftId });

    // Get original shift data to compare for changes
    const originalShift = await prisma.shift.findUnique({
      where: { id: shiftId },
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
      where: { id: shiftId },
      data: {
        ...(validatedData.venueId && {
          venue: { connect: { id: validatedData.venueId } },
        }),
        ...(validatedData.date && { date: validatedData.date }),
        ...(validatedData.startTime && { startTime: validatedData.startTime }),
        ...(validatedData.endTime && { endTime: validatedData.endTime }),
        ...(validatedData.eventName !== undefined && {
          eventName: validatedData.eventName,
        }),
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can delete shifts
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const shiftId = resolvedParams.id;

    await prisma.shift.delete({
      where: { id: shiftId },
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
