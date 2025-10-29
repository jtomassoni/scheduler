import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Public paths that don't require authentication
    if (path === '/login' || path === '/') {
      return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Super Admin only routes
    if (path.startsWith('/admin')) {
      if (token.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Manager+ routes (Manager or Super Admin)
    if (
      path.startsWith('/venues/create') ||
      path.startsWith('/shifts/create') ||
      path.startsWith('/reports')
    ) {
      if (token.role !== 'MANAGER' && token.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Allow access to home and login without token
        if (path === '/' || path === '/login') {
          return true;
        }
        // Require token for all other routes
        return !!token;
      },
    },
  }
);

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

