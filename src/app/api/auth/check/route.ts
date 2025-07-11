import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Use secure authentication verification
    const user = await verifySecureAuth(request);
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'No valid authentication found'
      }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.userId,
      accountType: user.accountType,
      email: user.email
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check authentication'
    }, { status: 500 });
  }
}

