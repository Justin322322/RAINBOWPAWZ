import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { decodeTokenUnsafe } from '@/lib/jwt';

/**
 * API endpoint to check for pending bookings and create notifications
 * GET /api/cremation/notifications/check-pending
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
      // Try to get provider ID from service_providers table
      const providerResult = await query('SELECT provider_id FROM service_providers WHERE user_id = ?', [userId]) as any[];
      
      if (providerResult && providerResult.length > 0) {
        providerId = providerResult[0].provider_id;
      }

      if (!providerId) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      // Get pending bookings count and details
      let pendingBookings: any[] = [];
      let pendingCount = 0;

      try {
        // Check service_bookings table for pending bookings
        const serviceBookingsResult = await query(`
          SELECT 
            sb.id,
            sb.pet_name,
            sb.pet_type,
            sb.booking_date,
            sb.booking_time,
            sb.created_at,
            sb.price,
            u.first_name,
            u.last_name,
            sp.name as package_name
          FROM service_bookings sb
          LEFT JOIN users u ON sb.user_id = u.user_id
          LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
          WHERE sb.provider_id = ? AND sb.status = 'pending'
          ORDER BY sb.created_at DESC
        `, [providerId]) as any[];

        pendingBookings = serviceBookingsResult || [];
        pendingCount = pendingBookings.length;

        // Also check legacy bookings table if it exists
        try {
          const legacyBookingsResult = await query(`
            SELECT 
              b.booking_id as id,
              p.name as pet_name,
              p.species as pet_type,
              b.booking_date,
              b.booking_time,
              b.created_at,
              b.total_price as price,
              u.first_name,
              u.last_name,
              sp.name as package_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            LEFT JOIN pets p ON b.pet_id = p.pet_id
            LEFT JOIN service_packages sp ON b.package_id = sp.package_id
            WHERE b.provider_id = ? AND b.status = 'pending'
            ORDER BY b.created_at DESC
          `, [providerId]) as any[];

          if (legacyBookingsResult && legacyBookingsResult.length > 0) {
            pendingBookings = [...pendingBookings, ...legacyBookingsResult];
            pendingCount += legacyBookingsResult.length;
          }
        } catch (_legacyError) {
          // Legacy table might not exist, continue
          console.log('Legacy bookings table not found, continuing with service_bookings only');
        }

      } catch (error) {
        console.error('Error fetching pending bookings:', error);
        return NextResponse.json({ error: 'Failed to fetch pending bookings' }, { status: 500 });
      }

      // If there are pending bookings, create notifications
      if (pendingCount > 0) {
        // Check if we already have recent notifications for pending bookings to avoid spam
        const recentNotifications = await query(`
          SELECT COUNT(*) as count
          FROM notifications
          WHERE user_id = ? 
          AND title LIKE '%Pending%' 
          AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, [userId]) as any[];

        const hasRecentNotification = recentNotifications[0]?.count > 0;

        if (!hasRecentNotification) {
          // Create notification for pending bookings
          try {
            await query(
              `INSERT INTO notifications (user_id, title, message, type, link)
               VALUES (?, ?, ?, ?, ?)`,
              [
                userId,
                'Pending Bookings Reminder',
                `You have ${pendingCount} pending ${pendingCount === 1 ? 'booking' : 'bookings'} waiting for your review.`,
                'warning',
                '/cremation/bookings?status=pending'
              ]
            );
          } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        }
      }

      return NextResponse.json({
        success: true,
        pendingCount,
        pendingBookings: pendingBookings.slice(0, 5), // Return only first 5 for preview
        providerId,
        notificationCreated: pendingCount > 0
      });

    } catch (error) {
      console.error('Error in check-pending endpoint:', error);
      return NextResponse.json({
        error: 'Failed to check pending bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in check-pending endpoint:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
