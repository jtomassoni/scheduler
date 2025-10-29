import { hash } from 'bcryptjs';
import { prisma } from './prisma';
import { Role, UserStatus } from '@prisma/client';

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  hasDayJob?: boolean;
  dayJobCutoff?: string;
  isLead?: boolean;
}

/**
 * Create a new user with hashed password
 */
export async function createUser(input: CreateUserInput) {
  const hashedPassword = await hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      hashedPassword,
      role: input.role,
      status: 'ACTIVE',
      hasDayJob: input.hasDayJob ?? false,
      dayJobCutoff: input.dayJobCutoff ?? null,
      isLead: input.isLead ?? false,
      preferredVenuesOrder: [],
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  return user;
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: string, newPassword: string) {
  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
  });
}

/**
 * Invite a new user (creates with PENDING status)
 */
export async function inviteUser(input: Omit<CreateUserInput, 'password'>) {
  // Generate a temporary password (should be sent via email)
  const tempPassword = Math.random().toString(36).slice(-12);
  const hashedPassword = await hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      hashedPassword,
      role: input.role,
      status: 'PENDING',
      hasDayJob: input.hasDayJob ?? false,
      dayJobCutoff: input.dayJobCutoff ?? null,
      isLead: input.isLead ?? false,
      preferredVenuesOrder: [],
    },
  });

  return { user, tempPassword };
}

