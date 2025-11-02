import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notification-service';

// Schema for tip pool entry
const tipPoolSchema = z.object({
  perPersonAmount: z.number().min(0).max(99999.99),
});

/**
 * POST /api/shifts/[id]/tips
 * Bulk tip entry for all assignments in a shift
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Handle params which might be a Promise in Next.js App Router
    const resolvedParams = params instanceof Promise ? await params : params;
    const shiftId = resolvedParams.id;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can enter tips
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = tipPoolSchema.parse(body);

    // Verify shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
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

    if (shift.assignments.length === 0) {
      return NextResponse.json(
        { error: 'No staff assigned to this shift' },
        { status: 400 }
      );
    }

    // Apply the same per-person amount to all staff
    const perPersonAmount = validatedData.perPersonAmount;

    // Update all tips in a transaction - apply equally to all
    const updatePromises = shift.assignments.map((assignment) => {
      return prisma.shiftAssignment.update({
        where: { id: assignment.id },
        data: {
          tipAmount: perPersonAmount,
          tipEnteredBy: session.user.id,
          tipEnteredAt: perPersonAmount > 0 ? new Date() : null,
          tipUpdatedAt: new Date(),
        },
      });
    });

    await prisma.$transaction(updatePromises);

    // Automatically publish tips if amount > 0
    if (perPersonAmount > 0) {
      await prisma.shift.update({
        where: { id: shiftId },
        data: {
          tipsPublished: true,
          tipsPublishedAt: new Date(),
          tipsPublishedBy: session.user.id,
        },
      });
    }

    // Get updated assignments with shift and venue details
    const updatedAssignments = await prisma.shiftAssignment.findMany({
      where: {
        shiftId: shiftId,
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
              type: 'TIP_UPDATED',
              title: 'Tips Updated',
              message: `Tip pool for ${assignment.shift.venue.name} on ${new Date(assignment.shift.date).toLocaleDateString()} has been updated. Your share: $${assignment.tipAmount?.toFixed(2) || '0.00'}`,
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
