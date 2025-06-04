import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { decodeTokenUnsafe } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG AUTH START ===');
    
    // Check cookies
    const cookieHeader = request.headers.get('cookie');
    console.log('Cookie header:', cookieHeader);
    
    // Check authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header:', authHeader);
    
    // Try to get auth token
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token from request:', authToken);
    
    if (authToken) {
      // Try to parse the token
      if (authToken.includes('.')) {
        // JWT token
        const payload = decodeTokenUnsafe(authToken);
        console.log('JWT payload:', payload);
        
        return NextResponse.json({
          success: true,
          tokenType: 'JWT',
          token: authToken,
          payload: payload,
          cookieHeader: cookieHeader,
          authHeader: authHeader
        });
      } else if (authToken.includes('_')) {
        // Legacy format
        const [userId, accountType] = authToken.split('_');
        console.log('Legacy token - userId:', userId, 'accountType:', accountType);
        
        return NextResponse.json({
          success: true,
          tokenType: 'Legacy',
          token: authToken,
          userId: userId,
          accountType: accountType,
          cookieHeader: cookieHeader,
          authHeader: authHeader
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Invalid token format',
          token: authToken,
          cookieHeader: cookieHeader,
          authHeader: authHeader
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'No auth token found',
        cookieHeader: cookieHeader,
        authHeader: authHeader
      });
    }
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cookieHeader: request.headers.get('cookie'),
      authHeader: request.headers.get('authorization')
    });
  }
}
