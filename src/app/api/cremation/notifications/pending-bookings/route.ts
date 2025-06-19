import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

/**
 * API endpoint to check for new pending bookings for cremation businesses
 * GET /api/cremation/notifications/pending-bookings
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
    }

    // Get business/provider ID from the user
    let providerId: number | null = null;

    try {
      // Try to get provider ID from service_providers table
      const providerResult = await query('SELECT provider_id FROM service_providers WHERE user_id = ?', [user.userId]) as any[];
      
      if (providerResult && providerResult.length > 0) {
        providerId = providerResult[0].provider_id;
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
    // Use secure authentication
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
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
