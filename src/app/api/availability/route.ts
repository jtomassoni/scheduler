import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { availabilitySchema } from '@/lib/validations';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/availability?month=2025-11&userId=xxx
 * Get availability for a user and month
 * If userId not provided, returns current user's availability
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const userId = searchParams.get('userId') || session.user.id;

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required (format: YYYY-MM)' },
        { status: 400 }
      );
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    // Check if requesting another user's availability
    // Only managers can view other users' availability
    if (
      userId !== session.user.id &&
      session.user.role !== 'MANAGER' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const availability = await prisma.availability.findUnique({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
    });

    // Check if manager has unlocked this availability
    const unlock = await prisma.availabilityUnlock.findUnique({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!availability) {
      // Return empty availability if not found
      return NextResponse.json({
        userId,
        month,
        data: {},
        submittedAt: null,
        lockedAt: null,
        isLocked: false,
        unlock: unlock || null,
      });
    }

    // If unlocked, override isLocked to false
    const effectivelyLocked = availability.isLocked && !unlock;

    return NextResponse.json({
      ...availability,
      isLocked: effectivelyLocked,
      unlock: unlock || null,
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/availability
 * Create or update availability for a month
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = availabilitySchema.parse(body);

    // Check if availability exists
    const existing = await prisma.availability.findUnique({
      where: {
        userId_month: {
          userId: session.user.id,
          month: validatedData.month,
        },
      },
    });

    // Check if locked
    if (existing?.isLocked) {
      return NextResponse.json(
        {
          error: 'Availability is locked',
          details:
            'This availability period has been locked and cannot be modified',
        },
        { status: 400 }
      );
    }

    // Create or update availability
    const availability = await prisma.availability.upsert({
      where: {
        userId_month: {
          userId: session.user.id,
          month: validatedData.month,
        },
      },
      create: {
        userId: session.user.id,
        month: validatedData.month,
        data: validatedData.data as Prisma.InputJsonValue,
        submittedAt: null,
        isLocked: false,
      },
      update: {
        data: validatedData.data as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(availability);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving availability:', error);
    return NextResponse.json(
      { error: 'Failed to save availability' },
      { status: 500 }
    );
  }
}
