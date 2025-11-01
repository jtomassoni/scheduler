import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/venue-summary?startDate=xxx&endDate=xxx
 * Venue summary report - shows venue utilization and statistics
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

    // Get all venues
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Get shifts and assignments in date range
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          select: {
            id: true,
            userId: true,
            isLead: true,
          },
        },
      },
    });

    // Get overrides in date range
    const overrides = await prisma.override.findMany({
      where: {
        shift: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
      include: {
        shift: {
          select: {
            venueId: true,
          },
        },
      },
    });

    // Aggregate data by venue
    const venueStats: Record<
      string,
      {
        venueId: string;
        venueName: string;
        totalShifts: number;
        totalAssignments: number;
        uniqueStaff: Set<string>;
        leadShifts: number;
        shiftsRequiringLeads: number;
        overridesCount: number;
      }
    > = {};

    // Initialize for all venues
    venues.forEach((venue) => {
      venueStats[venue.id] = {
        venueId: venue.id,
        venueName: venue.name,
        totalShifts: 0,
        totalAssignments: 0,
        uniqueStaff: new Set(),
        leadShifts: 0,
        shiftsRequiringLeads: 0,
        overridesCount: 0,
      };
    });

    // Process shifts
    shifts.forEach((shift) => {
      const venueId = shift.venue.id;

      if (!venueStats[venueId]) return;

      venueStats[venueId].totalShifts += 1;
      venueStats[venueId].totalAssignments += shift.assignments.length;

      if (shift.leadsRequired > 0) {
        venueStats[venueId].shiftsRequiringLeads += 1;

        const hasLead = shift.assignments.some((a) => a.isLead);
        if (hasLead) {
          venueStats[venueId].leadShifts += 1;
        }
      }

      shift.assignments.forEach((assignment) => {
        venueStats[venueId].uniqueStaff.add(assignment.userId);
      });
    });

    // Process overrides
    overrides.forEach((override) => {
      const venueId = override.shift.venueId;
      if (venueStats[venueId]) {
        venueStats[venueId].overridesCount += 1;
      }
    });

    // Convert to array and calculate percentages
    const report = Object.values(venueStats).map((stats) => ({
      venueId: stats.venueId,
      venueName: stats.venueName,
      totalShifts: stats.totalShifts,
      totalAssignments: stats.totalAssignments,
      uniqueStaff: stats.uniqueStaff.size,
      averageShiftsPerStaff:
        stats.uniqueStaff.size > 0
          ? (stats.totalAssignments / stats.uniqueStaff.size).toFixed(2)
          : '0',
      leadCoveragePercent:
        stats.shiftsRequiringLeads > 0
          ? ((stats.leadShifts / stats.shiftsRequiringLeads) * 100).toFixed(1)
          : '100',
      overridesCount: stats.overridesCount,
    }));

    // Sort by total shifts (descending)
    report.sort((a, b) => b.totalShifts - a.totalShifts);

    return NextResponse.json({
      startDate,
      endDate,
      venueCount: report.length,
      totalShifts: shifts.length,
      data: report,
    });
  } catch (error) {
    console.error('Error generating venue summary report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
