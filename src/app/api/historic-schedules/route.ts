import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/historic-schedules
 * Get historic schedules (for equity analysis)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can view historic schedules
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    const schedules = await prisma.historicSchedule.findMany({
      where: venueId ? { venueId } : undefined,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching historic schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historic schedules' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/historic-schedules
 * Delete a historic schedule
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can delete historic schedules
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    await prisma.historicSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting historic schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete historic schedule' },
      { status: 500 }
    );
  }
}
