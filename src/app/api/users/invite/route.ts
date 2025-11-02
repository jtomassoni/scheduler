import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['MANAGER', 'BARTENDER', 'BARBACK']),
  venueIds: z.array(z.string()).optional(), // For managers, assign to venues
});

/**
 * POST /api/users/invite
 * Invite a new user (manager or staff) - Super Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can invite users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = inviteSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate temporary password
    const tempPassword =
      Math.random().toString(36).slice(-12) +
      Math.random().toString(36).slice(-12).toUpperCase() +
      '!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
        hashedPassword,
        status: 'ACTIVE', // New users are active by default
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    // If manager, assign to venues
    if (
      validatedData.role === 'MANAGER' &&
      validatedData.venueIds &&
      validatedData.venueIds.length > 0
    ) {
      await Promise.all(
        validatedData.venueIds.map((venueId) =>
          prisma.venue.update({
            where: { id: venueId },
            data: {
              managers: {
                connect: {
                  id: newUser.id,
                },
              },
            },
          })
        )
      );
    }

    // TODO: Send email with invite link and temporary password
    // For now, log it (in production, use email service)
    console.log(`[INVITE] User ${newUser.email} invited as ${newUser.role}`);
    console.log(`[INVITE] Temporary password: ${tempPassword}`);
    console.log(
      `[INVITE] Onboarding URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding?token=${newUser.id}`
    );

    return NextResponse.json({
      success: true,
      user: newUser,
      tempPassword, // In production, don't return this - send via email
      onboardingUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding?token=${newUser.id}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}
