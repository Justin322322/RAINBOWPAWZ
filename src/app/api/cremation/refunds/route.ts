import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { RefundListItem, RefundSummary } from '@/types/payment';

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 [Refunds API] Starting authentication check...');
    }

    // Verify secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [Refunds API] Authentication failed - no user returned');
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [Refunds API] Authentication successful:', { userId: user.userId, accountType: user.accountType });
    }

    // Check if this is a business user
    if (user.accountType !== 'business') {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [Refunds API] Wrong account type:', user.accountType);
      }
      return NextResponse.json({ error: 'Forbidden - Business access required' }, { status: 403 });
    }

    const userId = user.userId;

    // Get cremation center ID
    const cremationCenterQuery = `
      SELECT cremation_center_id
      FROM service_providers
      WHERE user_id = ?
    `;
    const cremationCenterResult = await query(cremationCenterQuery, [userId]) as any[];

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [Refunds API] Cremation center query result:', {
        userId,
        found: cremationCenterResult.length > 0,
        result: cremationCenterResult
      });
    }

    if (cremationCenterResult.length === 0) {
      return NextResponse.json({
        error: 'Cremation center not found',
        details: 'No cremation center found for this user'
      }, { status: 404 });
    }

    const cremationCenterId = cremationCenterResult[0].cremation_center_id;

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [Refunds API] Found cremation center ID:', cremationCenterId);
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build the main refunds query
    let refundsQuery = `
      SELECT
        r.id,
        r.booking_id,
        r.amount,
        r.currency,
        r.status,
        r.reason,
        r.payment_method,
        r.notes,
        r.created_at,
        r.processed_at,
        r.paymongo_refund_id,
        r.failure_reason,
        b.pet_name,
        u.first_name,
        u.last_name,
        u.email as user_email,
        sp.business_name as provider_name
      FROM payment_transactions r
      LEFT JOIN service_bookings b ON r.booking_id = b.id
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN service_providers sp ON b.provider_id = sp.provider_id
      WHERE b.cremation_center_id = ? AND r.status IN ('refunded', 'failed')
    `;

    const queryParams: any[] = [cremationCenterId];

    // Add status filter if provided
    if (status) {
      refundsQuery += ' AND r.status = ?';
      queryParams.push(status);
    }

    // Add ordering and pagination
    refundsQuery += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const refundsResult = await query(refundsQuery, queryParams) as any[];

    // Transform the results to match RefundListItem interface
    const refunds: RefundListItem[] = refundsResult.map(row => ({
      id: row.id,
      booking_id: row.booking_id,
      amount: parseFloat(row.amount),
      status: row.status,
      reason: row.reason,
      payment_method: row.payment_method,
      created_at: new Date(row.created_at),
      processed_at: row.processed_at ? new Date(row.processed_at) : undefined,
      pet_name: row.pet_name,
      user_name: `${row.first_name} ${row.last_name}`,
      provider_name: row.provider_name
    }));

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transactions r
      LEFT JOIN service_bookings b ON r.booking_id = b.id
      WHERE b.cremation_center_id = ? AND r.status IN ('refunded', 'failed')
    `;
    const countParams = status ? [cremationCenterId, status] : [cremationCenterId];
    if (status) {
      countQuery.replace('WHERE', 'WHERE r.status = ? AND');
    }

    const countResult = await query(countQuery, countParams) as any[];
    const totalCount = countResult[0]?.total || 0;

    // Calculate summary statistics
    const summaryQuery = `
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as succeeded_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM payment_transactions r
      LEFT JOIN service_bookings b ON r.booking_id = b.id
      WHERE b.cremation_center_id = ? AND r.status IN ('pending', 'processing', 'refunded', 'failed')
    `;

    const summaryResult = await query(summaryQuery, [cremationCenterId]) as any[];
    const summary = summaryResult[0];

    const refundSummary: RefundSummary = {
      total_amount: parseFloat(summary.total_amount || 0),
      total_count: parseInt(summary.total_count || 0),
      pending_count: parseInt(summary.pending_count || 0),
      processed_count: parseInt(summary.succeeded_count || 0),
      failed_count: parseInt(summary.failed_count || 0),
      success_rate: summary.total_count > 0
        ? (parseInt(summary.succeeded_count || 0) / parseInt(summary.total_count)) * 100
        : 0
    };

    return NextResponse.json({
      success: true,
      refunds,
      summary: refundSummary,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching cremation refunds:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
