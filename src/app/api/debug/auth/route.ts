import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const authToken = getAuthTokenFromRequest(request);
    
    // Basic auth info
    const authInfo = {
      hasToken: !!authToken,
      tokenValue: authToken ? `${authToken.split('_')[0]}_[HIDDEN]` : null,
      cookieHeader: request.headers.get('cookie') || 'No cookie header'
    };
    
    // If we have a token, get more details
    if (authToken) {
      const [userId, accountType] = authToken.split('_');
      
      // Add user ID and account type to response
      authInfo.userId = userId;
      authInfo.accountType = accountType;
      
      // Check if user exists in database
      try {
        const userResult = await query(
          `SELECT id, first_name, last_name, email, role, is_otp_verified
           FROM users WHERE id = ? LIMIT 1`,
          [userId]
        ) as any[];
        
        if (userResult && userResult.length > 0) {
          authInfo.userExists = true;
          authInfo.userRole = userResult[0].role;
          authInfo.userVerified = userResult[0].is_otp_verified === 1;
        } else {
          authInfo.userExists = false;
        }
      } catch (dbError) {
        authInfo.dbError = (dbError as Error).message;
      }
      
      // Check for bookings
      try {
        // Check service_bookings table
        const serviceBookingsResult = await query(
          `SELECT COUNT(*) as count FROM service_bookings WHERE user_id = ?`,
          [userId]
        ) as any[];
        
        authInfo.serviceBookingsCount = serviceBookingsResult[0].count;
        
        // Check bookings table
        const bookingsResult = await query(
          `SELECT COUNT(*) as count FROM bookings WHERE user_id = ?`,
          [userId]
        ) as any[];
        
        authInfo.bookingsCount = bookingsResult[0].count;
      } catch (bookingsError) {
        authInfo.bookingsError = (bookingsError as Error).message;
      }
    }
    
    return NextResponse.json(authInfo);
  } catch (error) {
    return NextResponse.json({
      error: 'Error checking auth',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
