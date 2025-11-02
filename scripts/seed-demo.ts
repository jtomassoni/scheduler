import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo123';

// Environment check - this seed is specifically for test.jschedules.com
const isTestEnvironment =
  process.env.NEXTAUTH_URL?.includes('test.jschedules.com') ||
  process.env.NODE_ENV === 'development';

if (
  !isTestEnvironment &&
  process.env.NEXTAUTH_URL?.includes('jschedules.com') &&
  !process.env.NEXTAUTH_URL?.includes('test.')
) {
  console.error(
    '⚠️  WARNING: This seed script is designed for test.jschedules.com only!'
  );
  console.error(
    '   Current NEXTAUTH_URL appears to be production:',
    process.env.NEXTAUTH_URL
  );
  console.error(
    '   To seed test environment, ensure NEXTAUTH_URL=https://test.jschedules.com'
  );
  console.error(
    '   If you intentionally want to seed production, set FORCE_SEED=true'
  );
  if (process.env.FORCE_SEED !== 'true') {
    console.error(
      '\n❌ Aborting seed to prevent production data contamination.'
    );
    process.exit(1);
  } else {
    console.warn('\n⚠️  FORCE_SEED=true detected. Proceeding with caution...');
  }
}

// Demo venue names
const DEMO_VENUES = [
  { id: 'demo-venue-1', name: 'The Grand Ballroom', priority: 1 },
  { id: 'demo-venue-2', name: 'Downtown Lounge', priority: 2 },
  { id: 'demo-venue-3', name: 'Riverside Club', priority: 3 },
  { id: 'demo-venue-4', name: 'City Center Hall', priority: 4 },
];

// First names for generating staff
const FIRST_NAMES = [
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
  'Jamie',
  'Cameron',
  'Drew',
  'Emery',
  'Finley',
  'Hayden',
  'Jaden',
  'Kai',
  'Logan',
  'Noah',
  'Olivia',
  'Emma',
  'Sophia',
  'Isabella',
  'Mia',
  'Charlotte',
  'Amelia',
  'Harper',
  'Evelyn',
  'Abigail',
  'Emily',
  'Elizabeth',
  'Mila',
  'Ella',
  'Avery',
  'Sofia',
  'Camila',
  'Aria',
  'Scarlett',
  'Victoria',
  'Madison',
  'Luna',
  'Grace',
  'Chloe',
  'Penelope',
  'Layla',
  'Riley',
  'Zoey',
  'Nora',
  'Lily',
  'Eleanor',
  'Hannah',
  'Lillian',
  'Addison',
  'Aubrey',
  'Ellie',
  'Stella',
  'Natalie',
  'Zoe',
  'Leah',
  'Hazel',
  'Violet',
  'Aurora',
  'Savannah',
  'Audrey',
  'Brooklyn',
  'Bella',
  'Claire',
  'Skylar',
  'Lucy',
  'Paisley',
  'Everly',
  'Anna',
  'Caroline',
  'Nova',
  'Genesis',
  'Aaliyah',
  'Kennedy',
  'Kinsley',
  'Allison',
  'Maya',
  'Willow',
  'Naomi',
  'Elena',
  'Sarah',
  'Ariana',
  'Allison',
  'Gabriella',
  'Alice',
  'Madelyn',
  'Cora',
  'Ruby',
];

const LAST_NAMES = [
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
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
];

// Event names for shifts
const EVENT_NAMES = [
  'Summer Concert Series',
  'Jazz Night',
  'DJ Dance Party',
  'Rock & Roll Show',
  'Acoustic Evening',
  'Hip Hop Night',
  'Country Music Fest',
  'Latin Night',
  'Electronic Music Event',
  'Classical Performance',
  'Blues Festival',
  'Reggae Night',
  'Folk Music Showcase',
  'Soul & R&B Night',
  'Indie Rock Show',
];

