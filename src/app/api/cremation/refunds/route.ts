import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

/**
 * GET - Fetch all refunds for cremation center dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cremation center authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - Business access required'
      }, { status: 403 });
    }

    // Get cremation center ID from service_providers table
    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ? AND provider_type = ?',
      [user.userId, 'cremation']
    ) as any[];

    if (!providerResult || providerResult.length === 0) {
      return NextResponse.json({
        error: 'Cremation center not found for this user'
      }, { status: 400 });
    }

    const cremationCenterId = providerResult[0].provider_id;

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toUpperCase();

    // Build query with filters
    let whereClause = 'WHERE cb.provider_id = ?';
    const queryParams: any[] = [cremationCenterId];

    // Build WHERE conditions
    const conditions: string[] = [];

    if (status && status !== 'all') {
      conditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (search) {
      // Search across multiple fields
      const searchConditions = [
        'r.reason LIKE ?',
        'r.booking_id LIKE ?',
        'cb.pet_name LIKE ?',
        'CONCAT(u.first_name, " ", u.last_name) LIKE ?',
        'u.email LIKE ?'
      ];
      const searchValue = `%${search}%`;
      conditions.push(`(${searchConditions.join(' OR ')})`);
      queryParams.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    if (conditions.length > 0) {
      whereClause += ' AND ' + conditions.join(' AND ');
    }

    // Validate sort column to prevent SQL injection
    const validSortColumns = ['created_at', 'updated_at', 'amount', 'status', 'booking_id'];
    const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Fetch refunds with related booking and user information for cremation bookings
    const refundsQuery = `
      SELECT
        r.*,
        cb.pet_name,
        cb.booking_date,
        cb.booking_time,
        cb.payment_method,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM refunds r
      JOIN service_bookings cb ON r.booking_id = cb.id
      JOIN users u ON cb.user_id = u.user_id
      ${whereClause}
      ORDER BY r.${validSortBy} ${validSortOrder}
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const refundsResult = await query(refundsQuery, queryParams) as any[];

    // Get total count for pagination (use same WHERE clause)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM refunds r
      JOIN service_bookings cb ON r.booking_id = cb.id
      JOIN users u ON cb.user_id = u.user_id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams) as any[];
    const total = countResult[0]?.total || 0;

    // Get refund statistics for this cremation center
    const statsQuery = `
      SELECT
        COUNT(*) as total_refunds,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN r.status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN r.status = 'processed' THEN 1 ELSE 0 END) as processed_count,
        SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN r.status = 'processed' THEN r.amount ELSE 0 END) as total_refunded_amount,
        SUM(CASE WHEN DATE(r.created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count
      FROM refunds r
      JOIN service_bookings cb ON r.booking_id = cb.id
      WHERE cb.provider_id = ?
    `;

    const statsResult = await query(statsQuery, [cremationCenterId]) as any[];
    const stats = statsResult[0] || {};

    return NextResponse.json({
      success: true,
      refunds: refundsResult,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
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
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-Total-Count': total.toString(),
        'X-Page-Size': limit.toString(),
        'X-Current-Page': (Math.floor(offset / limit) + 1).toString()
      }
    });

  } catch (error) {
    console.error('Error fetching cremation refunds:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}