import { NextRequest, NextResponse } from 'next/server';

// Add any paths that require authentication here
const protectedPaths = [
  '/dashboard',
  '/projects',
  '/admin'
];

// Add any paths that require admin access here
const adminPaths = [
  '/admin'
];

// Add API paths that require authentication
const protectedAPIPaths = [
  '/api/auth/me',
  '/api/auth/profile',
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/projects',
  '/api/admin'
];

// Add API paths that require admin access
const adminAPIPaths = [
  '/api/admin'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes and static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/test-register') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/documents') || // Legacy compatibility
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register'
  ) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    const isProtectedAPI = protectedAPIPaths.some(path => pathname.startsWith(path));
    const isAdminAPI = adminAPIPaths.some(path => pathname.startsWith(path));

    if (isProtectedAPI || isAdminAPI) {
      // Check for authorization header
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Access denied. No token provided.' },
          { status: 401 }
        );
      }

      // For admin APIs, we'll let the API route handle admin verification
      // since we need to decode the JWT to check the role
    }

    return NextResponse.next();
  }

  // Handle page routes - let client-side handle auth checks
  // This allows the React components to check authentication and redirect appropriately
  const isProtectedPage = protectedPaths.some(path => pathname.startsWith(path));
  const isAdminPage = adminPaths.some(path => pathname.startsWith(path));

  if (isProtectedPage || isAdminPage) {
    // For page routes, we'll let the client-side authentication handle redirects
    // This prevents middleware from interfering with client-side auth state
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
