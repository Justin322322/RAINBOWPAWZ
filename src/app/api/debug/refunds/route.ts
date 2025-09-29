/**
 * Debug API to check refund creation
 * Temporary endpoint to troubleshoot refund visibility issues
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/query';

export async function GET() {
  try {
    // Get all refunds with booking and provider info
    const refundsQuery = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        b.pet_name,
        b.booking_date,
        b.provider_id,
        b.payment_method as booking_payment_method,
        b.payment_status as booking_payment_status,
        sp.business_name
      FROM refunds r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN service_providers sp ON b.provider_id = sp.provider_id
      ORDER BY r.initiated_at DESC
      LIMIT 20
    `;

    const refunds = await query(refundsQuery, []) as any[];

    return NextResponse.json({
      success: true,
      refunds: refunds,
      count: refunds.length
    });

  } catch (error) {
    console.error('Debug refunds error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debug refunds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
