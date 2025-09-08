import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

// Execute a query and return a safe fallback on error to avoid 500s
async function safeQuery<T>(sql: string, params: unknown[], fallback: T): Promise<T> {
  try {
    const result = (await query(sql, params)) as T;
    return result;
  } catch {
    return fallback;
  }
}

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
    const period = url.searchParams.get('period') || 'last30days';

    // Build the SQL date range condition based on the period
    let dateCondition = '';
    const queryParams: any[] = [providerId];

    if (period === 'last7days') {
      dateCondition = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'last30days') {
      dateCondition = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'last90days') {
      dateCondition = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    } else if (period === 'last6months') {
      dateCondition = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
    } else if (period === 'thisyear') {
      dateCondition = 'AND YEAR(b.booking_date) = YEAR(CURDATE())';
    }

    // Check if bookings table exists
    let useBookings = true;
    try {
      await query('SELECT 1 FROM bookings LIMIT 1');
      console.log('Using bookings table for reports');
    } catch (error) {
      console.log('Bookings table not accessible:', error);
      useBookings = false;
    }

    // Get refund data for the reports (safe fallback if table doesn't exist)
    const refundQuery = `
      SELECT 
        COUNT(*) as total_refunds,
        COALESCE(SUM(amount), 0) as total_refunded,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_refunds,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_refunds,
        COUNT(CASE WHEN refund_type = 'manual' THEN 1 END) as manual_refunds
      FROM refunds r
      ${useBookings ? `
        JOIN bookings b ON r.booking_id = b.id
        WHERE b.provider_id = ? ${dateCondition.replace('b.booking_date', 'r.initiated_at')}
      ` : `
        WHERE 1=0
      `}
    `;

    const refundData = await safeQuery<any[]>(refundQuery, queryParams, [{
      total_refunds: 0,
      total_refunded: 0,
      completed_refunds: 0,
      pending_refunds: 0,
      manual_refunds: 0,
    }]);

    let stats = {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      pendingBookings: 0,
      totalRevenue: 0,
      averageRevenue: 0,
      averageRating: 0
    };

    let topServices: any[] = [];

    if (useBookings) {
      // Use bookings table - change 'sb' to 'b' to match database structure
      const totalBookingsQuery = `
        SELECT COUNT(*) as count FROM bookings b
        WHERE b.provider_id = ? ${dateCondition}
      `;

      const completedBookingsQuery = `
        SELECT COUNT(*) as count FROM bookings b
        WHERE b.provider_id = ? AND b.status = 'completed' ${dateCondition}
      `;

      const cancelledBookingsQuery = `
        SELECT COUNT(*) as count FROM bookings b
        WHERE b.provider_id = ? AND b.status = 'cancelled' ${dateCondition}
      `;

      const pendingBookingsQuery = `
        SELECT COUNT(*) as count FROM bookings b
        WHERE b.provider_id = ? AND b.status IN ('pending', 'confirmed', 'in_progress') ${dateCondition}
      `;

      const totalRevenueQuery = `
        SELECT COALESCE(SUM(COALESCE(b.total_price, b.base_price, 0) + COALESCE(b.delivery_fee, 0)), 0) as total FROM bookings b
        WHERE b.provider_id = ? AND b.status = 'completed' ${dateCondition}
      `;

      const topServicesQuery = `
        SELECT 
          COALESCE(p.name, 'Unknown Service') as name,
          COUNT(b.id) as bookings,
          COALESCE(SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.total_price, b.base_price, 0) + COALESCE(b.delivery_fee, 0) ELSE 0 END), 0) as revenue
        FROM bookings b
        LEFT JOIN service_packages p ON b.package_id = p.package_id
        WHERE b.provider_id = ? ${dateCondition}
        GROUP BY p.package_id, p.name
        ORDER BY bookings DESC, revenue DESC
        LIMIT 5
      `;

      const [
        totalBookingsResult,
        completedBookingsResult,
        cancelledBookingsResult,
        pendingBookingsResult,
        totalRevenueResult,
        topServicesResult
      ] = await Promise.all([
        safeQuery<any[]>(totalBookingsQuery, queryParams, [{ count: 0 }]),
        safeQuery<any[]>(completedBookingsQuery, queryParams, [{ count: 0 }]),
        safeQuery<any[]>(cancelledBookingsQuery, queryParams, [{ count: 0 }]),
        safeQuery<any[]>(pendingBookingsQuery, queryParams, [{ count: 0 }]),
        safeQuery<any[]>(totalRevenueQuery, queryParams, [{ total: 0 }]),
        safeQuery<any[]>(topServicesQuery, queryParams, []),
      ]);

      stats = {
        totalBookings: totalBookingsResult[0]?.count || 0,
        completedBookings: completedBookingsResult[0]?.count || 0,
        cancelledBookings: cancelledBookingsResult[0]?.count || 0,
        pendingBookings: pendingBookingsResult[0]?.count || 0,
        totalRevenue: parseFloat(totalRevenueResult[0]?.total || '0'),
        averageRevenue: 0,
        averageRating: 0
      };

      stats.averageRevenue = stats.completedBookings > 0 ? stats.totalRevenue / stats.completedBookings : 0;

      topServices = topServicesResult.map((service: any) => ({
        name: service.name || 'Unknown Service',
        bookings: service.bookings || 0,
        revenue: parseFloat(service.revenue || '0')
      }));

    } else {
      // Fallback to bookings table or return empty data
      try {
        // Try to use bookings table with different date column
        const bookingsDateCondition = dateCondition.replace('b.booking_date', 'b.created_at');
        const bookingsQueryParams = queryParams.slice();

        const totalBookingsQuery = `
          SELECT COUNT(*) as count FROM bookings b
          WHERE b.provider_id = ? ${bookingsDateCondition}
        `;

        const completedBookingsQuery = `
          SELECT COUNT(*) as count FROM bookings b
          WHERE b.provider_id = ? AND b.status = 'completed' ${bookingsDateCondition}
        `;

        const [totalResult, completedResult] = await Promise.all([
          query(totalBookingsQuery, bookingsQueryParams) as Promise<any[]>,
          query(completedBookingsQuery, bookingsQueryParams) as Promise<any[]>
        ]);

        stats.totalBookings = totalResult[0]?.count || 0;
        stats.completedBookings = completedResult[0]?.count || 0;
      } catch {
        // If all else fails, return empty stats
        console.log('No booking tables found, returning empty stats');
      }
    }

    // Add refund data to stats
    const refundStats = refundData[0] || {
      total_refunds: 0,
      total_refunded: 0,
      completed_refunds: 0,
      pending_refunds: 0,
      manual_refunds: 0
    };

    return NextResponse.json({
      stats: {
        ...stats,
        totalRefunds: parseInt(refundStats.total_refunds),
        totalRefunded: parseFloat(refundStats.total_refunded),
        completedRefunds: parseInt(refundStats.completed_refunds),
        pendingRefunds: parseInt(refundStats.pending_refunds),
        manualRefunds: parseInt(refundStats.manual_refunds),
        refundRate: stats.totalBookings > 0 ? 
          ((parseInt(refundStats.total_refunds) / stats.totalBookings) * 100).toFixed(2) : '0'
      },
      topServices,
      monthlyData: [], // Could be implemented later
      recentActivity: [] // Could be implemented later
    });

  } catch (error) {
    console.error('Reports API error:', error);
    // Return safe fallback instead of 500 to avoid breaking the dashboard
    return NextResponse.json({
      stats: {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        averageRevenue: 0,
        averageRating: 0,
        totalRefunds: 0,
        totalRefunded: 0,
        completedRefunds: 0,
        pendingRefunds: 0,
        manualRefunds: 0,
        refundRate: '0'
      },
      topServices: [],
      monthlyData: [],
      recentActivity: []
    });
  }
}