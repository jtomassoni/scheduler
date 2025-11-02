import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public paths that don't require authentication - allow immediately
  if (path === '/login' || path === '/') {
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token || !('role' in token)) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Super Admin only routes
  if (path.startsWith('/admin')) {
    if (token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Manager+ routes (Manager or General Manager only - Super Admin has separate admin routes)
  if (
    path.startsWith('/venues/create') ||
    path.startsWith('/shifts/create') ||
    path.startsWith('/reports')
  ) {
    if (token.role !== 'MANAGER' && token.role !== 'GENERAL_MANAGER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
