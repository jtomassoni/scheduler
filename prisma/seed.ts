import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin
  const superAdminPassword = await hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@scheduler.local' },
    update: {},
    create: {
      email: 'admin@scheduler.local',
      name: 'Super Admin',
      hashedPassword: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
    },
  });
  console.log('✅ Created Super Admin:', superAdmin.email);

  // Create Manager
  const managerPassword = await hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@scheduler.local' },
    update: {},
    create: {
      email: 'manager@scheduler.local',
      name: 'Test Manager',
      hashedPassword: managerPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: true,
      preferredVenuesOrder: [],
    },
  });
  console.log('✅ Created Manager:', manager.email);

  // Create Bartender
  const bartenderPassword = await hash('bartender123', 12);
  const bartender = await prisma.user.upsert({
    where: { email: 'bartender@scheduler.local' },
    update: {},
    create: {
      email: 'bartender@scheduler.local',
      name: 'Test Bartender',
      hashedPassword: bartenderPassword,
      role: 'BARTENDER',
      status: 'ACTIVE',
      hasDayJob: true,
      dayJobCutoff: '16:59',
      isLead: true,
      preferredVenuesOrder: [],
    },
  });
  console.log('✅ Created Bartender:', bartender.email);

  // Create Barback
  const barbackPassword = await hash('barback123', 12);
  const barback = await prisma.user.upsert({
    where: { email: 'barback@scheduler.local' },
    update: {},
    create: {
      email: 'barback@scheduler.local',
      name: 'Test Barback',
      hashedPassword: barbackPassword,
      role: 'BARBACK',
      status: 'ACTIVE',
      hasDayJob: false,
      isLead: false,
      preferredVenuesOrder: [],
    },
  });
  console.log('✅ Created Barback:', barback.email);

  // Create a test venue
  const venue = await prisma.venue.upsert({
    where: { id: 'test-venue-1' },
    update: {},
    create: {
      id: 'test-venue-1',
      name: 'Downtown Bar',
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
  console.log('✅ Created Venue:', venue.name);

  console.log('\n🎉 Seed completed!');
  console.log('\n📝 Test accounts:');
  console.log('   Super Admin: admin@scheduler.local / admin123');
  console.log('   Manager: manager@scheduler.local / manager123');
  console.log('   Bartender: bartender@scheduler.local / bartender123');
  console.log('   Barback: barback@scheduler.local / barback123');
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

