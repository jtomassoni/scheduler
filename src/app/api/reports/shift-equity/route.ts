import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get all shift assignments in date range
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        shift: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
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

    // Aggregate data by user
    const userStats: Record<
      string,
      {
        userId: string;
        userName: string;
        email: string;
        role: string;
        totalShifts: number;
        leadShifts: number;
        venues: Record<string, { venueName: string; count: number }>;
      }
    > = {};

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
        };
      }

      userStats[userId].totalShifts += 1;

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

    // Convert to array and sort by total shifts (descending)
    const report = Object.values(userStats)
      .map((stats) => ({
        ...stats,
        venues: Object.values(stats.venues).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.totalShifts - a.totalShifts);

    return NextResponse.json({
      startDate,
      endDate,
      totalAssignments: assignments.length,
      staffCount: report.length,
      data: report,
    });
  } catch (error) {
    console.error('Error generating shift equity report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
