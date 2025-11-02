import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  venueId: string;
  date: Date;
  startTime: string;
  endTime: string;
  shifts: Array<{
    id: string;
    createdAt: Date;
    assignmentCount: number;
  }>;
}

async function findDuplicateShifts(): Promise<DuplicateGroup[]> {
  console.log('🔍 Finding duplicate shifts...\n');

  // Get all shifts
  const allShifts = await prisma.shift.findMany({
    include: {
      _count: {
        select: { assignments: true },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group shifts by venue, date (normalized to date only), startTime, and endTime
  const shiftGroups = new Map<string, DuplicateGroup>();

  for (const shift of allShifts) {
    // Normalize date to just the date part (ignore time)
    const dateOnly = new Date(shift.date);
    dateOnly.setHours(0, 0, 0, 0);

    const key = `${shift.venueId}|${dateOnly.toISOString().split('T')[0]}|${shift.startTime}|${shift.endTime}`;

    if (!shiftGroups.has(key)) {
      shiftGroups.set(key, {
        venueId: shift.venueId,
        date: dateOnly,
        startTime: shift.startTime,
        endTime: shift.endTime,
        shifts: [],
      });
    }

    shiftGroups.get(key)!.shifts.push({
      id: shift.id,
      createdAt: shift.createdAt,
      assignmentCount: shift._count.assignments,
    });
  }

  // Find groups with more than one shift
  const duplicates: DuplicateGroup[] = [];
  for (const group of shiftGroups.values()) {
    if (group.shifts.length > 1) {
      duplicates.push(group);
    }
  }

  return duplicates;
}

async function cleanupDuplicates(duplicates: DuplicateGroup[]) {
  console.log(`📋 Found ${duplicates.length} duplicate groups\n`);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  let totalDeleted = 0;
  let totalMerged = 0;

  for (const group of duplicates) {
    console.log(
      `\n📍 Venue ${group.venueId}, ${group.date.toISOString().split('T')[0]}, ${group.startTime}-${group.endTime}`
    );
    console.log(`   Found ${group.shifts.length} duplicate shifts`);

    // Sort shifts by: 1) most assignments, 2) oldest (keep the one with most data)
    const sortedShifts = [...group.shifts].sort((a, b) => {
      if (b.assignmentCount !== a.assignmentCount) {
        return b.assignmentCount - a.assignmentCount;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const keepShift = sortedShifts[0];
    const deleteShifts = sortedShifts.slice(1);

    console.log(
      `   ✅ Keeping shift ${keepShift.id} (${keepShift.assignmentCount} assignments, created ${keepShift.createdAt.toISOString()})`
    );

    for (const deleteShift of deleteShifts) {
      console.log(
        `   ❌ Deleting shift ${deleteShift.id} (${deleteShift.assignmentCount} assignments, created ${deleteShift.createdAt.toISOString()})`
      );

      // Check if the shift to delete has assignments that need to be moved
      const assignmentsToMove = await prisma.shiftAssignment.findMany({
        where: { shiftId: deleteShift.id },
      });

      // Move assignments to the kept shift (skip duplicates)
      let movedCount = 0;
      for (const assignment of assignmentsToMove) {
        try {
          // Try to create assignment on kept shift (will fail if user already assigned)
          await prisma.shiftAssignment.create({
            data: {
              shiftId: keepShift.id,
              userId: assignment.userId,
              role: assignment.role,
              isLead: assignment.isLead,
              tipAmount: assignment.tipAmount,
              tipCurrency: assignment.tipCurrency,
              tipEnteredBy: assignment.tipEnteredBy,
              tipEnteredAt: assignment.tipEnteredAt,
              tipUpdatedAt: assignment.tipUpdatedAt,
            },
          });
          movedCount++;
        } catch (error: any) {
          // If assignment already exists on kept shift (user assigned to both), skip it
          if (error.code === 'P2002') {
            console.log(
              `      ⚠️  User ${assignment.userId} already assigned to kept shift, skipping`
            );
          } else {
            throw error;
          }
        }
      }

      if (movedCount > 0) {
        console.log(
          `      ↪️  Moved ${movedCount} assignment(s) to kept shift`
        );
        totalMerged += movedCount;
      }

      // Delete the duplicate shift (assignments cascade delete, but we've moved them)
      // Actually, we need to delete assignments first since we've already moved them
      await prisma.shiftAssignment.deleteMany({
        where: { shiftId: deleteShift.id },
      });

      // Delete the shift
      await prisma.shift.delete({
        where: { id: deleteShift.id },
      });

      totalDeleted++;
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted ${totalDeleted} duplicate shift(s)`);
  console.log(`   Merged ${totalMerged} assignment(s) into kept shifts`);
}

async function main() {
  try {
    const duplicates = await findDuplicateShifts();
    await cleanupDuplicates(duplicates);
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
