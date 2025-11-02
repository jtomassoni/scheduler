import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tips/history?startDate=xxx&endDate=xxx&userId=xxx
 * Get tip history for a user or all users
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Staff can only view their own tips, managers can view all
    const isManagerRole = isManager(session.user.role);
    const targetUserId = isManagerRole ? userId : session.user.id;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: {
      shift: {
        date: { gte: Date; lte: Date };
        tipsPublished?: boolean;
      };
      userId?: string;
      tipAmount?: { not: null };
    } = {
      shift: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        // Staff can only see published tips, managers can see all
        ...(isManagerRole ? {} : { tipsPublished: true }),
      },
      tipAmount: {
        not: null,
      },
    };

    if (targetUserId) {
      where.userId = targetUserId;
    }

    // Get all tip entries
    const tips = await prisma.shiftAssignment.findMany({
      where,
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        shift: {
          date: 'desc',
        },
      },
    });

    // Calculate summary for target user
    const userTips = tips.filter((tip) => tip.userId === targetUserId);
    const totalTips = userTips.reduce((sum, tip) => {
      return sum + (tip.tipAmount ? Number(tip.tipAmount) : 0);
    }, 0);

    const averageTip =
      userTips.length > 0 ? (totalTips / userTips.length).toFixed(2) : '0.00';

    // Calculate average stats across all users in the period (for comparison)
    const allUserShifts = await prisma.shiftAssignment.groupBy({
      by: ['userId'],
      where: {
        shift: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
      _count: {
        id: true,
      },
    });

    const averageShiftsAcrossAllUsers =
      allUserShifts.length > 0
        ? (
            allUserShifts.reduce((sum, stat) => sum + stat._count.id, 0) /
            allUserShifts.length
          ).toFixed(1)
        : '0.0';

    // Get total shifts for target user (not just with tips)
    const userTotalShifts = await prisma.shiftAssignment.count({
      where: {
        userId: targetUserId,
        shift: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
    });

    return NextResponse.json({
      startDate,
      endDate,
      userId: targetUserId,
      totalShifts: userTotalShifts,
      totalShiftsWithTips: userTips.length,
      totalTips: totalTips.toFixed(2),
      averageTip,
      averageShiftsAcrossAllUsers,
      tips: userTips.map((tip) => ({
        id: tip.id,
        shiftId: tip.shiftId,
        date: tip.shift.date,
        venue: tip.shift.venue.name,
        amount: tip.tipAmount ? Number(tip.tipAmount).toFixed(2) : '0.00',
        enteredAt: tip.tipEnteredAt,
        updatedAt: tip.tipUpdatedAt,
        user: tip.user,
      })),
    });
  } catch (error) {
    console.error('Error fetching tip history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tip history' },
      { status: 500 }
    );
  }
}
