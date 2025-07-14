import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Handles GET requests to the admin payments analytics endpoint, returning payment statistics and trends for the dashboard.
 *
 * Parses query parameters to determine the reporting period, retrieves aggregated payment data (including overall statistics, payment method breakdowns, daily trends, top providers, and recent failed payments), and returns a structured JSON response for analytics visualization.
 *
 * @returns A JSON response containing payment analytics data for the specified period or date range.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build date filter
    let dateFilter = '';
    let dateParams: any[] = [];

    if (startDate && endDate) {
      dateFilter = 'AND pt.created_at BETWEEN ? AND ?';
      dateParams = [startDate, endDate];
    } else {
      dateFilter = 'AND pt.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      dateParams = [parseInt(period)];
    }

    // SECURITY FIX: Build safe queries with validated date filter
    const overallStatsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN pt.status = 'succeeded' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN pt.status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN pt.status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN pt.status = 'cancelled' THEN 1 END) as cancelled_payments,
        SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE NULL END) as average_transaction_amount,
        COUNT(DISTINCT pt.booking_id) as unique_bookings
      FROM payment_transactions pt
      WHERE 1=1 ${dateFilter}
    `;

    const overallStats = await query(overallStatsQuery, dateParams) as any[];

    // Get payment method breakdown
    const paymentMethodQuery = `
      SELECT 
        pt.payment_method,
        COUNT(*) as transaction_count,
        COUNT(CASE WHEN pt.status = 'succeeded' THEN 1 END) as successful_count,
        SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as total_amount,
        AVG(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE NULL END) as average_amount
      FROM payment_transactions pt
      WHERE 1=1 ${dateFilter}
      GROUP BY pt.payment_method
      ORDER BY transaction_count DESC
    `;

    const paymentMethodStats = await query(paymentMethodQuery, dateParams) as any[];

    // Get daily payment trends
    const dailyTrendsQuery = `
      SELECT 
        DATE(pt.created_at) as payment_date,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN pt.status = 'succeeded' THEN 1 END) as successful_transactions,
        SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as daily_revenue
      FROM payment_transactions pt
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(pt.created_at)
      ORDER BY payment_date DESC
      LIMIT 30
    `;

    const dailyTrends = await query(dailyTrendsQuery, dateParams) as any[];

    // Get provider payment statistics
    const providerStatsQuery = `
      SELECT
        sp.name as provider_name,
        sp.provider_id as provider_id,
        COUNT(pt.id) as transaction_count,
        COUNT(CASE WHEN pt.status = 'succeeded' THEN 1 END) as successful_payments,
        SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE NULL END) as average_amount
      FROM payment_transactions pt
      JOIN service_bookings sb ON pt.booking_id = sb.id
      JOIN service_providers sp ON sb.provider_id = sp.provider_id
      WHERE 1=1 ${dateFilter}
      GROUP BY sp.provider_id, sp.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;

    const providerStats = await query(providerStatsQuery, dateParams) as any[];

    // Get recent failed payments for investigation
    const recentFailuresQuery = `
      SELECT 
        pt.id,
        pt.booking_id,
        pt.amount,
        pt.payment_method,
        pt.failure_reason,
        pt.created_at,
        sb.pet_name,
        u.first_name,
        u.last_name,
        u.email
      FROM payment_transactions pt
      JOIN service_bookings sb ON pt.booking_id = sb.id
      JOIN users u ON sb.user_id = u.user_id
      WHERE pt.status = 'failed' ${dateFilter}
      ORDER BY pt.created_at DESC
      LIMIT 20
    `;

    const recentFailures = await query(recentFailuresQuery, dateParams) as any[];

    // Calculate success rate and other metrics
    const stats = overallStats[0];
    const successRate = stats.total_transactions > 0 
      ? (stats.successful_payments / stats.total_transactions * 100).toFixed(2)
      : '0.00';
    
    const failureRate = stats.total_transactions > 0 
      ? (stats.failed_payments / stats.total_transactions * 100).toFixed(2)
      : '0.00';

    // Get payment status distribution
    const statusDistribution = {
      succeeded: stats.successful_payments,
      failed: stats.failed_payments,
      pending: stats.pending_payments,
      cancelled: stats.cancelled_payments
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_transactions: stats.total_transactions,
          total_revenue: Number(stats.total_revenue || 0).toFixed(2),
          average_transaction_amount: Number(stats.average_transaction_amount || 0).toFixed(2),
          success_rate: successRate,
          failure_rate: failureRate,
          unique_bookings: stats.unique_bookings
        },
        status_distribution: statusDistribution,
        payment_methods: paymentMethodStats.map((method: any) => ({
          method: method.payment_method,
          transaction_count: method.transaction_count,
          successful_count: method.successful_count,
          total_amount: Number(method.total_amount || 0).toFixed(2),
          average_amount: Number(method.average_amount || 0).toFixed(2),
          success_rate: method.transaction_count > 0 
            ? (method.successful_count / method.transaction_count * 100).toFixed(2)
            : '0.00'
        })),
        daily_trends: dailyTrends.map((day: any) => ({
          date: day.payment_date,
          total_transactions: day.total_transactions,
          successful_transactions: day.successful_transactions,
          daily_revenue: Number(day.daily_revenue || 0).toFixed(2),
          success_rate: day.total_transactions > 0 
            ? (day.successful_transactions / day.total_transactions * 100).toFixed(2)
            : '0.00'
        })),
        top_providers: providerStats.map((provider: any) => ({
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          transaction_count: provider.transaction_count,
          successful_payments: provider.successful_payments,
          total_revenue: Number(provider.total_revenue || 0).toFixed(2),
          average_amount: Number(provider.average_amount || 0).toFixed(2),
          success_rate: provider.transaction_count > 0 
            ? (provider.successful_payments / provider.transaction_count * 100).toFixed(2)
            : '0.00'
        })),
        recent_failures: recentFailures.map((failure: any) => ({
          transaction_id: failure.id,
          booking_id: failure.booking_id,
          amount: Number(failure.amount).toFixed(2),
          payment_method: failure.payment_method,
          failure_reason: failure.failure_reason,
          created_at: failure.created_at,
          customer: {
            name: `${failure.first_name} ${failure.last_name}`,
            email: failure.email
          },
          pet_name: failure.pet_name
        })),
        period: {
          type: startDate && endDate ? 'custom' : 'days',
          value: startDate && endDate ? `${startDate} to ${endDate}` : period,
          start_date: startDate,
          end_date: endDate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    return NextResponse.json({
      error: 'Failed to fetch payment analytics',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
