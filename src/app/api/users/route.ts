import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, UserStatus } from '@prisma/client';

// Force dynamic rendering - this route uses headers() for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * Get users (filtered by query params)
 * Accessible by managers and super admins
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and super admins can view users
    if (!isManager(session.user.role) && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    const statusParam = searchParams.get('status');

    // Build query filter
    const where: {
      role?: Role | { not?: Role };
      status?: UserStatus | { not?: UserStatus };
      preferredVenuesOrder?: {
        hasSome?: string[];
      };
    } = {
      // Only filter by status if explicitly requested, otherwise return all statuses
      // (frontend will handle filtering if needed)
    };

    // If status filter is provided, apply it
    if (
      statusParam &&
      Object.values(UserStatus).includes(statusParam as UserStatus)
    ) {
      where.status = statusParam as UserStatus;
    }

    // Never show super admins in staff management, but allow filtering by other roles
    if (roleParam && Object.values(Role).includes(roleParam as Role)) {
      if (roleParam === 'SUPER_ADMIN') {
        // If explicitly requesting SUPER_ADMIN, return empty (super admins shouldn't appear)
        return NextResponse.json([]);
      }
      where.role = roleParam as Role;
    } else {
      where.role = { not: 'SUPER_ADMIN' }; // Exclude super admins when no specific role filter
    }

    // For managers (not super admins), filter by venues they manage
    if (session.user.role !== 'SUPER_ADMIN' && isManager(session.user.role)) {
      // Get venues this manager manages
      const managedVenues = await prisma.venue.findMany({
        where: {
          managers: {
            some: {
              id: session.user.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      const managedVenueIds = managedVenues.map((v) => v.id);

      // Filter users who have any of the managed venues in their preferredVenuesOrder
      // or have been assigned to shifts at these venues
      if (managedVenueIds.length > 0) {
        // Get users assigned to shifts at managed venues (excluding super admins)
        const assignedUserIds = await prisma.shiftAssignment.findMany({
          where: {
            shift: {
              venueId: {
                in: managedVenueIds,
              },
            },
            user: {
              role: { not: 'SUPER_ADMIN' }, // Never show super admins
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        });

        const assignedUserIdsList = assignedUserIds.map((a) => a.userId);

        // Also get users with preferredVenuesOrder containing managed venues
        const preferredVenuesWhere: any = {
          role: { not: 'SUPER_ADMIN' }, // Never show super admins
          preferredVenuesOrder: {
            hasSome: managedVenueIds,
          },
        };

        // If status filter is provided, apply it
        if (
          statusParam &&
          Object.values(UserStatus).includes(statusParam as UserStatus)
        ) {
          preferredVenuesWhere.status = statusParam as UserStatus;
        }

        const usersWithPreferredVenues = await prisma.user.findMany({
          where: preferredVenuesWhere,
          select: {
            id: true,
          },
        });

        const preferredVenueUserIds = usersWithPreferredVenues.map((u) => u.id);

        // Combine both sets of user IDs
        const allStaffUserIds = [
          ...new Set([...assignedUserIdsList, ...preferredVenueUserIds]),
        ];

        if (allStaffUserIds.length > 0) {
          // Override the where clause to include these user IDs
          const userIdsWhere: any = {
            id: {
              in: allStaffUserIds,
            },
            role: { not: 'SUPER_ADMIN' }, // Never show super admins
          };

          // If status filter is provided, apply it
          if (
            statusParam &&
            Object.values(UserStatus).includes(statusParam as UserStatus)
          ) {
            userIdsWhere.status = statusParam as UserStatus;
          }

          if (roleParam && Object.values(Role).includes(roleParam as Role)) {
            userIdsWhere.role = roleParam as Role;
          }

          const users = await prisma.user.findMany({
            where: userIdsWhere,
            select: {
              id: true,
              email: true,
              name: true,
              notificationPrefs: true,
              role: true,
              status: true,
              hasDayJob: true,
              dayJobCutoff: true,
              isLead: true,
              preferredVenuesOrder: true,
            },
            orderBy: {
              name: 'asc',
            },
          });

          // Extract phoneNumber from notificationPrefs
          const usersWithPhone = users.map((user) => ({
            ...user,
            phoneNumber: (user.notificationPrefs as any)?.phoneNumber || null,
            notificationPrefs: undefined,
          }));

          return NextResponse.json(usersWithPhone);
        } else {
          // No staff found for managed venues
          return NextResponse.json([]);
        }
      } else {
        // Manager has no venues, return empty array
        return NextResponse.json([]);
      }
    }

    // Super admins see all users (except other super admins for staff management)
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        notificationPrefs: true,
        role: true,
        status: true,
        hasDayJob: true,
        dayJobCutoff: true,
        isLead: true,
        preferredVenuesOrder: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Extract phoneNumber from notificationPrefs
    const usersWithPhone = users.map((user) => ({
      ...user,
      phoneNumber: (user.notificationPrefs as any)?.phoneNumber || null,
      notificationPrefs: undefined,
    }));

    return NextResponse.json(usersWithPhone);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
