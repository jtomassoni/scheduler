import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - this route uses headers() for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/shift-equity?startDate=xxx&endDate=xxx
 * Monthly shift equity report - shows how shifts are distributed across staff
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can view reports
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Get all shift assignments in date range
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        shift: {
          date: {
            gte: startDateObj,
            lte: endDateObj,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            venue: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Get historic schedules that overlap with date range
    const historicSchedules = await prisma.historicSchedule.findMany({
      where: {
        AND: [
          { periodStart: { lte: endDateObj } },
          { periodEnd: { gte: startDateObj } },
        ],
      },
      select: {
        id: true,
        data: true,
        periodName: true,
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Aggregate data by user
    const userStats: Record<
      string,
      {
        userId: string | null;
        userName: string;
        email: string | null;
        role: string;
        totalShifts: number;
        leadShifts: number;
        venues: Record<string, { venueName: string; count: number }>;
        historicShifts: number;
        currentShifts: number;
      }
    > = {};

    // Process current shift assignments
    assignments.forEach((assignment) => {
      const userId = assignment.user.id;

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          userName: assignment.user.name,
          email: assignment.user.email,
          role: assignment.user.role,
          totalShifts: 0,
          leadShifts: 0,
          venues: {},
          historicShifts: 0,
          currentShifts: 0,
        };
      }

      userStats[userId].totalShifts += 1;
      userStats[userId].currentShifts += 1;

      if (assignment.isLead) {
        userStats[userId].leadShifts += 1;
      }

      const venueId = assignment.shift.venue.id;
      const venueName = assignment.shift.venue.name;

      if (!userStats[userId].venues[venueId]) {
        userStats[userId].venues[venueId] = { venueName, count: 0 };
      }

      userStats[userId].venues[venueId].count += 1;
    });

    // Process historic schedule data
    historicSchedules.forEach((schedule) => {
      const historicData = schedule.data as Array<{
        date: string;
        userName: string;
        role: 'BARTENDER' | 'BARBACK';
        isLead?: boolean;
        userId?: string | null;
        venueName?: string;
        matched?: boolean;
      }>;

      historicData.forEach((assignment) => {
        const assignmentDate = new Date(assignment.date);

        // Only include if within the report date range
        if (assignmentDate < startDateObj || assignmentDate > endDateObj) {
          return;
        }

        // Use userId if matched, otherwise use userName as key
        const key = assignment.userId || `historic_${assignment.userName}`;
        const venueName =
          assignment.venueName || schedule.venue?.name || 'Unknown Venue';
        const venueKey = schedule.venue?.id || `historic_${venueName}`;

        if (!userStats[key]) {
          userStats[key] = {
            userId: assignment.userId || null,
            userName: assignment.userName,
            email: assignment.userId ? null : null, // Can't get email for unmatched historic users
            role: assignment.role,
            totalShifts: 0,
            leadShifts: 0,
            venues: {},
            historicShifts: 0,
            currentShifts: 0,
          };
        }

        userStats[key].totalShifts += 1;
        userStats[key].historicShifts += 1;

        if (assignment.isLead) {
          userStats[key].leadShifts += 1;
        }

        if (!userStats[key].venues[venueKey]) {
          userStats[key].venues[venueKey] = { venueName, count: 0 };
        }

        userStats[key].venues[venueKey].count += 1;
      });
    });

    // Convert to array and sort by total shifts (descending)
    const report = Object.values(userStats)
      .map((stats) => ({
        ...stats,
        venues: Object.values(stats.venues).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.totalShifts - a.totalShifts);

    // Calculate totals including historic
    const totalHistoricShifts = historicSchedules.reduce((sum, schedule) => {
      const data = schedule.data as Array<{ date: string }>;
      return (
        sum +
        data.filter((a) => {
          const date = new Date(a.date);
          return date >= startDateObj && date <= endDateObj;
        }).length
      );
    }, 0);

    return NextResponse.json({
      startDate,
      endDate,
      totalAssignments: assignments.length + totalHistoricShifts,
      currentAssignments: assignments.length,
      historicAssignments: totalHistoricShifts,
      staffCount: report.length,
      data: report,
      includesHistoric: historicSchedules.length > 0,
      historicSchedules: historicSchedules.map((s) => ({
        id: s.id,
        periodName: s.periodName,
        venueName: s.venue?.name || 'All Venues',
      })),
    });
  } catch (error) {
    console.error('Error generating shift equity report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
