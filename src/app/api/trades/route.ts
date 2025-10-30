import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tradeCreateSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/trades?userId=xxx&status=xxx
 * Get shift trades filtered by query params
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    // Build query filter
    const where: {
      OR?: Array<{ proposerId: string } | { receiverId: string }>;
      status?: string;
    } = {};

    // Non-managers can only see their own trades
    if (!isManager(session.user.role)) {
      where.OR = [
        { proposerId: session.user.id },
        { receiverId: session.user.id },
      ];
    } else if (userId) {
      where.OR = [{ proposerId: userId }, { receiverId: userId }];
    }

    if (status) {
      where.status = status;
    }

    const trades = await prisma.shiftTrade.findMany({
      where,
      include: {
        shift: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
              },
            },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
        proposer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trades
 * Propose a shift trade
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = tradeCreateSchema.parse(body);

    // Verify shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: validatedData.shiftId },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                isLead: true,
                availabilities: {
                  where: {
                    month: new Date().toISOString().slice(0, 7),
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify proposer is assigned to this shift
    const proposerAssignment = shift.assignments.find(
      (a) => a.userId === session.user.id
    );

    if (!proposerAssignment) {
      return NextResponse.json(
        { error: 'You are not assigned to this shift' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: validatedData.receiverId },
      select: {
        id: true,
        role: true,
        isLead: true,
        availabilities: {
          where: {
            month: shift.date.toISOString().slice(0, 7),
          },
        },
      },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    // Validation checks
    const errors: string[] = [];

    // Check role compatibility
    if (
      proposerAssignment.role === 'BARTENDER' &&
      receiver.role !== 'BARTENDER'
    ) {
      errors.push('Trade must be between staff with same role (bartender)');
    }
    if (proposerAssignment.role === 'BARBACK' && receiver.role !== 'BARBACK') {
      errors.push('Trade must be between staff with same role (barback)');
    }

    // Check lead requirement
    if (proposerAssignment.isLead && !receiver.isLead) {
      errors.push('This shift requires a lead. Receiver must be lead-capable');
    }

    // Check receiver availability
    const receiverAvailability = receiver.availabilities[0];
    if (receiverAvailability && receiverAvailability.data) {
      const dateStr = shift.date.toISOString().split('T')[0];
      const dayAvailability = (
        receiverAvailability.data as Record<string, { available: boolean }>
      )[dateStr];
      if (dayAvailability && !dayAvailability.available) {
        errors.push('Receiver marked themselves unavailable for this date');
      }
    }

    // Check for double-booking
    const dateStart = new Date(shift.date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(shift.date);
    dateEnd.setHours(23, 59, 59, 999);

    const receiverExistingShifts = await prisma.shiftAssignment.findMany({
      where: {
        userId: validatedData.receiverId,
        shift: {
          date: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
      },
      include: {
        shift: {
          select: {
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (receiverExistingShifts.length > 0) {
      const conflictingVenue = receiverExistingShifts[0].shift.venue.name;
      errors.push(
        `Receiver is already scheduled at ${conflictingVenue} on this date`
      );
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Trade validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    // Create the trade
    const trade = await prisma.shiftTrade.create({
      data: {
        shiftId: validatedData.shiftId,
        proposerId: session.user.id,
        receiverId: validatedData.receiverId,
        status: 'PROPOSED',
        reason: validatedData.reason || null,
      },
      include: {
        shift: {
          include: {
            venue: true,
          },
        },
        proposer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating trade:', error);
    return NextResponse.json(
      { error: 'Failed to create trade' },
      { status: 500 }
    );
  }
}
