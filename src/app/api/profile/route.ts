import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema } from '@/lib/validations';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /api/profile
 * Get the current user's profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        hasDayJob: true,
        dayJobCutoff: true,
        isLead: true,
        preferredVenuesOrder: true,
        defaultAvailability: true,
        autoSubmitAvailability: true,
        notificationPrefs: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update the current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = profileUpdateSchema.parse(body);

    // If hasDayJob is false, clear dayJobCutoff
    if (validatedData.hasDayJob === false) {
      validatedData.dayJobCutoff = null;
    }

    // Prepare update data with proper Prisma types
    const updateData: Prisma.UserUpdateInput = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.hasDayJob !== undefined && {
        hasDayJob: validatedData.hasDayJob,
      }),
      ...(validatedData.dayJobCutoff !== undefined && {
        dayJobCutoff: validatedData.dayJobCutoff,
      }),
      ...(validatedData.preferredVenuesOrder && {
        preferredVenuesOrder: validatedData.preferredVenuesOrder,
      }),
      ...(validatedData.defaultAvailability !== undefined && {
        defaultAvailability:
          validatedData.defaultAvailability === null
            ? Prisma.JsonNull
            : (validatedData.defaultAvailability as Prisma.InputJsonValue),
      }),
      ...(validatedData.autoSubmitAvailability !== undefined && {
        autoSubmitAvailability: validatedData.autoSubmitAvailability,
      }),
      ...(validatedData.notificationPrefs !== undefined && {
        notificationPrefs:
          validatedData.notificationPrefs === null
            ? Prisma.JsonNull
            : (validatedData.notificationPrefs as Prisma.InputJsonValue),
      }),
    };

    // Update the user profile
    const updatedProfile = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        hasDayJob: true,
        dayJobCutoff: true,
        isLead: true,
        preferredVenuesOrder: true,
        defaultAvailability: true,
        autoSubmitAvailability: true,
        notificationPrefs: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
