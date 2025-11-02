import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - this route uses headers() for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/override-summary?startDate=xxx&endDate=xxx
 * Override summary report - shows override usage patterns
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

    // Get all overrides in date range
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
          include: {
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
        approvals: true,
      },
    });

    // Count by violation type
    const byType: Record<string, number> = {};
    overrides.forEach((override) => {
      byType[override.violationType] =
        (byType[override.violationType] || 0) + 1;
    });

    // Count by status
    const byStatus: Record<string, number> = {};
    overrides.forEach((override) => {
      byStatus[override.status] = (byStatus[override.status] || 0) + 1;
    });

    // Most frequent users (staff being assigned with overrides)
    const userCounts: Record<string, number> = {};
    overrides.forEach((override) => {
      userCounts[override.userId] = (userCounts[override.userId] || 0) + 1;
    });

    // Get user details for top users
    const topUserIds = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    const topUsers = await prisma.user.findMany({
      where: {
        id: {
          in: topUserIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const mostFrequentUsers = topUserIds.map((userId) => {
      const user = topUsers.find((u) => u.id === userId);
      return {
        userId,
        userName: user?.name || 'Unknown',
        count: userCounts[userId],
      };
    });

    // Calculate approval rate
    const approved = overrides.filter(
      (o) => o.status === 'APPROVED' || o.status === 'ACTIVE'
    ).length;
    const declined = overrides.filter((o) => o.status === 'DECLINED').length;
    const approvalRate =
      approved + declined > 0
        ? ((approved / (approved + declined)) * 100).toFixed(1)
        : '0';

    return NextResponse.json({
      startDate,
      endDate,
      totalOverrides: overrides.length,
      byType: Object.entries(byType).map(([type, count]) => ({
        violationType: type,
        count,
      })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({
        status,
        count,
      })),
      mostFrequentUsers,
      approvalRate,
      approved,
      declined,
      pending: overrides.filter((o) => o.status === 'PENDING').length,
    });
  } catch (error) {
    console.error('Error generating override summary report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
