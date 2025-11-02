import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Parse CSV schedule similar to the upload route
type ShiftAssignment = {
  date: string;
  userName: string;
  role: 'BARTENDER' | 'BARBACK';
  isLead: boolean;
};

function parseScheduleCSV(
  csvData: string,
  filename?: string
): {
  assignments: ShiftAssignment[];
  errors: string[];
  detectedMonth: number | null;
  detectedYear: number | null;
} {
  const lines = csvData.trim().split('\n');
  const assignments: ShiftAssignment[] = [];
  const errors: string[] = [];

  if (lines.length < 9) {
    return {
      assignments: [],
      errors: ['CSV must have at least 9 rows'],
      detectedMonth: null,
      detectedYear: null,
    };
  }

  // Parse dates from first row (skip "DATE" column)
  const dateRow = lines[0].split(',');
  const dates: { index: number; date: string; dayOfMonth: number }[] = [];

  const monthMap: Record<string, number> = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };

  // Detect month and year from first date entry
  let detectedMonth: number | null = null;
  let detectedYear: number | null = null;

  // Try to extract year from filename (e.g., "SEPT 2025" or "OCTOBER 2025")
  if (filename) {
    const yearMatch = filename.match(/(\d{4})/);
    if (yearMatch) {
      detectedYear = parseInt(yearMatch[1], 10);
    }
  }

  // Default to current year if not found in filename
  if (!detectedYear) {
    const currentYear = new Date().getFullYear();
    // If CSV has future dates (Sep/Oct/Nov/Dec), likely next year
    detectedYear = currentYear;
  }

  // Parse dates - detect month from first date entry
  for (let i = 1; i < dateRow.length; i++) {
    const dateStr = dateRow[i]?.trim();
    if (!dateStr) continue;

    try {
      const [day, monthAbbr] = dateStr.split('-');
      const dayNum = parseInt(day, 10);
      if (isNaN(dayNum)) continue;

      // Detect month from first valid date entry
      if (detectedMonth === null && monthAbbr) {
        const monthAbbrUpper = monthAbbr.trim();
        if (monthMap[monthAbbrUpper]) {
          detectedMonth = monthMap[monthAbbrUpper];
        }
      }

      // Use detected month/year, or fallback to parsed month from this entry
      const useMonth =
        detectedMonth || (monthAbbr ? monthMap[monthAbbr.trim()] : null);
      if (!useMonth) {
        errors.push(`Could not determine month from date: ${dateStr}`);
        continue;
      }

      const date = `${detectedYear}-${String(useMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      dates.push({ index: i, date, dayOfMonth: dayNum });
    } catch (err) {
      errors.push(`Failed to parse date: ${dateStr}`);
    }
  }

  if (dates.length === 0) {
    return {
      assignments: [],
      errors: ['No valid dates found in first row'],
      detectedMonth: null,
      detectedYear: null,
    };
  }

  // Parse staff assignments
  // Row 9 (index 9): TIP CLAIM/CUTS - SKIP THIS ROW (contains cash amounts)
  // Row 10 (index 10): BARBACK rows start
  // Row 18 (index 18): LEAD - 1 starts
  // Row 22 (index 22): Numbered bartenders start

  for (let rowIdx = 8; rowIdx < lines.length; rowIdx++) {
    const line = lines[rowIdx];
    if (!line?.trim()) continue;

    const columns = line.split(',');
    const roleLabel = columns[0]?.trim().toUpperCase();

    // Skip TIP CLAIM/CUTS row (row 9) - contains cash amounts, not names
    if (
      roleLabel.includes('TIP') ||
      roleLabel.includes('CLAIM') ||
      roleLabel.includes('CUTS')
    ) {
      continue;
    }

    // Skip rows that start with $ or are numbers that look like money
    const firstCol = columns[0]?.trim();
    if (firstCol?.startsWith('$') || firstCol?.match(/^\d+\.\d{2}$/)) {
      continue;
    }

    let role: 'BARTENDER' | 'BARBACK' = 'BARTENDER';
    let isLead = false;

    if (roleLabel.startsWith('BARBACK')) {
      role = 'BARBACK';
    } else if (roleLabel.startsWith('LEAD')) {
      role = 'BARTENDER';
      isLead = true;
    } else if (roleLabel.match(/^\d+$/)) {
      role = 'BARTENDER';
    } else if (roleLabel === 'BAR MANAGER' || !roleLabel) {
      continue;
    }

    dates.forEach(({ index, date }) => {
      const nameStr = columns[index]?.trim();
      if (!nameStr) return;

      // Handle names, swaps, and cuts
      const names = nameStr
        .split(/[,-]/)
        .map((n) => n.trim())
        .filter((n) => {
          const upper = n.toUpperCase();
          return (
            n.length > 0 &&
            !upper.includes('CUT') &&
            !upper.includes('OC') &&
            !upper.includes('MOVED TO') &&
            !upper.match(/^\(.+\)$/)
          );
        });

      names.forEach((name) => {
        if (name.length > 1) {
          const cleanName = name.replace(/\(.*?\)/g, '').trim();
          if (cleanName.length > 0) {
            assignments.push({
              date,
              userName: cleanName,
              role,
              isLead,
            });
          }
        }
      });
    });
  }

  return { assignments, errors, detectedMonth, detectedYear };
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin
  const testPassword = await hash('test', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Super Admin',
      hashedPassword: testPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 100-0001',
      },
    },
  });
  console.log('✅ Created Super Admin:', superAdmin.email);

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@test.com' },
    update: {},
    create: {
      email: 'manager@test.com',
      name: 'Test Manager',
      hashedPassword: testPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: true,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 100-0002',
      },
    },
  });
  console.log('✅ Created Manager:', manager.email);

  // Create test accounts for bartender and barback that will be mapped to specific users
  const testBartender = await prisma.user.upsert({
    where: { email: 'bartender@test.com' },
    update: {},
    create: {
      email: 'bartender@test.com',
      name: 'Test Bartender',
      hashedPassword: testPassword,
      role: 'BARTENDER',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 100-0003',
      },
    },
  });

  const testBarback = await prisma.user.upsert({
    where: { email: 'barback@test.com' },
    update: {
      // Keep existing preferredVenuesOrder or initialize if empty
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 100-0004',
      },
    },
    create: {
      email: 'barback@test.com',
      name: 'Test Barback',
      hashedPassword: testPassword,
      role: 'BARBACK',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 100-0004',
      },
    },
  });

  // Create Mission Ballroom venue
  const missionBallroom = await prisma.venue.upsert({
    where: { id: 'mission-ballroom' },
    update: {
      // Ensure manager is always connected, even if venue already exists
      managers: {
        set: [{ id: manager.id }],
      },
    },
    create: {
      id: 'mission-ballroom',
      name: 'Mission Ballroom',
      isNetworked: true,
      priority: 1,
      availabilityDeadlineDay: 10,
      tipPoolEnabled: true,
      createdById: superAdmin.id,
      managers: {
        connect: [{ id: manager.id }],
      },
    },
  });
  console.log('✅ Created Venue: Mission Ballroom');

  // Create Bluebird venue
  const bluebird = await prisma.venue.upsert({
    where: { id: 'bluebird' },
    update: {
      // Ensure manager is always connected, even if venue already exists
      managers: {
        set: [{ id: manager.id }],
      },
    },
    create: {
      id: 'bluebird',
      name: 'Bluebird',
      isNetworked: true,
      priority: 2,
      availabilityDeadlineDay: 10,
      tipPoolEnabled: true,
      createdById: superAdmin.id,
      managers: {
        connect: [{ id: manager.id }],
      },
    },
  });
  console.log('✅ Created Venue: Bluebird');

  // Update test barback to include Mission Ballroom and Bluebird in preferred venues
  await prisma.user.update({
    where: { id: testBarback.id },
    data: {
      preferredVenuesOrder: [missionBallroom.id, bluebird.id],
    },
  });
  console.log(
    '✅ Updated Test Barback to work at Mission Ballroom and Bluebird'
  );

  // Create 15 random users for testing - all work at Mission and Bluebird
  const randomFirstNames = [
    'Alex',
    'Jordan',
    'Taylor',
    'Casey',
    'Morgan',
    'Riley',
    'Avery',
    'Quinn',
    'Blake',
    'Sage',
    'Dakota',
    'Skylar',
    'River',
    'Phoenix',
    'Rowan',
  ];
  const randomLastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Wilson',
    'Anderson',
    'Thomas',
  ];

  const randomUsers: Array<{
    firstName: string;
    lastName: string;
    role: 'BARTENDER' | 'BARBACK';
    isLead: boolean;
    venues: string[];
  }> = [];

  // Generate 15 random users - all work at Mission and Bluebird
  for (let i = 0; i < 15; i++) {
    const firstName =
      randomFirstNames[Math.floor(Math.random() * randomFirstNames.length)];
    const lastName =
      randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
    const role = Math.random() > 0.4 ? 'BARTENDER' : 'BARBACK'; // 60% bartenders, 40% barbacks
    const venues: string[] = [missionBallroom.id, bluebird.id]; // All work at both venues

    randomUsers.push({ firstName, lastName, role, isLead: false, venues });
  }

  // Ensure exactly 3 leads (bartenders) are designated as leads
  const bartenders = randomUsers.filter((u) => u.role === 'BARTENDER');
  const leadsNeeded = 3;
  for (let i = 0; i < Math.min(leadsNeeded, bartenders.length); i++) {
    bartenders[i].isLead = true;
  }

  console.log(
    '\n👥 Creating 15 random users (all at Mission & Bluebird, 3 leads)...'
  );
  for (const user of randomUsers) {
    const name = `${user.firstName} ${user.lastName}`;
    const email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@test.com`;
    const phoneIndex = 3000 + randomUsers.indexOf(user);

    try {
      await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role: user.role,
          isLead: user.isLead,
          preferredVenuesOrder: user.venues,
          notificationPrefs: {
            email: true,
            push: false,
            sms: true,
            phoneNumber: `(555) 100-${String(phoneIndex).padStart(4, '0')}`,
          },
        },
        create: {
          email,
          name,
          hashedPassword: testPassword,
          role: user.role,
          status: 'ACTIVE',
          hasDayJob: false,
          isLead: user.isLead,
          preferredVenuesOrder: user.venues,
          notificationPrefs: {
            email: true,
            push: false,
            sms: true,
            phoneNumber: `(555) 100-${String(phoneIndex).padStart(4, '0')}`,
          },
        },
      });
      const venuesStr = user.venues
        .map((v) =>
          v === missionBallroom.id
            ? 'Mission'
            : v === bluebird.id
              ? 'Bluebird'
              : v
        )
        .join(', ');
      console.log(
        `   ✓ ${name} (${user.role}${user.isLead ? ', Lead' : ''}) - venues: ${venuesStr}`
      );
    } catch (error) {
      console.error(`   ✗ Failed to create user ${name}:`, error);
    }
  }

  // Find and parse all CSV schedule files
  console.log('\n📅 Parsing schedule CSV files...');
  const exampleDataDir = join(process.cwd(), 'example_data');
  const csvFiles = readdirSync(exampleDataDir)
    .filter(
      (file) => file.endsWith('.csv') && file.toLowerCase().includes('schedule')
    )
    .sort(); // Process in alphabetical order (September before October)

  if (csvFiles.length === 0) {
    console.warn('⚠️  No CSV schedule files found in example_data directory');
    return;
  }

  const allAssignments: ShiftAssignment[] = [];
  const allErrors: string[] = [];

  for (const csvFile of csvFiles) {
    const csvPath = join(exampleDataDir, csvFile);
    console.log(`\n   Processing: ${csvFile}`);
    const csvData = readFileSync(csvPath, 'utf-8');

    const result = parseScheduleCSV(csvData, csvFile);

    if (result.errors.length > 0) {
      console.warn(`   ⚠️  Warnings for ${csvFile}:`, result.errors);
      allErrors.push(...result.errors);
    }

    if (result.detectedMonth && result.detectedYear) {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthName = monthNames[result.detectedMonth - 1];
      console.log(
        `   ✅ Parsed ${result.assignments.length} assignments for ${monthName} ${result.detectedYear}`
      );
    } else {
      console.log(`   ✅ Parsed ${result.assignments.length} assignments`);
    }

    allAssignments.push(...result.assignments);
  }

  console.log(
    `\n✅ Total: ${allAssignments.length} shift assignments from ${csvFiles.length} file(s)`
  );

  // Use allAssignments for the rest of the seed process
  const assignments = allAssignments;

  // Re-parse dates for call time lookup and tip amounts from all CSV files
  // We'll process each CSV file to extract call times, tips, and manager info
  const dateMap = new Map<string, { fileIndex: number; colIndex: number }>(); // date -> { fileIndex, colIndex }
  const tipAmountMap = new Map<string, number>(); // date -> tip amount
  const callTimeMap = new Map<string, string>(); // date -> call time
  const generalManagerInitials = new Set<string>();

  for (let fileIndex = 0; fileIndex < csvFiles.length; fileIndex++) {
    const csvFile = csvFiles[fileIndex];
    const csvPath = join(exampleDataDir, csvFile);
    const csvData = readFileSync(csvPath, 'utf-8');
    const csvLines = csvData.split('\n');
    const dateRow = csvLines[0]?.split(',') || [];

    // Parse dates from this file
    const monthMap: Record<string, number> = {
      Jan: 1,
      Feb: 2,
      Mar: 3,
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12,
    };

    // Try to extract year from filename
    let fileYear = new Date().getFullYear();
    const yearMatch = csvFile.match(/(\d{4})/);
    if (yearMatch) {
      fileYear = parseInt(yearMatch[1], 10);
    }

    // Build date map for this file
    for (let i = 1; i < dateRow.length; i++) {
      const dateStr = dateRow[i]?.trim();
      if (!dateStr) continue;

      try {
        const [day, monthAbbr] = dateStr.split('-');
        const dayNum = parseInt(day, 10);
        if (isNaN(dayNum)) continue;

        const monthNum = monthAbbr ? monthMap[monthAbbr.trim()] : null;
        if (!monthNum) continue;

        const date = `${fileYear}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        dateMap.set(date, { fileIndex, colIndex: i });

        // Parse tip amount for this date (row 9, index 8 - TIP CLAIM/CUTS)
        const tipRow = csvLines[8]?.split(',') || [];
        const tipStr = tipRow[i]?.trim();
        if (tipStr) {
          const tipAmount = parseFloat(tipStr.replace(/[$,\s]/g, ''));
          if (!isNaN(tipAmount) && tipAmount > 0) {
            tipAmountMap.set(date, tipAmount);
          }
        }

        // Parse call time for this date (row 5, index 4 - BARTENDER CALL)
        const bartenderCallRow = csvLines[4]?.split(',') || [];
        const callTimeStr = bartenderCallRow[i]?.trim();
        if (callTimeStr) {
          callTimeMap.set(date, callTimeStr);
        }
      } catch {
        // Skip invalid dates
      }
    }

    // Parse BAR MANAGER row (row 9, index 8) to extract general manager initials
    const barManagerRow = csvLines[8]?.split(',') || [];
    for (let i = 1; i < barManagerRow.length; i++) {
      const initials = barManagerRow[i]?.trim();
      if (initials && initials.length > 0 && initials.length <= 5) {
        // Valid initials are typically 2-5 characters
        generalManagerInitials.add(initials);
      }
    }
  }

  // Create General Manager users from initials
  console.log(
    `\n👔 Creating ${generalManagerInitials.size} General Managers from BAR MANAGER row...`
  );
  let generalManagerIndex = 0;
  for (const initials of generalManagerInitials) {
    const email = `${initials.toLowerCase()}@mission.test`;
    const phoneIndex = 1005 + generalManagerIndex;
    generalManagerIndex++;
    try {
      // Try to create General Manager, but if role doesn't exist yet, create as MANAGER temporarily
      // This can happen if migration hasn't been run yet
      try {
        await prisma.user.upsert({
          where: { email },
          update: {
            name: initials,
            role: 'GENERAL_MANAGER' as any,
            notificationPrefs: {
              email: true,
              push: false,
              sms: true,
              phoneNumber: `(555) 100-${String(phoneIndex).padStart(4, '0')}`,
            },
          },
          create: {
            email,
            name: initials,
            hashedPassword: testPassword,
            role: 'GENERAL_MANAGER' as any,
            status: 'ACTIVE',
            hasDayJob: false,
            isLead: false,
            preferredVenuesOrder: [missionBallroom.id],
            notificationPrefs: {
              email: true,
              push: false,
              sms: true,
              phoneNumber: `(555) 100-${String(phoneIndex).padStart(4, '0')}`,
            },
          },
        });
        console.log(`   ✓ ${initials} (GENERAL_MANAGER)`);
      } catch (roleError: any) {
        // If GENERAL_MANAGER role doesn't exist yet (migration not run), create as MANAGER
        // User can update after running migration
        await prisma.user.upsert({
          where: { email },
          update: {
            name: initials,
            role: 'MANAGER',
            notificationPrefs: {
              email: true,
              push: false,
              sms: true,
              phoneNumber: `(555) 100-${String(phoneIndex).padStart(4, '0')}`,
            },
          },
          create: {
            email,
            name: initials,
            hashedPassword: testPassword,
            role: 'MANAGER',
            status: 'ACTIVE',
            hasDayJob: false,
            isLead: false,
            preferredVenuesOrder: [missionBallroom.id],
            notificationPrefs: {
              email: true,
              push: false,
              sms: true,
              phoneNumber: `(555) 100-${String(phoneIndex).padStart(4, '0')}`,
            },
          },
        });
        console.log(
          `   ⚠️  ${initials} (MANAGER - run migration to update to GENERAL_MANAGER)`
        );
      }
    } catch (error) {
      console.error(
        `   ✗ Failed to create General Manager ${initials}:`,
        error
      );
    }
  }

  // Extract unique user names and create users
  const uniqueNames = Array.from(new Set(assignments.map((a) => a.userName)));
  console.log(`\n👥 Creating ${uniqueNames.length} users from schedule...`);

  const userMap = new Map<string, string>(); // userName -> userId
  let stephCUserId: string | null = null;
  let jamesTUserId: string | null = null;

  for (const name of uniqueNames) {
    // Determine role based on assignments
    const userAssignments = assignments.filter((a) => a.userName === name);
    const roles = new Set(userAssignments.map((a) => a.role));
    const isLead = userAssignments.some((a) => a.isLead);

    // If user has any lead assignments, they must be a BARTENDER
    // Otherwise count assignments to determine most common role
    let userRole: 'BARTENDER' | 'BARBACK' = 'BARBACK'; // Default to BARBACK

    if (isLead) {
      // Leads must be bartenders
      userRole = 'BARTENDER';
    } else {
      // Count role occurrences
      const bartenderCount = userAssignments.filter(
        (a) => a.role === 'BARTENDER'
      ).length;
      const barbackCount = userAssignments.filter(
        (a) => a.role === 'BARBACK'
      ).length;

      // Use whichever role has more assignments
      // If equal, default to BARBACK (more specific role)
      userRole = bartenderCount > barbackCount ? 'BARTENDER' : 'BARBACK';
    }

    // Create email from name
    const emailName = name
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    const email = `${emailName}@mission.test`;

    try {
      // Generate a unique phone number based on name hash
      const nameHash = name
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const phoneLast4 = String(2000 + (nameHash % 8000)).padStart(4, '0');

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role: userRole,
          isLead,
          notificationPrefs: {
            email: true,
            push: false,
            sms: true,
            phoneNumber: `(555) 200-${phoneLast4}`,
          },
        },
        create: {
          email,
          name,
          hashedPassword: testPassword,
          role: userRole,
          status: 'ACTIVE',
          hasDayJob: false,
          isLead,
          preferredVenuesOrder: [missionBallroom.id],
          notificationPrefs: {
            email: true,
            push: false,
            sms: true,
            phoneNumber: `(555) 200-${phoneLast4}`,
          },
        },
      });
      userMap.set(name, user.id);

      // Track STEPH C and JAMES T for test account mapping
      if (name.toUpperCase().includes('STEPH C') || name === 'STEPH C') {
        stephCUserId = user.id;
      }
      if (name.toUpperCase().includes('JAMES T') || name === 'JAMES T') {
        jamesTUserId = user.id;
      }

      console.log(`   ✓ ${name} (${userRole}${isLead ? ', Lead' : ''})`);
    } catch (error) {
      console.error(`   ✗ Failed to create user ${name}:`, error);
    }
  }

  // Group assignments by date to create shifts
  console.log('\n📋 Creating shifts and assignments...');
  const assignmentsByDate = new Map<string, ShiftAssignment[]>();
  assignments.forEach((assignment) => {
    if (!assignmentsByDate.has(assignment.date)) {
      assignmentsByDate.set(assignment.date, []);
    }
    assignmentsByDate.get(assignment.date)!.push(assignment);
  });

  let shiftsCreated = 0;
  let assignmentsCreated = 0;

  for (const [dateStr, dateAssignments] of assignmentsByDate.entries()) {
    // Get call time from map
    const callTimeStr = callTimeMap.get(dateStr) || '18:00';

    // Parse call time (e.g., "6PM" -> "18:00", "5:30 PM" -> "17:30")
    let startTime = '18:00';
    if (callTimeStr && callTimeStr !== '18:00') {
      const timeMatch = callTimeStr.match(
        /(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)/i
      );
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      } else if (callTimeStr.match(/\d{1,2}PM/i)) {
        const hours = parseInt(callTimeStr, 10);
        startTime = `${String(hours + 12).padStart(2, '0')}:00`;
      }
    }

    // Default end time (overnight shift)
    const endTime = '02:00';

    const shiftDate = new Date(dateStr + 'T00:00:00Z');

    try {
      // Get tip amount for this shift date (reference data from CSV)
      const totalTipAmount = tipAmountMap.get(dateStr);

      // Count roles for logging
      const bartenderCount = dateAssignments.filter(
        (a) => a.role === 'BARTENDER'
      ).length;
      const barbackCount = dateAssignments.filter(
        (a) => a.role === 'BARBACK'
      ).length;
      const leadCount = dateAssignments.filter((a) => a.isLead).length;
      const uniqueStaffCount = new Set(dateAssignments.map((a) => a.userName))
        .size;

      // Create shift
      const shift = await prisma.shift.create({
        data: {
          venueId: missionBallroom.id,
          date: shiftDate,
          startTime,
          endTime,
          bartendersRequired: bartenderCount,
          barbacksRequired: barbackCount,
          leadsRequired: leadCount,
        },
      });
      shiftsCreated++;

      // Log shift creation details
      const dateFormatted = shiftDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const tipInfo = totalTipAmount
        ? ` | Tips: $${totalTipAmount.toFixed(2)}`
        : '';
      console.log(
        `   ✓ ${dateFormatted} | ${startTime}-${endTime} | ${bartenderCount} bartenders (${leadCount} leads), ${barbackCount} barbacks | ${uniqueStaffCount} staff${tipInfo}`
      );

      // Create assignments - deduplicate by userId first
      const uniqueAssignments = new Map<string, ShiftAssignment>();
      for (const assignment of dateAssignments) {
        const userId = userMap.get(assignment.userName);
        if (!userId) {
          console.warn(
            `   ⚠️  User not found for assignment: ${assignment.userName} on ${dateStr}`
          );
          continue;
        }

        // Ensure leads are always bartenders
        const finalAssignment: ShiftAssignment = {
          ...assignment,
          role: assignment.isLead ? 'BARTENDER' : assignment.role,
        };

        // If user already assigned, use the one with higher priority (Lead > regular)
        const existing = uniqueAssignments.get(userId);
        if (existing) {
          // Keep the assignment that is a lead, or the one that's a bartender (prefer bartender over barback)
          if (
            finalAssignment.isLead ||
            (!existing.isLead && finalAssignment.role === 'BARTENDER')
          ) {
            uniqueAssignments.set(userId, finalAssignment);
          }
        } else {
          uniqueAssignments.set(userId, finalAssignment);
        }
      }

      // Distribute evenly as baseline reference - managers will adjust actual distribution
      const tipPerPerson =
        totalTipAmount && uniqueAssignments.size > 0
          ? totalTipAmount / uniqueAssignments.size
          : null;

      // Create assignments from deduplicated map
      for (const [userId, assignment] of uniqueAssignments.entries()) {
        await prisma.shiftAssignment.create({
          data: {
            shiftId: shift.id,
            userId,
            role: assignment.role,
            isLead: assignment.isLead,
            // Store reference tip amount (evenly distributed baseline from CSV)
            // Managers can adjust actual distribution based on individual tax situations
            tipAmount: tipPerPerson ? tipPerPerson : null,
            tipCurrency: tipPerPerson ? 'USD' : null,
            tipEnteredBy: tipPerPerson ? manager.id : null,
            tipEnteredAt: tipPerPerson ? new Date() : null,
          },
        });
        assignmentsCreated++;
      }

      // Mark shift as having tips published if tip amount exists
      // This is reference data from historic schedule - actual distribution may differ
      if (totalTipAmount) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: {
            tipsPublished: true,
            tipsPublishedAt: new Date(),
            tipsPublishedBy: manager.id,
          },
        });
      }
    } catch (error) {
      console.error(`   ✗ Failed to create shift for ${dateStr}:`, error);
    }
  }

  console.log(
    `✅ Created ${shiftsCreated} shifts and ${assignmentsCreated} assignments`
  );

  // Map test accounts to STEPH C and JAMES T by copying their assignments
  // This must happen AFTER all shifts and assignments are created
  if (stephCUserId) {
    console.log('\n🔗 Mapping bartender@test.com to STEPH C shifts...');
    // Get all shift assignments for STEPH C
    const stephCAssignments = await prisma.shiftAssignment.findMany({
      where: { userId: stephCUserId },
      select: {
        shiftId: true,
        role: true,
        isLead: true,
        tipAmount: true,
        tipCurrency: true,
      },
    });

    // Create matching assignments for test bartender account
    let mappedCount = 0;
    for (const assignment of stephCAssignments) {
      try {
        await prisma.shiftAssignment.upsert({
          where: {
            shiftId_userId: {
              shiftId: assignment.shiftId,
              userId: testBartender.id,
            },
          },
          update: {
            role: assignment.role,
            isLead: assignment.isLead,
            tipAmount: assignment.tipAmount,
            tipCurrency: assignment.tipCurrency,
          },
          create: {
            shiftId: assignment.shiftId,
            userId: testBartender.id,
            role: assignment.role,
            isLead: assignment.isLead,
            tipAmount: assignment.tipAmount,
            tipCurrency: assignment.tipCurrency,
          },
        });
        mappedCount++;
      } catch (error) {
        // Skip if already exists or constraint error
      }
    }
    console.log(`   ✓ Mapped ${mappedCount} shifts to bartender@test.com`);
  } else {
    console.log('   ⚠️  STEPH C not found in CSV data');
  }

  if (jamesTUserId) {
    console.log('\n🔗 Mapping barback@test.com to JAMES T shifts...');
    // Get all shift assignments for JAMES T
    const jamesTAssignments = await prisma.shiftAssignment.findMany({
      where: { userId: jamesTUserId },
      select: {
        shiftId: true,
        role: true,
        isLead: true,
        tipAmount: true,
        tipCurrency: true,
      },
    });

    // Create matching assignments for test barback account
    let mappedCount = 0;
    for (const assignment of jamesTAssignments) {
      try {
        await prisma.shiftAssignment.upsert({
          where: {
            shiftId_userId: {
              shiftId: assignment.shiftId,
              userId: testBarback.id,
            },
          },
          update: {
            role: assignment.role,
            isLead: assignment.isLead,
            tipAmount: assignment.tipAmount,
            tipCurrency: assignment.tipCurrency,
          },
          create: {
            shiftId: assignment.shiftId,
            userId: testBarback.id,
            role: assignment.role,
            isLead: assignment.isLead,
            tipAmount: assignment.tipAmount,
            tipCurrency: assignment.tipCurrency,
          },
        });
        mappedCount++;
      } catch (error) {
        // Skip if already exists or constraint error
      }
    }
    console.log(`   ✓ Mapped ${mappedCount} shifts to barback@test.com`);
  } else {
    console.log('   ⚠️  JAMES T not found in CSV data');
  }

  console.log('\n🎉 Seed completed!');
  console.log('\n📝 Test accounts (username / password):');
  console.log('   Super Admin: admin / test');
  console.log('   Manager: manager / test');
  console.log("   Bartender: bartender / test (shows STEPH C's shifts)");
  console.log("   Barback: barback / test (shows JAMES T's shifts)");
  console.log('   General Managers: BH, HG, HH (from BAR MANAGER row)');
  console.log(
    '\n💡 Tip: You can login with just the username (no @test.com needed)'
  );
  console.log('\n📍 Venue: Mission Ballroom');
  console.log(
    `📅 Schedule: December 2024 (${shiftsCreated} shifts with ${assignmentsCreated} assignments)`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
