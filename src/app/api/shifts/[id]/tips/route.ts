import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notification-service';

// Schema for bulk tip entry
const bulkTipSchema = z.object({
  tips: z.array(
    z.object({
      assignmentId: z.string(),
      amount: z.number().min(0).max(99999.99),
    })
  ),
});

/**
 * POST /api/shifts/[id]/tips
 * Bulk tip entry for all assignments in a shift
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

    // Only managers can enter tips
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = bulkTipSchema.parse(body);

    // Verify shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        venue: {
          select: {
            tipPoolEnabled: true,
          },
        },
        assignments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (!shift.venue.tipPoolEnabled) {
      return NextResponse.json(
        { error: 'Tip pool is not enabled for this venue' },
        { status: 400 }
      );
    }

    // Verify all assignment IDs belong to this shift
    const validAssignmentIds = new Set(shift.assignments.map((a) => a.id));
    const invalidIds = validatedData.tips.filter(
      (tip) => !validAssignmentIds.has(tip.assignmentId)
    );

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid assignment IDs provided' },
        { status: 400 }
      );
    }

    // Update all tips in a transaction
    const updatePromises = validatedData.tips.map((tip) => {
      return prisma.shiftAssignment.update({
        where: { id: tip.assignmentId },
        data: {
          tipAmount: tip.amount,
          tipEnteredBy: session.user.id,
          tipEnteredAt: tip.amount > 0 ? new Date() : null,
          tipUpdatedAt: new Date(),
        },
      });
    });

    await prisma.$transaction(updatePromises);

    // Get updated assignments with shift and venue details
    const updatedAssignments = await prisma.shiftAssignment.findMany({
      where: {
        shiftId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Notify users about their tip amounts
    if (updatedAssignments.length > 0) {
      try {
        const notificationPromises = updatedAssignments
          .filter((assignment) => assignment.tipAmount !== null)
          .map((assignment) =>
            NotificationService.create({
              userId: assignment.user.id,
              type: 'SHIFT_ASSIGNED',
              title: 'Tips Updated',
              message: `Your tips for ${assignment.shift.venue.name} on ${new Date(assignment.shift.date).toLocaleDateString()} have been updated: $${assignment.tipAmount?.toFixed(2) || '0.00'}`,
              data: {
                shiftId: assignment.shift.id,
                assignmentId: assignment.id,
                tipAmount: assignment.tipAmount,
                venueName: assignment.shift.venue.name,
                date: assignment.shift.date,
              },
            })
          );

        await Promise.all(notificationPromises);
      } catch (notifError) {
        console.error('Failed to send tip update notifications:', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      assignments: updatedAssignments,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving tips:', error);
    return NextResponse.json({ error: 'Failed to save tips' }, { status: 500 });
  }
}
