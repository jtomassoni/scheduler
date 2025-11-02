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
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error(
      'NEXTAUTH_SECRET is required but not set in environment variables'
    );
  }
  handler = NextAuth(authOptions);
} catch (error) {
  console.error('❌ Failed to initialize NextAuth:', error);
  console.error(
    '   Make sure NEXTAUTH_SECRET is set in Vercel environment variables'
  );

  // Create a fallback handler that returns error responses for all NextAuth routes
  const errorHandler = async () => {
    const errorMessage = process.env.NEXTAUTH_SECRET
      ? 'NextAuth initialization failed. Check server logs in Vercel dashboard under Functions tab.'
      : 'NEXTAUTH_SECRET is not configured. Go to Vercel → Project Settings → Environment Variables → Add NEXTAUTH_SECRET → Redeploy.';

    return NextResponse.json(
      {
        error: 'Authentication configuration error',
        message: errorMessage,
      },
      { status: 500 }
    );
  };

  // Wrap in NextAuth-compatible handler
  handler = errorHandler as any;
}

export { handler as GET, handler as POST };
