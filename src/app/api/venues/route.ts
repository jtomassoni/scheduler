import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { venueCreateSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/venues
 * Get all venues (filtered by role if needed)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all venues
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        isNetworked: true,
        priority: true,
        availabilityDeadlineDay: true,
        tipPoolEnabled: true,
        tradeDeadlineHours: true,
        createdAt: true,
        managers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Add status field (default to ACTIVE if column doesn't exist)
    // This will be properly typed once migration is applied
    const venuesWithStatus = venues.map((venue: any) => ({
      ...venue,
      status: venue.status || 'ACTIVE',
    }));

    return NextResponse.json(venuesWithStatus);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venues
 * Create a new venue (Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can create venues
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = venueCreateSchema.parse(body);

    // Handle fallback admin - find or create a real superadmin user ID
    let creatorId = session.user.id;
    if (
      creatorId === 'system-admin-fallback-id' ||
      creatorId.startsWith('system-admin-fallback-')
    ) {
      // Find an existing SUPER_ADMIN user to use as creator
      const superAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      if (!superAdmin) {
        // No superadmin exists - create one from the fallback admin session
        // Extract username from session email (format: username@system.admin)
        const fallbackUsername =
          session.user.email.replace('@system.admin', '') || 'admin';
        const fallbackEmail = `${fallbackUsername}@jschedules.com`;

        // Check if this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: fallbackEmail },
        });

        if (existingUser) {
          // User exists but might not be superadmin - use it
          creatorId = existingUser.id;
        } else {
          // Create new superadmin user
          const newSuperAdmin = await prisma.user.create({
            data: {
              email: fallbackEmail,
              name: session.user.name || fallbackUsername,
              role: 'SUPER_ADMIN',
              status: 'ACTIVE',
              hasDayJob: false,
              isLead: false,
              preferredVenuesOrder: [],
              // Password will need to be set separately via profile/password reset
            },
          });
          creatorId = newSuperAdmin.id;
        }
      } else {
        creatorId = superAdmin.id;
      }
    }

    // Create venue
    const venueData: any = {
      name: validatedData.name,
      isNetworked: validatedData.isNetworked,
      priority: validatedData.priority,
      availabilityDeadlineDay: validatedData.availabilityDeadlineDay,
      tipPoolEnabled: validatedData.tipPoolEnabled,
      tradeDeadlineHours: validatedData.tradeDeadlineHours || 24,
      createdById: creatorId,
    };

    // Add status if migration has been applied
    if (validatedData.status) {
      venueData.status = validatedData.status;
    }

    const venue = await prisma.venue.create({
      data: {
        ...venueData,
        ...(validatedData.managerIds &&
          validatedData.managerIds.length > 0 && {
            managers: {
              connect: validatedData.managerIds.map((id) => ({ id })),
            },
          }),
      },
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

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
}
