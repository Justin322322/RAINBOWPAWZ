/**
 * Admin Refunds Statistics API
 * Provides comprehensive refund analytics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { initializeRefundTables } from '@/lib/db/refunds';

/**
 * GET /api/admin/refunds/stats - Get refund statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure refund tables exist first
    await initializeRefundTables();

    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin users can access this endpoint
    if (authResult.accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build the base query with date filters
    let baseCondition = '1=1';
    const queryParams: any[] = [];

    if (startDate) {
      baseCondition += ' AND DATE(initiated_at) >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      baseCondition += ' AND DATE(initiated_at) <= ?';
      queryParams.push(endDate);
    }

    // Get comprehensive refund statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_refunds,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN refund_type = 'manual' THEN 1 END) as manual_count,
        COUNT(CASE WHEN refund_type = 'automatic' THEN 1 END) as automatic_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN refund_type = 'manual' AND status = 'completed' THEN amount END), 0) as manual_completed_amount,
        COALESCE(SUM(CASE WHEN refund_type = 'automatic' AND status = 'completed' THEN amount END), 0) as automatic_completed_amount
      FROM refunds 
      WHERE ${baseCondition}
    `;

    const stats = await query(statsQuery, queryParams) as any[];
    const mainStats = stats[0];

    // Get monthly trend data (last 12 months)
    const trendQuery = `
      SELECT 
        DATE_FORMAT(initiated_at, '%Y-%m') as month,
        COUNT(*) as refund_count,
        COALESCE(SUM(amount), 0) as refund_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
      FROM refunds 
      WHERE initiated_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(initiated_at, '%Y-%m')
      ORDER BY month DESC
    `;

    const trendData = await query(trendQuery) as any[];

    // Get top providers by refund amount
    const topProvidersQuery = `
      SELECT 
        sp.name as provider_name,
        sp.provider_id,
        COUNT(r.id) as refund_count,
        COALESCE(SUM(r.amount), 0) as total_refunded
      FROM refunds r
      LEFT JOIN service_bookings sb ON r.booking_id = sb.id
      LEFT JOIN bookings b ON r.booking_id = b.id AND sb.id IS NULL
      LEFT JOIN service_providers sp ON COALESCE(sb.provider_id, b.provider_id) = sp.provider_id
      WHERE ${baseCondition} AND sp.provider_id IS NOT NULL
      GROUP BY sp.provider_id, sp.name
      ORDER BY total_refunded DESC
      LIMIT 10
    `;

    const topProviders = await query(topProvidersQuery, queryParams) as any[];

    // Get payment method breakdown
    const paymentMethodQuery = `
      SELECT 
        payment_method,
        COUNT(*) as refund_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM refunds 
      WHERE ${baseCondition}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;

    const paymentMethods = await query(paymentMethodQuery, queryParams) as any[];

    // Get refund reasons breakdown
    const reasonsQuery = `
      SELECT 
        reason,
        COUNT(*) as count
      FROM refunds 
      WHERE ${baseCondition}
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 10
    `;

    const refundReasons = await query(reasonsQuery, queryParams) as any[];

    return NextResponse.json({
      success: true,
      stats: {
        total_refunds: parseInt(mainStats.total_refunds),
        total_amount: parseFloat(mainStats.total_amount),
        pending_count: parseInt(mainStats.pending_count),
        completed_count: parseInt(mainStats.completed_count),
        failed_count: parseInt(mainStats.failed_count),
        cancelled_count: parseInt(mainStats.cancelled_count),
        manual_count: parseInt(mainStats.manual_count),
        automatic_count: parseInt(mainStats.automatic_count),
        completed_amount: parseFloat(mainStats.completed_amount),
        manual_completed_amount: parseFloat(mainStats.manual_completed_amount),
        automatic_completed_amount: parseFloat(mainStats.automatic_completed_amount),
        success_rate: mainStats.total_refunds > 0 ? 
          (parseFloat(mainStats.completed_count) / parseInt(mainStats.total_refunds) * 100).toFixed(2) : '0'
      },
      trend_data: trendData.map(item => ({
        month: item.month,
        refund_count: parseInt(item.refund_count),
        refund_amount: parseFloat(item.refund_amount),
        completed_count: parseInt(item.completed_count)
      })),
      top_providers: topProviders.map(provider => ({
        provider_name: provider.provider_name,
        provider_id: provider.provider_id,
        refund_count: parseInt(provider.refund_count),
        total_refunded: parseFloat(provider.total_refunded)
      })),
      payment_methods: paymentMethods.map(method => ({
        payment_method: method.payment_method,
        refund_count: parseInt(method.refund_count),
        total_amount: parseFloat(method.total_amount)
      })),
      refund_reasons: refundReasons.map(reason => ({
        reason: reason.reason,
        count: parseInt(reason.count)
      }))
    });

  } catch (error) {
    console.error('Error fetching refund stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch refund statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
