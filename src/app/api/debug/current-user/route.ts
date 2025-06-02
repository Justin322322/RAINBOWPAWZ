import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json({
        authenticated: false,
        message: 'No auth token found'
      });
    }

    // Parse auth token
    const [userId, accountType] = authToken.split('_');
    
    return NextResponse.json({
      authenticated: true,
      userId,
      accountType,
      authToken,
      cookies: request.cookies.getAll(),
      headers: {
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization')
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check current user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
