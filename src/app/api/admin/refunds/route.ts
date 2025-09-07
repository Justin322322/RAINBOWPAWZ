/**
 * Admin Refunds API
 * Provides omnipresent visibility into all refunds across the platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/refunds - Get all refunds with comprehensive filtering
 */
export async function GET(request: NextRequest) {
  try {
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
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const providerId = searchParams.get('provider_id');

    // Build the comprehensive refunds query
    let refundsQuery = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        sp.name as provider_name,
        sp.provider_id,
        COALESCE(sb.pet_name, b.pet_name) as pet_name,
        COALESCE(sb.booking_date, b.booking_date) as booking_date,
        COALESCE(sb.provider_id, b.provider_id) as booking_provider_id
      FROM refunds r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN service_bookings sb ON r.booking_id = sb.id
      LEFT JOIN bookings b ON r.booking_id = b.id AND sb.id IS NULL
      LEFT JOIN service_providers sp ON COALESCE(sb.provider_id, b.provider_id) = sp.provider_id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];

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

    // Add provider filter if provided
    if (providerId) {
      refundsQuery += ' AND COALESCE(sb.provider_id, b.provider_id) = ?';
      queryParams.push(parseInt(providerId));
    }

    // Add search filter if provided
    if (search) {
      refundsQuery += ` AND (
        CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR
        u.email LIKE ? OR
        sp.name LIKE ? OR
        r.booking_id = ? OR
        r.id = ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, search, search);
    }

    refundsQuery += ' ORDER BY r.initiated_at DESC LIMIT 1000';

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
      paymongo_refund_id: refund.paymongo_refund_id,
      receipt_path: refund.receipt_path,
      receipt_verified: refund.receipt_verified,
      notes: refund.notes,
      initiated_at: refund.initiated_at,
      processed_at: refund.processed_at,
      completed_at: refund.completed_at,
      customer_name: `${refund.first_name} ${refund.last_name}`.trim(),
      customer_email: refund.email,
      pet_name: refund.pet_name,
      booking_date: refund.booking_date,
      provider_name: refund.provider_name,
      provider_id: refund.provider_id
    }));

    return NextResponse.json({
      success: true,
      refunds: formattedRefunds,
      total_count: formattedRefunds.length
    });

  } catch (error) {
    console.error('Error fetching admin refunds:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch refunds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
