import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest, parseAuthTokenAsync } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json({
        authenticated: false,
        message: 'No authentication token found'
      });
    }

    // Parse auth token to get user info
    const authData = await parseAuthTokenAsync(authToken);
    
    if (!authData) {
      return NextResponse.json({
        authenticated: false,
        message: 'Invalid authentication token'
      });
    }

    return NextResponse.json({
      authenticated: true,
      userId: authData.userId,
      accountType: authData.accountType
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check authentication'
    }, { status: 500 });
  }
}
