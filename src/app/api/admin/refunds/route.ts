import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

/**
 * GET - Fetch all refunds for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with filters
    let whereClause = '';
    const queryParams: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE r.status = ?';
      queryParams.push(status);
    }

    // Fetch refunds with related booking and user information
    const refundsQuery = `
      SELECT
        r.*,
        sb.pet_name,
        sb.booking_date,
        sb.booking_time,
        sb.payment_method,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      JOIN users u ON sb.user_id = u.user_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const refundsResult = await query(refundsQuery, queryParams) as any[];

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      JOIN users u ON sb.user_id = u.user_id
      ${whereClause}
    `;

    const countParams = status && status !== 'all' ? [status] : [];
    const countResult = await query(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    // Get refund statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_refunds,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'processed' THEN amount ELSE 0 END) as total_refunded_amount,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count
      FROM refunds
    `;

    const statsResult = await query(statsQuery) as any[];
    const stats = statsResult[0] || {};

    return NextResponse.json({
      success: true,
      refunds: refundsResult,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      statistics: {
        total_refunds: stats.total_refunds || 0,
        pending_count: stats.pending_count || 0,
        processing_count: stats.processing_count || 0,
        processed_count: stats.processed_count || 0,
        failed_count: stats.failed_count || 0,
        cancelled_count: stats.cancelled_count || 0,
        total_refunded_amount: parseFloat(stats.total_refunded_amount || 0),
        today_count: stats.today_count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

