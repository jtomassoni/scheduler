import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().nullable().optional(),
  role: z
    .enum(['BARTENDER', 'BARBACK', 'MANAGER', 'GENERAL_MANAGER'])
    .optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  isLead: z.boolean().optional(),
  hasDayJob: z.boolean().optional(),
  dayJobCutoff: z.string().nullable().optional(),
  preferredVenuesOrder: z.array(z.string()).optional(),
  venueRankings: z
    .record(z.string(), z.number().int().min(1))
    .optional()
    .nullable(), // { "venueId": rankingNumber }
});

/**
 * GET /api/users/[id]
 * Get a specific user's details (Manager or Super Admin only)
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

    // Only managers and super admins can view users
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        notificationPrefs: true,
        role: true,
        status: true,
        isLead: true,
        hasDayJob: true,
        dayJobCutoff: true,
        preferredVenuesOrder: true,
        venueRankings: true, // @ts-ignore - field exists in database after migration
        createdAt: true,
        updatedAt: true,
      },
    } as any);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract phoneNumber from notificationPrefs
    const userWithPhone = {
      ...user,
      phoneNumber: (user.notificationPrefs as any)?.phoneNumber || null,
      notificationPrefs: undefined,
    };

    return NextResponse.json(userWithPhone);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user's information (Manager or Super Admin only)
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

    // Only managers and super admins can update users
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Super admins can update roles, regular managers cannot
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    const body = await request.json();
    const validatedData = userUpdateSchema.parse(body);

    // Regular managers cannot change roles
    if (!isSuperAdmin && validatedData.role !== undefined) {
      return NextResponse.json(
        { error: 'Only super admins can change user roles' },
        { status: 403 }
      );
    }

    // Regular managers cannot change to/from SUPER_ADMIN
    if (
      isSuperAdmin &&
      validatedData.role !== undefined &&
      validatedData.role === ('SUPER_ADMIN' as any)
    ) {
      return NextResponse.json(
        { error: 'Cannot set role to SUPER_ADMIN via API' },
        { status: 400 }
      );
    }

    // Fetch existing user to get current venueRankings and notificationPrefs
    const existingUserFull = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        venueRankings: true, // @ts-ignore - field exists in database after migration
        notificationPrefs: true,
      },
    } as any);

    // Build update data
    const updateData: {
      name?: string;
      email?: string;
      role?: Role;
      status?: UserStatus;
      isLead?: boolean;
      hasDayJob?: boolean;
      dayJobCutoff?: string | null;
      preferredVenuesOrder?: string[];
      venueRankings?: any;
      notificationPrefs?: any;
    } = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email;
    }
    // Handle phoneNumber - it's stored in notificationPrefs, not as a direct field
    if (validatedData.phoneNumber !== undefined) {
      const currentPrefs = (existingUserFull?.notificationPrefs as any) || {};
      updateData.notificationPrefs = {
        ...currentPrefs,
        phoneNumber: validatedData.phoneNumber || null,
      };
    }
    // Handle venueRankings - merge with existing if needed, or set to null to clear
    if (validatedData.venueRankings !== undefined) {
      if (validatedData.venueRankings === null) {
        updateData.venueRankings = null;
      } else {
        // Merge with existing rankings, or set new ones
        const currentRankings =
          ((existingUserFull as any)?.venueRankings as Record<
            string,
            number
          > | null) || {};
        updateData.venueRankings = {
          ...currentRankings,
          ...validatedData.venueRankings,
        };
      }
    }
    if (validatedData.role !== undefined && isSuperAdmin) {
      updateData.role = validatedData.role as Role;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status as UserStatus;
    }
    if (validatedData.isLead !== undefined) {
      updateData.isLead = validatedData.isLead;
    }
    if (validatedData.hasDayJob !== undefined) {
      updateData.hasDayJob = validatedData.hasDayJob;
    }
    if (validatedData.dayJobCutoff !== undefined) {
      updateData.dayJobCutoff = validatedData.dayJobCutoff || null;
    }

    // Clear dayJobCutoff if hasDayJob is false
    if (validatedData.hasDayJob === false) {
      updateData.dayJobCutoff = null;
    }
    if (validatedData.preferredVenuesOrder !== undefined) {
      updateData.preferredVenuesOrder = validatedData.preferredVenuesOrder;
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        notificationPrefs: true,
        role: true,
        status: true,
        isLead: true,
        hasDayJob: true,
        dayJobCutoff: true,
        preferredVenuesOrder: true,
        venueRankings: true, // @ts-ignore - field exists in database after migration
        createdAt: true,
        updatedAt: true,
      },
    } as any);

    // Extract phoneNumber from notificationPrefs
    const userWithPhone = {
      ...updatedUser,
      phoneNumber: (updatedUser.notificationPrefs as any)?.phoneNumber || null,
      notificationPrefs: undefined,
    };

    return NextResponse.json(userWithPhone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user (Manager or Super Admin only)
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

    // Only managers and super admins can delete users
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting super admins (unless you're a super admin)
    if (user.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete super admin accounts' },
        { status: 403 }
      );
    }

    // Delete the user (cascade deletes related records)
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
