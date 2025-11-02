import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const authOptions: NextAuthOptions = {
  // Adapter not needed for JWT strategy
  // adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Username or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const loginInput = credentials.email.trim();

        // Try to find user - first by exact email, then by username (if no @ symbol)
        let user = null;

        if (loginInput.includes('@')) {
          // It's an email - search directly
          user = await prisma.user.findUnique({
            where: { email: loginInput },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              hashedPassword: true,
            },
          });
        } else {
          // It's a username - try with @test.com appended (for test accounts)
          user = await prisma.user.findUnique({
            where: { email: `${loginInput}@test.com` },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              hashedPassword: true,
            },
          });
        }

        if (!user || !user.hashedPassword) {
          throw new Error('Invalid email or password');
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('Account is not active');
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

/**
 * Role-based authorization helpers
 */
export function requireRole(userRole: Role, ...allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN';
}

export function isManager(role: Role): boolean {
  return role === 'MANAGER' || role === 'GENERAL_MANAGER';
}

export function canManageShifts(role: Role): boolean {
  return role === 'MANAGER' || role === 'GENERAL_MANAGER';
}

export function canOverride(role: Role): boolean {
  return role === 'SUPER_ADMIN';
}

export function isGeneralManager(role: Role): boolean {
  return role === 'GENERAL_MANAGER' || role === 'SUPER_ADMIN';
}

export function isStaff(role: Role): boolean {
  return role === 'BARTENDER' || role === 'BARBACK';
}
