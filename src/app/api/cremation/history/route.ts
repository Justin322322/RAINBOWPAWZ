import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // For testing/development, we'll use a hardcoded provider ID if auth fails
    let providerId;

    try {
      // Get the authenticated user
      const session = await getServerSession();
      if (!session || !session.user) {
      } else {
        // Get the provider ID from the user session
        const userId = session.user.id;

        // Fetch provider ID from the service_providers table for this user
        const userQuery = `
          SELECT provider_id as id FROM service_providers WHERE user_id = ?
        `;
        const userResult = await query(userQuery, [userId]) as any[];

        if (userResult && userResult.length > 0) {
          providerId = userResult[0].id;
        } else {
        }
      }
    } catch (authError) {
    }

    if (!providerId) {
      // If we couldn't get a provider ID from the session, get the first provider ID from the database
      const providerQuery = `SELECT provider_id as id FROM service_providers LIMIT 1`;
      const providerResult = await query(providerQuery) as any[];

      if (!providerResult || providerResult.length === 0) {
        return NextResponse.json({
          error: 'No service providers found in the database'
        }, { status: 404 });
      }

      providerId = providerResult[0].id;
    }

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

    // First, check if the service_bookings table exists
    const tablesCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_bookings'
    `;
    const tablesResult = await query(tablesCheckQuery) as any[];

    // If the service_bookings table doesn't exist, create it
    if (!tablesResult || tablesResult.length === 0) {
      try {
        // Read the SQL file content
        const sqlFilePath = path.join(process.cwd(), 'src', 'database', 'migrations', 'create_service_bookings_table.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Execute the SQL to create the table
        await query(sqlContent);

        // Return empty data since the table was just created
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
      } catch (createError) {
        console.error('Error creating service_bookings table:', createError);
        return NextResponse.json({
          error: 'Failed to create service_bookings table',
          message: createError instanceof Error ? createError.message : 'Unknown error'
        }, { status: 500 });
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
      SELECT COUNT(*) as count FROM service_bookings
      WHERE provider_id = ? ${dateCondition}
    `;

    const completedBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings
      WHERE provider_id = ? AND status = 'completed' ${dateCondition}
    `;

    const cancelledBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings
      WHERE provider_id = ? AND status = 'cancelled' ${dateCondition}
    `;

    const totalRevenueQuery = `
      SELECT COALESCE(SUM(price + IFNULL(delivery_fee, 0)), 0) as total FROM service_bookings
      WHERE provider_id = ? AND status = 'completed' ${dateCondition}
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