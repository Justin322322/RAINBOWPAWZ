import { NextRequest, NextResponse } from 'next/server';
import { getSecureUserInfo } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Get user information from secure authentication
    const userInfo = getSecureUserInfo(request);

    if (!userInfo.isAuthenticated) {
      return NextResponse.json({
        authenticated: false,
        message: 'No valid authentication found'
      });
    }

    return NextResponse.json({
      authenticated: true,
      userId: userInfo.userId,
      accountType: userInfo.accountType,
      email: userInfo.email
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check authentication'
    }, { status: 500 });
  }
}