async function main() {
  console.log('🎭 Starting Demo Data Seed for test.jschedules.com...\n');
  console.log(
    '📍 This seed populates the test.jschedules.com environment with demo data\n'
  );

  const demoPassword = await hash(DEMO_PASSWORD, 12);

  // Create Super Admin (if doesn't exist)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Demo Admin',
      hashedPassword: demoPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 000-0001',
      },
    },
  });
  console.log('✅ Created Demo Admin:', superAdmin.email);

  // Create Demo Manager
  const demoManager = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      name: 'Demo Manager',
      hashedPassword: demoPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: true,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 000-0002',
      },
    },
  });
  console.log('✅ Created Demo Manager:', demoManager.email);

  // Create Demo Bartender
  const demoBartender = await prisma.user.upsert({
    where: { email: 'bartender@demo.com' },
    update: {},
    create: {
      email: 'bartender@demo.com',
      name: 'Demo Bartender',
      hashedPassword: demoPassword,
      role: 'BARTENDER',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 000-0003',
      },
    },
  });
  console.log('✅ Created Demo Bartender:', demoBartender.email);

  // Create Demo Barback
  const demoBarback = await prisma.user.upsert({
    where: { email: 'barback@demo.com' },
    update: {},
    create: {
      email: 'barback@demo.com',
      name: 'Demo Barback',
      hashedPassword: demoPassword,
      role: 'BARBACK',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
      notificationPrefs: {
        email: true,
        push: false,
        sms: true,
        phoneNumber: '(555) 000-0004',
      },
    },
  });
  console.log('✅ Created Demo Barback:', demoBarback.email);

  // Create Demo Venues
  console.log('\n🏢 Creating Demo Venues...');
  const venues = [];
  for (const venueData of DEMO_VENUES) {
    const venue = await prisma.venue.upsert({
      where: { id: venueData.id },
      update: {
        managers: {
          set: [{ id: demoManager.id }],
        },
      },
      create: {
        id: venueData.id,
        name: venueData.name,
        isNetworked: true,
        priority: venueData.priority,
        availabilityDeadlineDay: 10,
        tipPoolEnabled: true,
        createdById: superAdmin.id,
        managers: {
          connect: [{ id: demoManager.id }],
        },
      },
    });
    venues.push(venue);
    console.log(`   ✓ ${venue.name}`);
  }

  // Update demo manager to manage all venues
  await prisma.user.update({
    where: { id: demoManager.id },
    data: {
      managedVenues: {
        connect: venues.map((v) => ({ id: v.id })),
      },
    },
  });

  // Update demo bartender and barback preferred venues
  await prisma.user.update({
    where: { id: demoBartender.id },
    data: {
      preferredVenuesOrder: venues.map((v) => v.id),
    },
  });

  await prisma.user.update({
    where: { id: demoBarback.id },
    data: {
      preferredVenuesOrder: venues.map((v) => v.id),
    },
  });

  // Generate 100 Bartenders
  console.log('\n🍸 Creating 100 Demo Bartenders...');
  const bartenders = [];
  const bartenderLeads = 15; // 15% leads

  for (let i = 0; i < 100; i++) {
    const firstName =
      FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    const email = `bartender${i + 1}@demo.com`;
    const isLead = i < bartenderLeads;

    // Each bartender works at 2-4 random venues
    const numVenues = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    const shuffledVenues = [...venues].sort(() => Math.random() - 0.5);
    const assignedVenues = shuffledVenues.slice(0, numVenues);

    try {
      const bartender = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          isLead,
          preferredVenuesOrder: assignedVenues.map((v) => v.id),
        },
        create: {
          email,
          name,
          hashedPassword: demoPassword,
          role: 'BARTENDER',
          status: 'ACTIVE',
          hasDayJob: false,
          isLead,
          preferredVenuesOrder: assignedVenues.map((v) => v.id),
          notificationPrefs: {
            email: true,
            push: false,
            sms: true,
            phoneNumber: `(555) ${String(i + 100).padStart(3, '0')}-${String(
              Math.floor(Math.random() * 9000) + 1000
            )}`,
          },
        },
      });
      bartenders.push(bartender);
      if (i % 20 === 0) {
        console.log(`   ✓ Created ${i + 1} bartenders...`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to create ${name}:`, error);
    }
  }
  console.log(
    `   ✅ Created ${bartenders.length} bartenders (${bartenderLeads} leads)`
  );

  // Generate 20 Barbacks
  console.log('\n🥤 Creating 20 Demo Barbacks...');
  const barbacks = [];

  for (let i = 0; i < 20; i++) {
    const firstName =
      FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    const email = `barback${i + 1}@demo.com`;

    // Each barback works at 2-4 random venues
    const numVenues = Math.floor(Math.random() * 3) + 2;
    const shuffledVenues = [...venues].sort(() => Math.random() - 0.5);
    const assignedVenues = shuffledVenues.slice(0, numVenues);

    try {
      const barback = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          preferredVenuesOrder: assignedVenues.map((v) => v.id),
        },
        create: {
          email,
          name,
          hashedPassword: demoPassword,
          role: 'BARBACK',
          status: 'ACTIVE',
          hasDayJob: false,
          isLead: false,
          preferredVenuesOrder: assignedVenues.map((v) => v.id),
          notificationPrefs: {
            email: true,
            push: false,
            sms: true,
            phoneNumber: `(555) ${String(i + 200).padStart(3, '0')}-${String(
              Math.floor(Math.random() * 9000) + 1000
            )}`,
          },
        },
      });
      barbacks.push(barback);
      console.log(`   ✓ ${name}`);
    } catch (error) {
      console.error(`   ✗ Failed to create ${name}:`, error);
    }
  }
  console.log(`   ✅ Created ${barbacks.length} barbacks`);

  // Create Demo Shifts for the next 4 weeks
  console.log('\n📅 Creating Demo Shifts (Next 4 Weeks)...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shifts = [];
  let shiftCount = 0;

  for (let week = 0; week < 4; week++) {
    for (const venue of venues) {
      // Create 3-5 shifts per venue per week (Friday, Saturday, Sunday)
      const daysOfWeek = [5, 6, 0]; // Friday, Saturday, Sunday
      const numShifts = Math.floor(Math.random() * 3) + 3; // 3-5 shifts

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + week * 7 + dayOffset);
        const dayOfWeek = date.getDay();

        // Only create shifts on weekends (Friday-Sunday) and occasionally Thursday
        if (
          daysOfWeek.includes(dayOfWeek) ||
          (dayOfWeek === 4 && Math.random() > 0.7) // 30% chance for Thursday
        ) {
          const eventName =
            EVENT_NAMES[Math.floor(Math.random() * EVENT_NAMES.length)];
          const startHour = 18 + Math.floor(Math.random() * 2); // 18:00 or 19:00
          const endHour = startHour < 22 ? 23 : 2; // End at 23:00 or 02:00

          try {
            const shift = await prisma.shift.create({
              data: {
                venueId: venue.id,
                date: date,
                startTime: `${String(startHour).padStart(2, '0')}:00`,
                endTime:
                  endHour === 2
                    ? `${String(endHour).padStart(2, '0')}:00`
                    : `${String(endHour).padStart(2, '0')}:00`,
                eventName,
                bartendersRequired: Math.floor(Math.random() * 4) + 3, // 3-6 bartenders
                barbacksRequired: Math.floor(Math.random() * 2) + 1, // 1-2 barbacks
                leadsRequired: Math.floor(Math.random() * 2) + 1, // 1-2 leads
              },
            });
            shifts.push(shift);
            shiftCount++;

            // Assign some staff to shifts (60% of shifts have some assignments)
            if (Math.random() > 0.4) {
              const assignedUserIds = new Set<string>();

              // Assign leads first
              const leads = bartenders.filter(
                (b) => b.isLead && b.preferredVenuesOrder.includes(venue.id)
              );
              const leadsToAssign = Math.min(shift.leadsRequired, leads.length);
              for (let i = 0; i < leadsToAssign; i++) {
                const lead = leads[i];
                if (lead && !assignedUserIds.has(lead.id)) {
                  await prisma.shiftAssignment.create({
                    data: {
                      shiftId: shift.id,
                      userId: lead.id,
                      role: 'BARTENDER',
                      isLead: true,
                    },
                  });
                  assignedUserIds.add(lead.id);
                }
              }

              // Assign bartenders
              const availableBartenders = bartenders.filter(
                (b) =>
                  !b.isLead &&
                  b.preferredVenuesOrder.includes(venue.id) &&
                  !assignedUserIds.has(b.id)
              );
              const bartendersToAssign = Math.min(
                shift.bartendersRequired - leadsToAssign,
                Math.min(availableBartenders.length, 5)
              );
              for (let i = 0; i < bartendersToAssign; i++) {
                const bartender =
                  availableBartenders[
                    Math.floor(Math.random() * availableBartenders.length)
                  ];
                if (bartender && !assignedUserIds.has(bartender.id)) {
                  await prisma.shiftAssignment.create({
                    data: {
                      shiftId: shift.id,
                      userId: bartender.id,
                      role: 'BARTENDER',
                      isLead: false,
                    },
                  });
                  assignedUserIds.add(bartender.id);
                }
              }

              // Assign barbacks
              const availableBarbacks = barbacks.filter(
                (b) =>
                  b.preferredVenuesOrder.includes(venue.id) &&
                  !assignedUserIds.has(b.id)
              );
              const barbacksToAssign = Math.min(
                shift.barbacksRequired,
                Math.min(availableBarbacks.length, 2)
              );
              for (let i = 0; i < barbacksToAssign; i++) {
                const barback =
                  availableBarbacks[
                    Math.floor(Math.random() * availableBarbacks.length)
                  ];
                if (barback && !assignedUserIds.has(barback.id)) {
                  await prisma.shiftAssignment.create({
                    data: {
                      shiftId: shift.id,
                      userId: barback.id,
                      role: 'BARBACK',
                      isLead: false,
                    },
                  });
                  assignedUserIds.add(barback.id);
                }
              }
            }
          } catch (error) {
            console.error(
              `   ✗ Failed to create shift for ${venue.name} on ${date.toDateString()}:`,
              error
            );
          }
        }
      }
    }
  }

  console.log(`   ✅ Created ${shiftCount} shifts with assignments\n`);

  console.log('\n🎉 Demo Data Seed Complete!');
  console.log('\n📝 Demo Login Credentials (for test.jschedules.com):');
  console.log('   Manager:   manager@demo.com / demo123');
  console.log('   Bartender: bartender@demo.com / demo123');
  console.log('   Barback:   barback@demo.com / demo123');
  console.log('\n🌐 Demo Environment:');
  console.log('   Navigate to: https://test.jschedules.com');
  console.log('   Log in with any demo account above to explore features');
  console.log('\n📊 Demo Data Summary:');
  console.log(`   • ${venues.length} Venues`);
  console.log(`   • ${bartenders.length} Bartenders (${bartenderLeads} leads)`);
  console.log(`   • ${barbacks.length} Barbacks`);
  console.log(`   • ${shiftCount} Shifts created`);
  console.log('\n✨ Ready for sales demos on test.jschedules.com!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
