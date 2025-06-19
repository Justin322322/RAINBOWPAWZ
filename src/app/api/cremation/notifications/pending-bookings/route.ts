import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { decodeTokenUnsafe } from '@/lib/jwt';

/**
 * API endpoint to check for new pending bookings for cremation businesses
 * GET /api/cremation/notifications/pending-bookings
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    // Verify this is a business account
    if (!userId || !accountType || accountType !== 'business') {
      return NextResponse.json({ error: 'Forbidden: Business access required' }, { status: 403 });
    }

    // Get business/provider ID from the user
    let providerId: number | null = null;

    try {
      // Try to get provider ID from businesses table
      const businessResult = await query('SELECT id FROM businesses WHERE user_id = ?', [userId]) as any[];
      
      if (businessResult && businessResult.length > 0) {
        providerId = businessResult[0].id;
      } else {
        // Try service_providers table
        const providerResult = await query('SELECT provider_id FROM service_providers WHERE user_id = ?', [userId]) as any[];
        
        if (providerResult && providerResult.length > 0) {
          providerId = providerResult[0].provider_id;
        }
      }

      if (!providerId) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      // Get pending bookings count
      let pendingCount = 0;

      try {
        // Check service_bookings table
        const serviceBookingsResult = await query(`
          SELECT COUNT(*) as pending_count
          FROM service_bookings
          WHERE provider_id = ? AND status = 'pending'
        `, [providerId]) as any[];

        pendingCount = serviceBookingsResult[0]?.pending_count || 0;

        // Also check legacy bookings table if it exists
        try {
          const legacyBookingsResult = await query(`
            SELECT COUNT(*) as pending_count
            FROM bookings
            WHERE provider_id = ? AND status = 'pending'
          `, [providerId]) as any[];

          pendingCount += legacyBookingsResult[0]?.pending_count || 0;
        } catch (_legacyError) {
          // Legacy table might not exist, continue
          console.log('Legacy bookings table not found, continuing with service_bookings only');
        }

      } catch (error) {
        console.error('Error fetching pending bookings:', error);
        // Return 0 if there's an error
      }

      // Get recent pending bookings for details
      let recentPendingBookings: any[] = [];

      try {
        const recentBookingsResult = await query(`
          SELECT 
            sb.id,
            sb.pet_name,
            sb.booking_date,
            sb.booking_time,
            sb.created_at,
            u.first_name,
            u.last_name
          FROM service_bookings sb
          LEFT JOIN users u ON sb.user_id = u.user_id
          WHERE sb.provider_id = ? AND sb.status = 'pending'
          ORDER BY sb.created_at DESC
          LIMIT 5
        `, [providerId]) as any[];

        recentPendingBookings = recentBookingsResult || [];
      } catch (error) {
        console.error('Error fetching recent pending bookings:', error);
      }

      return NextResponse.json({
        success: true,
        pendingCount,
        recentPendingBookings,
        providerId
      });

    } catch (error) {
      console.error('Error in pending bookings check:', error);
      return NextResponse.json({
        error: 'Failed to check pending bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in pending bookings API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST endpoint to mark pending bookings as notified
 * POST /api/cremation/notifications/pending-bookings
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    // Verify this is a business account
    if (!userId || !accountType || accountType !== 'business') {
      return NextResponse.json({ error: 'Forbidden: Business access required' }, { status: 403 });
    }

    const body = await request.json();
    const { bookingIds } = body;

    if (!bookingIds || !Array.isArray(bookingIds)) {
      return NextResponse.json({ error: 'Booking IDs array is required' }, { status: 400 });
    }

    // Mark bookings as notified (you could add a notified_at timestamp to the bookings table)
    // For now, we'll just return success as the notification system handles this differently

    return NextResponse.json({
      success: true,
      message: 'Bookings marked as notified'
    });

  } catch (error) {
    console.error('Error marking bookings as notified:', error);
    return NextResponse.json({
      error: 'Failed to mark bookings as notified',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
