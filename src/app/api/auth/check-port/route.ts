import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Get the current request URL info
    const url = new URL(request.url);
    const port = url.port;
    const host = url.hostname;
    
    // Check authentication
    const authResult = await verifySecureAuth(request);
    
    // Get cookies info
    const authCookie = request.cookies.get('auth_token');
    const csrfCookie = request.cookies.get('csrf_token');
    
    return NextResponse.json({
      success: true,
      requestInfo: {
        host,
        port,
        protocol: url.protocol,
        origin: url.origin
      },
      authentication: {
        isAuthenticated: !!authResult,
        userId: authResult?.userId || null,
        accountType: authResult?.accountType || null,
        // email removed from auth result for security
      },
      cookies: {
        hasAuthCookie: !!authCookie,
        hasCsrfCookie: !!csrfCookie,
        authCookieLength: authCookie?.value?.length || 0
      },
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
} 
