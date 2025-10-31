import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for external block
const externalBlockSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  source: z.enum(['import', 'manual']),
  description: z.string().optional(),
});

/**
 * GET /api/external-blocks?startDate=xxx&endDate=xxx
 * Get external blocks for the current user
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

    // Build query filter
    const where: {
      userId: string;
      startTime?: { gte?: Date; lte?: Date };
    } = {
      userId: session.user.id,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    const blocks = await prisma.externalBlock.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Error fetching external blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external blocks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external-blocks
 * Create a single external block manually
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = externalBlockSchema.parse(body);

    // Validate that end time is after start time
    if (validatedData.endTime <= validatedData.startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Create the block
    const block = await prisma.externalBlock.create({
      data: {
        userId: session.user.id,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        source: validatedData.source,
        description: validatedData.description || null,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating external block:', error);
    return NextResponse.json(
      { error: 'Failed to create external block' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/external-blocks?id=xxx
 * Delete an external block
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Block ID is required' },
        { status: 400 }
      );
    }

    // Verify block belongs to user
    const block = await prisma.externalBlock.findUnique({
      where: { id },
    });

    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (block.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.externalBlock.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting external block:', error);
    return NextResponse.json(
      { error: 'Failed to delete external block' },
      { status: 500 }
    );
  }
}
