import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notification-service';

/**
 * POST /api/shifts/[id]/tips/publish
 * Publish tips for a shift (makes them visible to staff)
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

    // Only managers can publish tips
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        venue: {
          select: {
            tipPoolEnabled: true,
            name: true,
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

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (!shift.venue.tipPoolEnabled) {
      return NextResponse.json(
        { error: 'Tip pool is not enabled for this venue' },
        { status: 400 }
      );
    }

    // Check if tips have been entered
    const assignmentsWithTips = shift.assignments.filter(
      (a) => a.tipAmount !== null
    );

    if (assignmentsWithTips.length === 0) {
      return NextResponse.json(
        { error: 'No tips have been entered for this shift' },
        { status: 400 }
      );
    }

    // Publish tips
    const updatedShift = await prisma.shift.update({
      where: { id: params.id },
      data: {
        tipsPublished: true,
        tipsPublishedAt: new Date(),
        tipsPublishedBy: session.user.id,
      },
      include: {
        venue: {
          select: {
            name: true,
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

    // Notify staff about published tips
    try {
      const userIds = assignmentsWithTips.map((a) => a.user.id);
      await NotificationService.createBulk(userIds, {
        type: 'SHIFT_ASSIGNED',
        title: 'Tips Published',
        message: `Tips for your shift at ${updatedShift.venue.name} on ${new Date(updatedShift.date).toLocaleDateString()} have been published.`,
        data: {
          shiftId: updatedShift.id,
          venueName: updatedShift.venue.name,
          date: updatedShift.date,
          tipsPublished: true,
        },
      });
    } catch (notifError) {
      console.error('Failed to send tip publish notifications:', notifError);
    }

    return NextResponse.json({
      success: true,
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Error publishing tips:', error);
    return NextResponse.json(
      { error: 'Failed to publish tips' },
      { status: 500 }
    );
  }
}
