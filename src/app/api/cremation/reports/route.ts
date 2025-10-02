import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db/query';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.accountType !== 'business') {
      return NextResponse.json({ 
        error: 'Access denied. Business account required.' 
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'last30days';

    // Get provider ID
    const providerQuery = `
      SELECT sp.provider_id 
      FROM service_providers sp 
      WHERE sp.user_id = ?
    `;
    const providerResult = await query(providerQuery, [parseInt(authResult.userId)]) as any[];
    
    if (providerResult.length === 0) {
      return NextResponse.json({ 
        error: 'No cremation business found for this user' 
      }, { status: 404 });
    }

    const providerId = providerResult[0].provider_id;

    // Calculate date range based on period
    let dateFilter = '';
    const now = new Date();
    
    switch (period) {
      case 'last7days':
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `AND b.created_at >= '${last7Days.toISOString().split('T')[0]}'`;
        break;
      case 'last30days':
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `AND b.created_at >= '${last30Days.toISOString().split('T')[0]}'`;
        break;
      case 'last90days':
        const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilter = `AND b.created_at >= '${last90Days.toISOString().split('T')[0]}'`;
        break;
      case 'last6months':
        const last6Months = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        dateFilter = `AND b.created_at >= '${last6Months.toISOString().split('T')[0]}'`;
        break;
      case 'thisyear':
        dateFilter = `AND YEAR(b.created_at) = YEAR(NOW())`;
        break;
      default:
        dateFilter = '';
    }

    // Fetch bookings stats
    const bookingsStats = await query(`
      SELECT 
        COUNT(*) as totalBookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingBookings,
        SUM(CASE WHEN status = 'completed' THEN COALESCE(total_price, base_price, 0) ELSE 0 END) as totalRevenue,
        AVG(CASE WHEN status = 'completed' THEN COALESCE(total_price, base_price, 0) ELSE NULL END) as averageRevenue
      FROM bookings b
      WHERE b.provider_id = ? ${dateFilter}
    `, [providerId]) as any[];

    // Fetch refunds stats
    const refundsStats = await query(`
      SELECT 
        COUNT(*) as totalRefunds,
        SUM(COALESCE(r.amount, 0)) as totalRefunded,
        SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completedRefunds,
        SUM(CASE WHEN r.status IN ('pending', 'pending_approval') THEN 1 ELSE 0 END) as pendingRefunds,
        SUM(CASE WHEN r.refund_type = 'manual' THEN 1 ELSE 0 END) as manualRefunds
      FROM refunds r
      JOIN bookings b ON r.booking_id = b.id
      WHERE b.provider_id = ? ${dateFilter.replace('b.created_at', 'r.initiated_at')}
    `, [providerId]) as any[];

    // Fetch monthly data for charts
    const monthlyData = await query(`
      SELECT 
        DATE_FORMAT(b.created_at, '%Y-%m') as month,
        COUNT(*) as bookings,
        SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.total_price, b.base_price, 0) ELSE 0 END) as revenue,
        COALESCE(SUM(r.amount), 0) as refunds
      FROM bookings b
      LEFT JOIN refunds r ON b.id = r.booking_id AND r.status = 'completed'
      WHERE b.provider_id = ? ${dateFilter}
      GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `, [providerId]) as any[];

    // Fetch top services
    const topServices = await query(`
      SELECT 
        sp.name,
        COUNT(b.id) as bookings,
        SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.total_price, b.base_price, 0) ELSE 0 END) as revenue
      FROM bookings b
      LEFT JOIN service_packages sp ON b.package_id = sp.package_id
      WHERE b.provider_id = ? ${dateFilter}
      GROUP BY sp.name
      ORDER BY revenue DESC
      LIMIT 5
    `, [providerId]) as any[];

    const stats = bookingsStats[0];
    const refunds = refundsStats[0];

    // Calculate refund rate
    const refundRate = stats.totalBookings > 0 
      ? ((refunds.totalRefunds / stats.totalBookings) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      stats: {
        totalBookings: parseInt(stats.totalBookings) || 0,
        completedBookings: parseInt(stats.completedBookings) || 0,
        cancelledBookings: parseInt(stats.cancelledBookings) || 0,
        pendingBookings: parseInt(stats.pendingBookings) || 0,
        totalRevenue: parseFloat(stats.totalRevenue) || 0,
        averageRevenue: parseFloat(stats.averageRevenue) || 0,
        averageRating: 0, // TODO: Add ratings calculation
        totalRefunds: parseInt(refunds.totalRefunds) || 0,
        totalRefunded: parseFloat(refunds.totalRefunded) || 0,
        completedRefunds: parseInt(refunds.completedRefunds) || 0,
        pendingRefunds: parseInt(refunds.pendingRefunds) || 0,
        manualRefunds: parseInt(refunds.manualRefunds) || 0,
        refundRate
      },
      monthlyData: monthlyData.reverse().map((row: any) => ({
        month: row.month,
        bookings: parseInt(row.bookings) || 0,
        revenue: parseFloat(row.revenue) || 0,
        refunds: parseFloat(row.refunds) || 0
      })),
      topServices: topServices.map((row: any) => ({
        name: row.name || 'Unknown Service',
        bookings: parseInt(row.bookings) || 0,
        revenue: parseFloat(row.revenue) || 0
      })),
      recentActivity: []
    });

  } catch (error) {
    console.error('Error fetching cremation reports:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
