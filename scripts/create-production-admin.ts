/**
 * Script to create a production admin account
 *
 * Usage:
 * 1. Set your DATABASE_URL in .env.production or pass as env var
 * 2. Run: npx tsx scripts/create-production-admin.ts <email> <password> <name>
 *
 * Example:
 * npx tsx scripts/create-production-admin.ts admin@jschedules.com securepassword123 "Production Admin"
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Production Admin';

  if (!email || !password) {
    console.error(
      '❌ Usage: npx tsx scripts/create-production-admin.ts <email> <password> [name]'
    );
    console.error(
      '   Example: npx tsx scripts/create-production-admin.ts admin@jschedules.com mypassword "Admin Name"'
    );
    process.exit(1);
  }

  console.log('🔐 Creating production admin account...');
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${name}`);

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  User already exists. Updating to SUPER_ADMIN...');

      const hashedPassword = await hash(password, 12);
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          name,
          hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });

      console.log('✅ Updated existing user to SUPER_ADMIN');
      console.log(`   User ID: ${updatedUser.id}`);
    } else {
      const hashedPassword = await hash(password, 12);

      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          hasDayJob: false,
          isLead: false,
          preferredVenuesOrder: [],
        },
      });

      console.log('✅ Created new SUPER_ADMIN account');
      console.log(`   User ID: ${newUser.id}`);
    }

    console.log('\n🎉 Admin account ready!');
    console.log(`\n📝 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Save these credentials securely!');
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
