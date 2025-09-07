/**
 * Cremation Business Refunds API
 * Handles refund data for cremation business dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { initializeRefundTables } from '@/lib/db/refunds';

/**
 * GET /api/cremation/refunds - Get refunds for the authenticated cremation business
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure refund tables exist first
    await initializeRefundTables();

    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business users can access this endpoint
    if (authResult.accountType !== 'business') {
      return NextResponse.json({ 
        error: 'Access denied. Business account required.' 
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get the business provider ID
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

    // Build the refunds query with filters
    let refundsQuery = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        COALESCE(sb.pet_name, b.pet_name) as pet_name,
        COALESCE(sb.booking_date, b.booking_date) as booking_date
      FROM refunds r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN service_bookings sb ON r.booking_id = sb.id AND sb.provider_id = ?
      LEFT JOIN bookings b ON r.booking_id = b.id AND b.provider_id = ?
      WHERE (sb.id IS NOT NULL OR b.id IS NOT NULL)
    `;
    
    const queryParams = [providerId, providerId];

    // Add status filter if provided
    if (status && status !== 'all') {
      refundsQuery += ' AND r.status = ?';
      queryParams.push(status);
    }

    // Add date range filter if provided
    if (startDate) {
      refundsQuery += ' AND DATE(r.initiated_at) >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      refundsQuery += ' AND DATE(r.initiated_at) <= ?';
      queryParams.push(endDate);
    }

    refundsQuery += ' ORDER BY r.initiated_at DESC';

    const refunds = await query(refundsQuery, queryParams) as any[];

    // Format the refunds data
    const formattedRefunds = refunds.map(refund => ({
      id: refund.id,
      booking_id: refund.booking_id,
      user_id: refund.user_id,
      amount: parseFloat(refund.amount),
      reason: refund.reason,
      status: refund.status,
      refund_type: refund.refund_type,
      payment_method: refund.payment_method,
      transaction_id: refund.transaction_id,
      receipt_path: refund.receipt_path,
      receipt_verified: refund.receipt_verified,
      notes: refund.notes,
      initiated_at: refund.initiated_at,
      processed_at: refund.processed_at,
      completed_at: refund.completed_at,
      customer_name: `${refund.first_name} ${refund.last_name}`.trim(),
      customer_email: refund.email,
      pet_name: refund.pet_name,
      booking_date: refund.booking_date
    }));

    return NextResponse.json({
      success: true,
      refunds: formattedRefunds
    });

  } catch (error) {
    console.error('Error fetching cremation refunds:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch refunds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
