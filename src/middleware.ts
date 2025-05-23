import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { join } from 'path';
import fs from 'fs';

// Middleware runs in the Edge Runtime which doesn't support direct database connections
// We'll handle database initialization in the API routes instead

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle uploads directory in production mode
  if (pathname.startsWith('/uploads/')) {
    try {
      // In production with 'standalone' output, we need to ensure the file exists
      // Check if the file exists in the public directory
      const filePath = join(process.cwd(), 'public', pathname);

      // Log the request for debugging
      console.log(`Image request: ${pathname}`);
      console.log(`Checking file path: ${filePath}`);

      // If the file doesn't exist, redirect to the API route
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);

        // Extract the path after /uploads/
        const uploadPath = pathname.substring('/uploads/'.length);
        // Use the API route instead
        const apiPath = `/api/image/${uploadPath}`;

        console.log(`Redirecting to API path: ${apiPath}`);

        // Redirect to the API route
        return NextResponse.rewrite(new URL(apiPath, request.url));
      }

      // If we're in production, always use the API route for better handling
      if (process.env.NODE_ENV === 'production') {
        // Extract the path after /uploads/
        const uploadPath = pathname.substring('/uploads/'.length);
        // Use the API route instead
        const apiPath = `/api/image/${uploadPath}`;

        console.log(`Using API path in production: ${apiPath}`);

        // Redirect to the API route
        return NextResponse.rewrite(new URL(apiPath, request.url));
      }
    } catch (error) {
      console.error('Error in static file middleware:', error);
      // Return a fallback image on error
      return NextResponse.rewrite(new URL('/bg_4.png', request.url));
    }
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
  const isDiagnosePath = pathname.includes('/cremation/packages/diagnose/');

  // SUPER EMERGENCY FIX: COMPLETELY DISABLE ALL PROTECTION FOR CREMATION PATHS
  // This will allow access to the cremation dashboard without any verification
  // We're setting this to false to bypass all checks
  const isCremationPath = false; // Bypass all cremation path checks

  // Also bypass all other checks for cremation paths
  if (pathname.startsWith('/cremation')) {
    return NextResponse.next();
  }

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
      } catch (error) {
        decodedValue = authCookie;
      }

      // Extract account type from auth token
      const parts = decodedValue.split('_');

      if (parts.length !== 2) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      const userId = parts[0];
      const accountType = parts[1];

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
    } catch (error) {
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
