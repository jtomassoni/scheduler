import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const unlockSchema = z.object({
  userId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  reason: z.string().optional(),
});

/**
 * POST /api/availability/unlock
 * Manager unlocks a user's availability for a specific month, even after deadline
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can unlock availability
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = unlockSchema.parse(body);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or update unlock record
    const unlock = await prisma.availabilityUnlock.upsert({
      where: {
        userId_month: {
          userId: validatedData.userId,
          month: validatedData.month,
        },
      },
      update: {
        unlockedBy: session.user.id,
        unlockedAt: new Date(),
        reason: validatedData.reason,
      },
      create: {
        userId: validatedData.userId,
        month: validatedData.month,
        unlockedBy: session.user.id,
        unlockedAt: new Date(),
        reason: validatedData.reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(unlock);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error unlocking availability:', error);
    return NextResponse.json(
      { error: 'Failed to unlock availability' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/availability/unlock?userId=xxx&month=YYYY-MM
 * Manager re-locks a user's availability
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can lock availability
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');

    if (!userId || !month) {
      return NextResponse.json(
        { error: 'userId and month are required' },
        { status: 400 }
      );
    }

    // Delete the unlock record
    await prisma.availabilityUnlock.delete({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error locking availability:', error);
    return NextResponse.json(
      { error: 'Failed to lock availability' },
      { status: 500 }
    );
  }
}
