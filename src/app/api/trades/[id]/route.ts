import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tradeUpdateSchema } from '@/lib/validations';
import { z } from 'zod';
import { NotificationService } from '@/lib/notification-service';

/**
 * GET /api/trades/[id]
 * Get a specific trade by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trade = await prisma.shiftTrade.findUnique({
      where: { id: params.id },
      include: {
        shift: {
          include: {
            venue: true,
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
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error fetching trade:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trades/[id]
 * Receiver accepts, declines, or proposer cancels a trade
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = tradeUpdateSchema.parse({
      ...body,
      id: params.id,
    });

    // Get trade
    const trade = await prisma.shiftTrade.findUnique({
      where: { id: params.id },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // Check authorization based on status
    if (validatedData.status === 'CANCELLED') {
      // Only proposer can cancel
      if (trade.proposerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the proposer can cancel this trade' },
          { status: 403 }
        );
      }
    } else {
      // Only receiver can accept/decline
      if (trade.receiverId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the receiver can accept or decline this trade' },
          { status: 403 }
        );
      }
    }

    // Update trade
    const updatedTrade = await prisma.shiftTrade.update({
      where: { id: params.id },
      data: {
        status: validatedData.status,
        ...(validatedData.reason && { reason: validatedData.reason }),
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

    // Notify proposer about receiver's response
    try {
      const notifTitle =
        updatedTrade.status === 'ACCEPTED'
          ? 'Shift Trade Accepted'
          : 'Shift Trade Declined';
      const notifMessage =
        updatedTrade.status === 'ACCEPTED'
          ? `${updatedTrade.receiver.name} accepted your trade proposal for ${updatedTrade.shift.venue.name} on ${new Date(updatedTrade.shift.date).toLocaleDateString()}. Awaiting manager approval.`
          : `${updatedTrade.receiver.name} declined your trade proposal for ${updatedTrade.shift.venue.name} on ${new Date(updatedTrade.shift.date).toLocaleDateString()}.`;

      await NotificationService.create({
        userId: updatedTrade.proposer.id,
        type: 'TRADE_UPDATED',
        title: notifTitle,
        message: notifMessage,
        data: {
          tradeId: updatedTrade.id,
          shiftId: updatedTrade.shift.id,
          status: updatedTrade.status,
        },
      });
    } catch (notifError) {
      console.error('Failed to send trade update notification:', notifError);
    }

    return NextResponse.json(updatedTrade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating trade:', error);
    return NextResponse.json(
      { error: 'Failed to update trade' },
      { status: 500 }
    );
  }
}
