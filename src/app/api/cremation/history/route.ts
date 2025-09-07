import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Enforce authentication and scope to the authenticated business provider
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const providerRow = await query(
      'SELECT provider_id as id FROM service_providers WHERE user_id = ? LIMIT 1',
      [user.userId]
    ) as any[];
    if (!providerRow || providerRow.length === 0) {
      return NextResponse.json({ error: 'Provider not found for user' }, { status: 404 });
    }
    const providerId = providerRow[0].id;

    // Get query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all';

    // Build the SQL date range condition based on the period
    let dateCondition = '';
    const queryParams: any[] = [providerId];

    if (period === 'last7days') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'last30days') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'last90days') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    } else if (period === 'last6months') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
    } else if (period === 'thisyear') {
      dateCondition = 'AND YEAR(sb.booking_date) = YEAR(CURDATE())';
    }

    // Check if the service_bookings table exists
    let useServiceBookings = true;
    try {
      await query('SELECT 1 FROM service_bookings LIMIT 1');
    } catch {
      useServiceBookings = false;
    }

    // If service_bookings table doesn't exist, try to use bookings table as fallback
    if (!useServiceBookings) {
      try {
        await query('SELECT 1 FROM bookings LIMIT 1');
        
        // Use bookings table instead
        const bookingsQuery = `
          SELECT b.id, b.status, b.created_at as booking_date, 
                 COALESCE(b.total_price, b.total_amount, b.amount, 0) as price,
                 0 as delivery_fee, b.pet_name, b.pet_type,
                 u.first_name, u.last_name,
                 'Cremation Service' as package_name
          FROM bookings b
          JOIN users u ON b.user_id = u.user_id
          WHERE b.provider_id = ?
          ${dateCondition.replace('sb.booking_date', 'b.created_at')}
          ORDER BY b.created_at DESC
        `;

        const bookingsResult = await query(bookingsQuery, queryParams) as any[];

        // Calculate stats for bookings table
        const totalBookings = bookingsResult.length;
        const completedBookings = bookingsResult.filter(b => b.status === 'completed').length;
        const cancelledBookings = bookingsResult.filter(b => b.status === 'cancelled').length;
        const totalRevenue = bookingsResult
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + parseFloat(b.price || 0), 0);

        const formattedBookings = bookingsResult.map((booking: any) => ({
          id: booking.id,
          petName: booking.pet_name || 'Unknown',
          petType: booking.pet_type || 'Unknown',
          owner: `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Unknown',
          package: booking.package_name || 'Cremation Service',
          status: booking.status,
          createdAt: formatDate(booking.booking_date),
          scheduledDate: 'Not scheduled',
          amount: parseFloat(booking.price || 0),
          price: parseFloat(booking.price || 0),
          paymentMethod: 'Not specified'
        }));

        return NextResponse.json({
          bookings: formattedBookings,
          stats: {
            totalBookings,
            completedBookings,
            cancelledBookings,
            totalRevenue,
            averageRevenue: completedBookings > 0 ? totalRevenue / completedBookings : 0
          }
        });

      } catch {
        // No booking tables found, return empty data
        return NextResponse.json({
          bookings: [],
          stats: {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            totalRevenue: 0,
            averageRevenue: 0
          }
        });
      }
    }

    // Query to get bookings - include ALL statuses, not just completed or cancelled
    const bookingsQuery = `
      SELECT sb.id, sb.status, sb.booking_date, sb.price,
             sb.delivery_fee, sb.pet_name, sb.pet_type,
             u.first_name, u.last_name,
             p.name as package_name
      FROM service_bookings sb
      JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN service_packages p ON sb.package_id = p.package_id
      WHERE sb.provider_id = ?
      ${dateCondition}
      ORDER BY sb.booking_date DESC
    `;

    const bookingsResult = await query(bookingsQuery, queryParams) as any[];

    // Get stats
    const totalBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings sb
      WHERE sb.provider_id = ? ${dateCondition}
    `;

    const completedBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings sb
      WHERE sb.provider_id = ? AND sb.status = 'completed' ${dateCondition}
    `;

    const cancelledBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings sb
      WHERE sb.provider_id = ? AND sb.status = 'cancelled' ${dateCondition}
    `;

    const totalRevenueQuery = `
      SELECT COALESCE(SUM(sb.price + IFNULL(sb.delivery_fee, 0)), 0) as total FROM service_bookings sb
      WHERE sb.provider_id = ? AND sb.status = 'completed' ${dateCondition}
    `;

    const [totalBookingsResult, completedBookingsResult, cancelledBookingsResult, totalRevenueResult] = await Promise.all([
      query(totalBookingsQuery, queryParams) as Promise<any[]>,
      query(completedBookingsQuery, queryParams) as Promise<any[]>,
      query(cancelledBookingsQuery, queryParams) as Promise<any[]>,
      query(totalRevenueQuery, queryParams) as Promise<any[]>
    ]);

    const totalBookings = totalBookingsResult[0].count || 0;
    const completedBookings = completedBookingsResult[0].count || 0;
    const cancelledBookings = cancelledBookingsResult[0].count || 0;
    const totalRevenue = parseFloat(totalRevenueResult[0].total) || 0;
    const averageRevenue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    // Format the booking data for response
    const formattedBookings = bookingsResult.map((booking: any) => ({
      id: booking.id,
      petName: booking.pet_name || 'Unknown',
      petType: booking.pet_type || 'Unknown',
      owner: `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Unknown',
      package: booking.package_name || 'Unknown Package',
      status: booking.status,
      date: formatDate(booking.booking_date),
      amount: parseFloat(booking.price || 0) + parseFloat(booking.delivery_fee || 0)
    }));


    return NextResponse.json({
      bookings: formattedBookings,
      stats: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        averageRevenue
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch booking history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Not scheduled';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
