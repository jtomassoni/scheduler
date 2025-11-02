import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Validate required environment variables at build/runtime
if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET is not set in environment variables');
  console.error(
    '   This is required for NextAuth to work. Please set it in your Vercel environment variables.'
  );
}

if (!process.env.NEXTAUTH_URL) {
  console.warn(
    '⚠️  NEXTAUTH_URL is not set - this may cause issues in production'
  );
  console.warn(
    '   Set it to your Vercel deployment URL: https://your-app.vercel.app'
  );
}

let handler: ReturnType<typeof NextAuth>;

try {
  handler = NextAuth(authOptions);
} catch (error) {
  console.error('Failed to initialize NextAuth:', error);
  // Create a fallback handler that returns error responses
  const errorHandler = async () => {
    return NextResponse.json(
      {
        error: 'Authentication configuration error',
        message: process.env.NEXTAUTH_SECRET
          ? 'NextAuth initialization failed. Check server logs.'
          : 'NEXTAUTH_SECRET is not configured. Please set it in environment variables.',
      },
      { status: 500 }
    );
  };
  handler = errorHandler as any;
}

export { handler as GET, handler as POST };
