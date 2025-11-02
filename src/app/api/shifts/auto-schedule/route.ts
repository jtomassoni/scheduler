import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoFillShift } from '@/lib/auto-fill-shifts';

/**
 * POST /api/shifts/auto-schedule
 * Auto-schedule multiple shifts based on availability
 * Query params: venueId (optional), startDate (optional), endDate (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can auto-schedule
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only managers can auto-schedule shifts' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query to find shifts that need staffing
    const where: {
      venueId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {};

    if (venueId && venueId !== 'all' && venueId.trim() !== '') {
      where.venueId = venueId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Get shifts with their current assignments
    const shifts = await prisma.shift.findMany({
      where,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          select: {
            userId: true,
            role: true,
            isLead: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Filter to only shifts that are not fully staffed
    const shiftsNeedingStaff = shifts.filter((shift) => {
      const bartenderCount = shift.assignments.filter(
        (a) => a.role === 'BARTENDER'
      ).length;
      const barbackCount = shift.assignments.filter(
        (a) => a.role === 'BARBACK'
      ).length;
      const leadCount = shift.assignments.filter((a) => a.isLead).length;

      return (
        bartenderCount < shift.bartendersRequired ||
        barbackCount < shift.barbacksRequired ||
        leadCount < shift.leadsRequired
      );
    });

    if (shiftsNeedingStaff.length === 0) {
      return NextResponse.json({
        message: 'All shifts are fully staffed',
        processed: 0,
        assigned: 0,
        results: [],
      });
    }

    // Auto-fill each shift
    const results = [];
    let totalAssigned = 0;

    for (const shift of shiftsNeedingStaff) {
      try {
        const result = await autoFillShift({
          shiftId: shift.id,
          venueId: shift.venueId,
          date: new Date(shift.date),
          startTime: shift.startTime,
          endTime: shift.endTime,
          bartendersRequired: shift.bartendersRequired,
          barbacksRequired: shift.barbacksRequired,
          leadsRequired: shift.leadsRequired,
        });

        totalAssigned += result.assigned;
        results.push({
          shiftId: shift.id,
          shiftDate: shift.date,
          venueName: shift.venue.name,
          assigned: result.assigned,
          summary: result.summary,
          success: true,
        });
      } catch (error) {
        console.error(`Failed to auto-fill shift ${shift.id}:`, error);
        results.push({
          shiftId: shift.id,
          shiftDate: shift.date,
          venueName: shift.venue.name,
          assigned: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Auto-scheduled ${shiftsNeedingStaff.length} shift(s)`,
      processed: shiftsNeedingStaff.length,
      assigned: totalAssigned,
      results,
    });
  } catch (error) {
    console.error('Error auto-scheduling shifts:', error);
    return NextResponse.json(
      { error: 'Failed to auto-schedule shifts' },
      { status: 500 }
    );
  }
}
