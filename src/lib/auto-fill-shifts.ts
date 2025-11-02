import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

interface AutoFillOptions {
  shiftId: string;
  venueId: string;
  date: Date;
  startTime: string;
  endTime: string;
  bartendersRequired: number;
  barbacksRequired: number;
  leadsRequired: number;
}

interface AvailabilityData {
  [dateKey: string]: {
    available: boolean;
    note?: string;
  };
}

/**
 * Auto-fill shift assignments based on submitted availability
 * Matches staff who have marked themselves as available for the shift date
 */
export async function autoFillShift(options: AutoFillOptions) {
  const {
    shiftId,
    venueId,
    date,
    bartendersRequired,
    barbacksRequired,
    leadsRequired,
  } = options;

  // Get the month string for availability lookup (YYYY-MM format)
  const shiftMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const shiftDateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Get all staff who work at this venue (or networked venues)
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      managers: {
        select: { id: true },
      },
    },
  });

  if (!venue) {
    return { assigned: 0, errors: ['Venue not found'] };
  }

  // Get all active staff members who work at this venue
  // Only include staff who have this venue in their preferredVenuesOrder
  const potentialStaff = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: {
        in: ['BARTENDER', 'BARBACK'],
      },
      preferredVenuesOrder: {
        has: venueId, // Only staff who work at this venue
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isLead: true,
      preferredVenuesOrder: true,
      venueRankings: true,
    },
  });

  // Get availability for this month for all potential staff
  const availabilities = await prisma.availability.findMany({
    where: {
      userId: {
        in: potentialStaff.map((u) => u.id),
      },
      month: shiftMonth,
      submittedAt: {
        not: null, // Only consider submitted availability
      },
    },
    select: {
      userId: true,
      data: true,
    },
  });

  // Create a map of user ID to availability data
  const availabilityMap = new Map<string, AvailabilityData>();
  availabilities.forEach((avail) => {
    const data = avail.data as AvailabilityData;
    availabilityMap.set(avail.userId, data);
  });

  // Check for existing assignments to avoid duplicates
  const existingAssignments = await prisma.shiftAssignment.findMany({
    where: { shiftId },
    select: { userId: true, role: true, isLead: true },
  });

  const assignedUserIds = new Set(existingAssignments.map((a) => a.userId));

  // Filter staff who:
  // 1. Are available on this date
  // 2. Have the correct role
  // 3. Are not already assigned
  // 4. Are leads if we need leads
  const availableStaff = potentialStaff
    .filter((staff) => {
      // Skip if already assigned
      if (assignedUserIds.has(staff.id)) {
        return false;
      }

      // Check availability
      const userAvailability = availabilityMap.get(staff.id);
      if (!userAvailability) {
        return false; // No availability data submitted
      }

      const dayAvailability = userAvailability[shiftDateStr];
      if (!dayAvailability || !dayAvailability.available) {
        return false; // Not available on this date
      }

      return true;
    })
    .sort((a, b) => {
      // First priority: Prefer leads if needed
      if (leadsRequired > 0) {
        if (a.isLead && !b.isLead) return -1;
        if (!a.isLead && b.isLead) return 1;
      }

      // Second priority: Management-set rankings (lower number = higher priority)
      const aRankings =
        (a.venueRankings as Record<string, number> | null) || {};
      const bRankings =
        (b.venueRankings as Record<string, number> | null) || {};
      const aRanking = aRankings[venueId];
      const bRanking = bRankings[venueId];

      // If both have rankings, sort by ranking (lower = higher priority)
      if (aRanking !== undefined && bRanking !== undefined) {
        if (aRanking !== bRanking) {
          return aRanking - bRanking;
        }
      } else if (aRanking !== undefined && bRanking === undefined) {
        // User with ranking gets priority over user without ranking
        return -1;
      } else if (aRanking === undefined && bRanking !== undefined) {
        // User without ranking goes after user with ranking
        return 1;
      }

      // Third priority: Prefer staff with this venue in preferred venues (higher priority = lower index)
      const aVenueIndex = a.preferredVenuesOrder?.indexOf(venueId) ?? -1;
      const bVenueIndex = b.preferredVenuesOrder?.indexOf(venueId) ?? -1;

      if (aVenueIndex !== -1 && bVenueIndex === -1) return -1;
      if (aVenueIndex === -1 && bVenueIndex !== -1) return 1;
      if (aVenueIndex !== -1 && bVenueIndex !== -1) {
        return aVenueIndex - bVenueIndex;
      }

      return 0;
    });

  // Assign leads first
  let leadsAssigned = existingAssignments.filter((a) => a.isLead).length;
  const leadCandidates = availableStaff.filter(
    (s) => s.isLead && s.role === 'BARTENDER'
  );

  const assignmentsToCreate: Array<{
    shiftId: string;
    userId: string;
    role: Role;
    isLead: boolean;
  }> = [];

  // Assign leads
  for (const candidate of leadCandidates) {
    if (leadsAssigned >= leadsRequired) break;
    if (candidate.role !== 'BARTENDER') continue;

    assignmentsToCreate.push({
      shiftId,
      userId: candidate.id,
      role: 'BARTENDER',
      isLead: true,
    });
    leadsAssigned++;
    assignedUserIds.add(candidate.id);
  }

  // Assign remaining bartenders
  let bartendersAssigned =
    existingAssignments.filter((a) => a.role === 'BARTENDER' && !a.isLead)
      .length + leadsAssigned;

  const bartenderCandidates = availableStaff.filter(
    (s) => s.role === 'BARTENDER' && !assignedUserIds.has(s.id)
  );

  for (const candidate of bartenderCandidates) {
    if (bartendersAssigned >= bartendersRequired) break;

    assignmentsToCreate.push({
      shiftId,
      userId: candidate.id,
      role: 'BARTENDER',
      isLead: false,
    });
    bartendersAssigned++;
    assignedUserIds.add(candidate.id);
  }

  // Assign barbacks
  let barbacksAssigned = existingAssignments.filter(
    (a) => a.role === 'BARBACK'
  ).length;
  const barbackCandidates = availableStaff.filter(
    (s) => s.role === 'BARBACK' && !assignedUserIds.has(s.id)
  );

  for (const candidate of barbackCandidates) {
    if (barbacksAssigned >= barbacksRequired) break;

    assignmentsToCreate.push({
      shiftId,
      userId: candidate.id,
      role: 'BARBACK',
      isLead: false,
    });
    barbacksAssigned++;
    assignedUserIds.add(candidate.id);
  }

  // Create assignments
  const createdAssignments = [];
  for (const assignment of assignmentsToCreate) {
    try {
      const created = await prisma.shiftAssignment.create({
        data: assignment,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      createdAssignments.push(created);
    } catch (error) {
      // Skip if already exists (race condition) or other constraint error
      console.error(
        `Failed to assign ${assignment.userId} to shift ${shiftId}:`,
        error
      );
    }
  }

  return {
    assigned: createdAssignments.length,
    assignments: createdAssignments,
    summary: {
      leadsAssigned: assignmentsToCreate.filter((a) => a.isLead).length,
      bartendersAssigned: assignmentsToCreate.filter(
        (a) => a.role === 'BARTENDER' && !a.isLead
      ).length,
      barbacksAssigned: assignmentsToCreate.filter((a) => a.role === 'BARBACK')
        .length,
    },
  };
}
