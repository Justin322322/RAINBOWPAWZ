import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Function to check if a path is protected
  const isProtectedPath = (path: string) => {
    // Admin routes
    if (path.startsWith('/admin') && path !== '/admin') {
      return true;
    }

    // Cremation center routes - exclude the pending-verification page
    if (path.startsWith('/cremation') &&
        path !== '/cremation' &&
        path !== '/cremation/pending-verification') {
      return true;
    }

    // Fur parent routes
    if (path.startsWith('/user') && path !== '/user') {
      return true;
    }

    return false;
  };

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname.includes('favicon.ico')) {
    return NextResponse.next();
  }

  // Check if the current path is protected
  if (isProtectedPath(pathname)) {
    console.log(`Middleware: Protected path detected: ${pathname}`);

    // Get the authentication cookie
    const authCookie = request.cookies.get('auth_token')?.value;

    // If no auth token exists, redirect to login page
    if (!authCookie) {
      console.log('Middleware: No auth token found, redirecting to login page');
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      console.log(`Middleware: Auth cookie found: ${authCookie}`);

      // Extract account type from auth token - no need to decode, we're storing it without encoding
      const parts = authCookie.split('_');

      if (parts.length !== 2) {
        console.log(`Middleware: Invalid auth token format: ${authCookie}`);
        return NextResponse.redirect(new URL('/', request.url));
      }

      const userId = parts[0];
      const accountType = parts[1];
      console.log(`Middleware: User ID: ${userId}, Account Type: ${accountType}`);

      // Validate account type based on the path
      if (pathname.startsWith('/admin') && accountType !== 'admin') {
        console.log(`Middleware: Access denied to admin path. Account type is ${accountType}, not admin`);
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (pathname.startsWith('/cremation') && accountType !== 'business') {
        console.log(`Middleware: Access denied to cremation path. Account type is ${accountType}, not business`);
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (pathname.startsWith('/user') && accountType !== 'user') {
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
  ],
};
