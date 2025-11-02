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

        // ============================================
        // FALLBACK SUPERADMIN ACCOUNT (Environment Variables)
        // ============================================
        // This account is configured via environment variables and always available
        // regardless of database state. Use for emergency access.
        //
        // Set in Vercel: FALLBACK_ADMIN_USERNAME and FALLBACK_ADMIN_PASSWORD
        // Can also support multiple: FALLBACK_ADMINS=user1:pass1,user2:pass2
        //
        // WARNING: This is a fallback account. Do not use for regular operations.
        // ============================================

        // Check single fallback admin from env vars
        const fallbackUsername = process.env.FALLBACK_ADMIN_USERNAME;
        const fallbackPassword = process.env.FALLBACK_ADMIN_PASSWORD;

        if (
          fallbackUsername &&
          fallbackPassword &&
          loginInput.toLowerCase() === fallbackUsername.toLowerCase() &&
          credentials.password === fallbackPassword
        ) {
          return {
            id: 'system-admin-fallback-id',
            email: `${fallbackUsername}@system.admin`,
            name: `${fallbackUsername} (System Fallback)`,
            role: 'SUPER_ADMIN' as Role,
          };
        }

        // Check multiple fallback admins from FALLBACK_ADMINS env var
        // Format: FALLBACK_ADMINS=username1:password1,username2:password2
        const fallbackAdmins = process.env.FALLBACK_ADMINS;
        if (fallbackAdmins) {
          const adminPairs = fallbackAdmins
            .split(',')
            .map((pair) => pair.trim());
          for (const pair of adminPairs) {
            const [username, password] = pair.split(':').map((s) => s.trim());
            if (
              username &&
              password &&
              loginInput.toLowerCase() === username.toLowerCase() &&
              credentials.password === password
            ) {
              return {
                id: `system-admin-fallback-${username.toLowerCase()}`,
                email: `${username}@system.admin`,
                name: `${username} (System Fallback)`,
                role: 'SUPER_ADMIN' as Role,
              };
            }
          }
        }

        const loginInputLower = loginInput.toLowerCase();

        // ============================================
        // REGULAR DATABASE USER AUTHENTICATION
        // ============================================
        let user = null;

        try {
          if (loginInputLower.includes('@')) {
            // It's an email - search directly
            user = await prisma.user.findUnique({
              where: { email: loginInputLower },
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
              where: { email: `${loginInputLower}@test.com` },
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
        } catch (error) {
          // If database is unavailable, fallback admin still works
          // For regular users, throw error
          throw new Error(
            'Database connection error. Use fallback admin if needed.'
          );
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
