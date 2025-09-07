import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';
import { RefundDetail } from '@/types/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authentication token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode JWT token to get user info
    const { decodeTokenUnsafe } = await import('@/lib/jwt');
    const payload = decodeTokenUnsafe(authToken);
    const userId = payload?.userId || null;
    const accountType = payload?.accountType || null;

    if (!userId || accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cremation center ID
    const cremationCenterQuery = `
      SELECT cremation_center_id
      FROM service_providers
      WHERE user_id = ?
    `;
    const cremationCenterResult = await query(cremationCenterQuery, [userId]) as any[];

    if (cremationCenterResult.length === 0) {
      return NextResponse.json({ error: 'Cremation center not found' }, { status: 404 });
    }

    const cremationCenterId = cremationCenterResult[0].cremation_center_id;
    const refundId = params.id;

    // Fetch detailed refund information
    const refundQuery = `
      SELECT
        pt.id,
        pt.booking_id,
        pt.amount,
        pt.currency,
        pt.status,
        pt.reason,
        pt.payment_method,
        pt.provider,
        pt.paymongo_payment_id,
        pt.paymongo_refund_id,
        pt.notes,
        pt.failure_reason,
        pt.created_at,
        pt.updated_at,
        pt.processed_at,
        -- Booking details
        sb.pet_name,
        u.first_name,
        u.last_name,
        u.email as user_email,
        sp.business_name as provider_name,
        sb.service_date,
        sb.service_type,
        -- Payment details
        pt.amount as original_amount,
        pt.created_at as payment_date,
        pt.payment_method as payment_method_detail,
        pt.paymongo_payment_id as transaction_id
      FROM payment_transactions pt
      LEFT JOIN service_bookings sb ON pt.booking_id = sb.id
      LEFT JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN service_providers sp ON sb.provider_id = sp.provider_id
      WHERE pt.id = ? AND sb.cremation_center_id = ? AND pt.status IN ('refunded', 'failed')
    `;

    const refundResult = await query(refundQuery, [refundId, cremationCenterId]) as any[];

    if (refundResult.length === 0) {
      return NextResponse.json({
        error: 'Refund not found or access denied'
      }, { status: 404 });
    }

    const row = refundResult[0];

    // Transform to RefundDetail interface
    const refundDetail: RefundDetail = {
      id: row.id,
      booking_id: row.booking_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      reason: row.reason,
      payment_method: row.payment_method,
      provider: row.provider,
      paymongo_payment_id: row.paymongo_payment_id,
      paymongo_refund_id: row.paymongo_refund_id,
      notes: row.notes,
      failure_reason: row.failure_reason,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      processed_at: row.processed_at ? new Date(row.processed_at) : undefined,
      booking_details: {
        pet_name: row.pet_name,
        user_name: `${row.first_name} ${row.last_name}`,
        user_email: row.user_email,
        provider_name: row.provider_name,
        service_date: row.service_date ? new Date(row.service_date) : undefined,
        service_type: row.service_type || 'Cremation Service'
      },
      payment_details: {
        original_amount: parseFloat(row.original_amount),
        payment_date: new Date(row.payment_date),
        payment_method: row.payment_method_detail,
        transaction_id: row.transaction_id
      }
    };

    return NextResponse.json({
      success: true,
      refund: refundDetail
    });

  } catch (error) {
    console.error('Error fetching refund details:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
