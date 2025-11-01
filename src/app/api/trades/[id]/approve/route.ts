import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tradeApprovalSchema } from '@/lib/validations';
import { z } from 'zod';
import { NotificationService } from '@/lib/notification-service';

/**
 * POST /api/trades/[id]/approve
 * Manager approves or declines a trade
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

    // Only managers can approve trades
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = tradeApprovalSchema.parse({
      ...body,
      id: params.id,
    });

    // Get trade
    const trade = await prisma.shiftTrade.findUnique({
      where: { id: params.id },
      include: {
        shift: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // Check if trade is in ACCEPTED status (ready for manager approval)
    if (trade.status !== 'ACCEPTED') {
      return NextResponse.json(
        {
          error: 'Trade must be accepted by receiver before manager approval',
        },
        { status: 400 }
      );
    }

    if (validatedData.approved) {
      // Approve the trade and swap assignments
      // 1. Find the proposer's assignment
      const proposerAssignment = trade.shift.assignments.find(
        (a) => a.userId === trade.proposerId
      );

      if (!proposerAssignment) {
        return NextResponse.json(
          { error: 'Proposer assignment not found' },
          { status: 404 }
        );
      }

      // 2. Update the assignment to the receiver
      await prisma.shiftAssignment.update({
        where: { id: proposerAssignment.id },
        data: {
          userId: trade.receiverId,
        },
      });

      // 3. Update trade status to APPROVED
      const updatedTrade = await prisma.shiftTrade.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
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

      // Notify both users of approval
      try {
        await NotificationService.createBulk(
          [updatedTrade.proposerId, updatedTrade.receiverId],
          {
            type: 'TRADE_UPDATED',
            title: 'Shift Trade Approved',
            message: `Your shift trade for ${updatedTrade.shift.venue.name} on ${new Date(updatedTrade.shift.date).toLocaleDateString()} has been approved by management.`,
            data: {
              tradeId: updatedTrade.id,
              shiftId: updatedTrade.shift.id,
              status: 'APPROVED',
            },
          }
        );
      } catch (notifError) {
        console.error(
          'Failed to send trade approval notifications:',
          notifError
        );
      }

      return NextResponse.json(updatedTrade);
    } else {
      // Decline the trade
      const updatedTrade = await prisma.shiftTrade.update({
        where: { id: params.id },
        data: {
          status: 'DECLINED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
          declinedReason: validatedData.declinedReason || null,
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

      // Notify both users of decline
      try {
        const declineReason = validatedData.declinedReason
          ? ` Reason: ${validatedData.declinedReason}`
          : '';
        await NotificationService.createBulk(
          [updatedTrade.proposerId, updatedTrade.receiverId],
          {
            type: 'TRADE_UPDATED',
            title: 'Shift Trade Declined',
            message: `Your shift trade for ${updatedTrade.shift.venue.name} on ${new Date(updatedTrade.shift.date).toLocaleDateString()} has been declined by management.${declineReason}`,
            data: {
              tradeId: updatedTrade.id,
              shiftId: updatedTrade.shift.id,
              status: 'DECLINED',
              declinedReason: validatedData.declinedReason,
            },
          }
        );
      } catch (notifError) {
        console.error(
          'Failed to send trade decline notifications:',
          notifError
        );
      }

      return NextResponse.json(updatedTrade);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing trade approval:', error);
    return NextResponse.json(
      { error: 'Failed to process trade approval' },
      { status: 500 }
    );
  }
}
