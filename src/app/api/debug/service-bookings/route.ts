import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const authToken = getAuthTokenFromRequest(request);
    
    // Basic auth info
    const authInfo = {
      hasToken: !!authToken,
      tokenValue: authToken ? `${authToken.split('_')[0]}_[HIDDEN]` : null,
    };
    
    // Get all service bookings for debugging
    const serviceBookings = await query(
      `SELECT * FROM service_bookings ORDER BY created_at DESC LIMIT 10`
    ) as any[];
    
    // If we have a token, filter by user ID
    if (authToken) {
      const [userId, accountType] = authToken.split('_');
      
      // Add user ID and account type to response
      authInfo.userId = userId;
      authInfo.accountType = accountType;
      
      // Get user's service bookings
      const userServiceBookings = await query(
        `SELECT * FROM service_bookings WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC`,
        [userId, Number(userId)]
      ) as any[];
      
      return NextResponse.json({
        auth: authInfo,
        allServiceBookings: serviceBookings,
        userServiceBookings: userServiceBookings,
        userServiceBookingsCount: userServiceBookings.length
      });
    }
    
    return NextResponse.json({
      auth: authInfo,
      allServiceBookings: serviceBookings,
      message: 'No auth token found, showing all service bookings'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Error fetching service bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
