import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware runs in the Edge Runtime which doesn't support Node.js APIs
// We'll handle image serving through API routes for better compatibility

// Edge Runtime compatible JWT decoder (no verification, just parsing)
function decodeJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload);
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle uploads directory by redirecting to API route
  // This ensures consistent image serving in all environments
  if (pathname.startsWith('/uploads/')) {
    // Extract the path after /uploads/
    const uploadPath = pathname.substring('/uploads/'.length);
    // Use the API route for image serving
    return NextResponse.rewrite(new URL(`/api/image/${uploadPath}`, request.url));
  }

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname.includes('favicon.ico')) {
    return NextResponse.next();
  }

  // Define protected paths
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin';

  // Exclude diagnostic pages from protection
  const _isDiagnosePath = pathname.includes('/cremation/packages/diagnose/');

  // Define cremation paths that require business authentication
  const isCremationPath = pathname.startsWith('/cremation') && pathname !== '/cremation';

  const isUserPath = pathname.startsWith('/user') && pathname !== '/user';

  // Check if the current path is protected
  if (isAdminPath || isCremationPath || isUserPath) {
    // Get the authentication cookie
    const authCookie = request.cookies.get('auth_token')?.value;

    // If no auth token exists, redirect to login page
    if (!authCookie) {

      return NextResponse.redirect(new URL('/', request.url));
    }



    try {
      // Try to decode the cookie value if it's URI encoded
      let decodedValue;
      try {
        decodedValue = decodeURIComponent(authCookie);
      } catch {
        decodedValue = authCookie;
      }

      let userId: string;
      let accountType: string;

      // Check if it's a JWT token or old format
      if (decodedValue.includes('.')) {
        // JWT token format - decode without verification in middleware
        // (verification will be done server-side when needed)
        const payload = decodeJWTPayload(decodedValue);
        if (!payload) {
          // If we can't decode the JWT, redirect to login
          console.log('[Middleware] Could not decode JWT, redirecting to login');
          return NextResponse.redirect(new URL('/', request.url));
        }
        
        userId = payload.userId || payload.sub;
        accountType = payload.accountType || payload.account_type;
        
        // If we can't get basic info from JWT, redirect to login
        if (!userId || !accountType) {
          console.log('[Middleware] Missing userId or accountType in JWT, redirecting to login');
          return NextResponse.redirect(new URL('/', request.url));
        }
      } else {
        // Old format fallback
        const parts = decodedValue.split('_');
        if (parts.length !== 2) {
          return NextResponse.redirect(new URL('/', request.url));
        }
        userId = parts[0];
        accountType = parts[1];
      }

      // Validate account type based on the path
      if (isAdminPath && accountType !== 'admin') {

        return NextResponse.redirect(new URL('/', request.url));
      }

      if (isCremationPath && accountType !== 'business') {

        return NextResponse.redirect(new URL('/', request.url));
      }

      if (isUserPath && accountType !== 'user') {

        return NextResponse.redirect(new URL('/', request.url));
      }



      // Add the user info to headers for the client components
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', userId);
      requestHeaders.set('x-account-type', accountType);

      // Return the request with the modified headers
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      // If there's an error processing the token, redirect to home

      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Continue with the request if not a protected route
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Explicitly match uploads directory for static file handling
    '/uploads/:path*',
  ],
};
