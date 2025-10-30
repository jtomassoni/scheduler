import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { overrideCreateSchema } from '@/lib/validations';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/overrides?shiftId=xxx&userId=xxx&status=xxx
 * Get overrides filtered by query params
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    // Build query filter
    const where: {
      shiftId?: string;
      userId?: string;
      status?: string;
    } = {};

    if (shiftId) {
      where.shiftId = shiftId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    // Non-managers can only see their own overrides
    if (!isManager(session.user.role)) {
      where.userId = session.user.id;
    }

    const overrides = await prisma.override.findMany({
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
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(overrides);
  } catch (error) {
    console.error('Error fetching overrides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overrides' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/overrides
 * Create a new override request (Manager or Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can create overrides
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = overrideCreateSchema.parse(body);

    // Verify shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: validatedData.shiftId },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create initial history entry
    const initialHistory = [
      {
        action: 'created',
        userId: session.user.id,
        userName: session.user.name,
        timestamp: new Date().toISOString(),
        note: 'Override request created by manager',
      },
    ];

    // Create the override
    const override = await prisma.override.create({
      data: {
        shiftId: validatedData.shiftId,
        userId: validatedData.userId,
        reason: validatedData.reason,
        violationType: validatedData.violationType,
        status: 'PENDING',
        history: initialHistory as Prisma.InputJsonValue[],
      },
      include: {
        shift: {
          include: {
            venue: true,
          },
        },
        approvals: true,
      },
    });

    // Create initial approval from manager
    await prisma.overrideApproval.create({
      data: {
        overrideId: override.id,
        approverId: session.user.id,
        approved: true,
        comment: 'Manager initiated override',
      },
    });

    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating override:', error);
    return NextResponse.json(
      { error: 'Failed to create override' },
      { status: 500 }
    );
  }
}
