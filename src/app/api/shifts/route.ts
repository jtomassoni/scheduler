import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { shiftCreateSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/shifts?venueId=xxx&startDate=xxx&endDate=xxx
 * Get shifts filtered by query params
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Build query filter
    const where: {
      venueId?: string;
      date?: { gte?: Date; lte?: Date };
      assignments?: { some: { userId: string } };
    } = {};

    if (venueId) {
      where.venueId = venueId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Filter by user if provided (for "my shifts" view)
    if (userId) {
      where.assignments = { some: { userId } };
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            isNetworked: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isLead: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shifts
 * Create a new shift (Manager or Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can create shifts
    if (!isManager(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = shiftCreateSchema.parse(body);

    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: validatedData.venueId },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        venueId: validatedData.venueId,
        date: validatedData.date,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        bartendersRequired: validatedData.bartendersRequired,
        barbacksRequired: validatedData.barbacksRequired,
        leadsRequired: validatedData.leadsRequired,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: true,
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: 'Failed to create shift' },
      { status: 500 }
    );
  }
}
