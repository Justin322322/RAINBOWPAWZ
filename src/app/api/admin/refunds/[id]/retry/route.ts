import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { processPayMongoRefund } from '@/services/refundService';

/**
 * POST - Retry a failed refund
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const refundId = parseInt(id);

    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [, accountType] = authToken.split('_');
    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    if (!refundId || isNaN(refundId)) {
      return NextResponse.json({
        error: 'Invalid refund ID'
      }, { status: 400 });
    }

    // Get refund details
    const refundResult = await query(`
      SELECT r.*, sb.payment_method
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE r.id = ? AND r.status IN ('failed', 'pending')
    `, [refundId]) as any[];

    if (!refundResult || refundResult.length === 0) {
      return NextResponse.json({
        error: 'Refund not found or not in retryable status (must be failed or pending)'
      }, { status: 404 });
    }

    const refund = refundResult[0];

    // Only retry PayMongo refunds (GCash payments)
    if (refund.payment_method !== 'gcash') {
      return NextResponse.json({
        error: 'Only GCash payment refunds can be retried through PayMongo'
      }, { status: 400 });
    }

    // Attempt to retry the refund
    try {
      await processPayMongoRefund(refund.booking_id, refundId, refund.reason);

      return NextResponse.json({
        success: true,
        message: 'Refund retry initiated successfully',
        refund: {
          id: refundId,
          booking_id: refund.booking_id,
          status: 'processing'
        }
      });

    } catch (retryError) {
      console.error('Refund retry failed:', retryError);
      
      return NextResponse.json({
        success: false,
        error: 'Refund retry failed',
        details: retryError instanceof Error ? retryError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Refund retry error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 