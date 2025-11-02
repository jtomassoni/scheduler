import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(
    '🔧 Updating barback to work for Mission Ballroom and Bluebird...'
  );

  // Get Mission Ballroom venue
  const missionBallroom = await prisma.venue.findUnique({
    where: { id: 'mission-ballroom' },
  });

  if (!missionBallroom) {
    console.error('❌ Mission Ballroom venue not found! Run seed first.');
    return;
  }

  // Create or get Bluebird venue
  const bluebird = await prisma.venue.upsert({
    where: { id: 'bluebird' },
    update: {},
    create: {
      id: 'bluebird',
      name: 'Bluebird',
      isNetworked: true,
      priority: 2,
      availabilityDeadlineDay: 10,
      tipPoolEnabled: true,
      createdById:
        (
          await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
          })
        )?.id || '',
      managers: {
        connect: [
          {
            id:
              (
                await prisma.user.findFirst({
                  where: { role: 'MANAGER' },
                })
              )?.id || '',
          },
        ],
      },
    },
  });
  console.log('✅ Venue Bluebird ready');

  // Update barback
  const barback = await prisma.user.findUnique({
    where: { email: 'barback@test.com' },
  });

  if (!barback) {
    console.error('❌ Barback user not found! Run seed first.');
    return;
  }

  await prisma.user.update({
    where: { id: barback.id },
    data: {
      preferredVenuesOrder: [missionBallroom.id, bluebird.id],
    },
  });
  console.log(
    '✅ Updated Test Barback to work at Mission Ballroom and Bluebird'
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
