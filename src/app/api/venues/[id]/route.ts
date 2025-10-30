import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { venueUpdateSchema } from '@/lib/validations';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/venues/[id]
 * Get a specific venue by ID
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

    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
      include: {
        managers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json(venue);
  } catch (error) {
    console.error('Error fetching venue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/venues/[id]
 * Update a venue (Super Admin only)
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

    // Only Super Admin can update venues
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = venueUpdateSchema.parse({ ...body, id: params.id });

    // Prepare update data
    const updateData: Prisma.VenueUpdateInput = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.isNetworked !== undefined && {
        isNetworked: validatedData.isNetworked,
      }),
      ...(validatedData.priority !== undefined && {
        priority: validatedData.priority,
      }),
      ...(validatedData.availabilityDeadlineDay !== undefined && {
        availabilityDeadlineDay: validatedData.availabilityDeadlineDay,
      }),
      ...(validatedData.tipPoolEnabled !== undefined && {
        tipPoolEnabled: validatedData.tipPoolEnabled,
      }),
    };

    // Handle manager assignments if provided
    if (validatedData.managerIds) {
      updateData.managers = {
        set: validatedData.managerIds.map((id) => ({ id })),
      };
    }

    const updatedVenue = await prisma.venue.update({
      where: { id: params.id },
      data: updateData,
      include: {
        managers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedVenue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating venue:', error);
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venues/[id]
 * Delete a venue (Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can delete venues
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if venue has active shifts
    const activeShiftCount = await prisma.shift.count({
      where: {
        venueId: params.id,
        date: {
          gte: new Date(),
        },
      },
    });

    if (activeShiftCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete venue with active shifts',
          details: `This venue has ${activeShiftCount} active or upcoming shifts`,
        },
        { status: 400 }
      );
    }

    await prisma.venue.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting venue:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    );
  }
}
