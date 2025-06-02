import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import {
  checkRefundEligibility,
  createRefundRecord,
  processPayMongoRefund,
  completeRefund
} from '@/services/refundService';
import { REFUND_REASONS } from '@/types/refund';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

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

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({
        error: 'Invalid booking ID'
      }, { status: 400 });
    }

    // Get the refund reason from request body
    const body = await request.json();
    const { reason = REFUND_REASONS.ADMIN_INITIATED, notes } = body;

    // Check refund eligibility
    const eligibilityCheck = await checkRefundEligibility(parseInt(id));
    if (!eligibilityCheck.eligible) {
      return NextResponse.json({
        error: eligibilityCheck.reason || 'Booking is not eligible for refund'
      }, { status: 400 });
    }

    // Get booking details
    const bookingResult = await query(`
      SELECT * FROM service_bookings WHERE id = ?
    `, [id]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found'
      }, { status: 404 });
    }

    const booking = bookingResult[0];

    // Process the refund
    try {
      // Create refund record
      const refundId = await createRefundRecord({
        booking_id: parseInt(id),
        reason: reason,
        amount: booking.price,
        notes: notes
      });

      // Process refund based on payment method
      if (booking.payment_method === 'gcash') {
        try {
          // Process PayMongo refund for GCash payments
          await processPayMongoRefund(parseInt(id), refundId, reason);

          return NextResponse.json({
            success: true,
            message: 'Refund request submitted to PayMongo. Processing may take 5-10 business days.',
            refund: {
              id: refundId,
              booking_id: id,
              amount: booking.price,
              reason: reason,
              status: 'processing'
            }
          });
        } catch (paymongoError) {
          console.error('PayMongo refund error:', paymongoError);
          // Fall back to manual processing
          await completeRefund(parseInt(id), refundId);

          return NextResponse.json({
            success: true,
            message: 'Refund processed manually. PayMongo integration failed.',
            refund: {
              id: refundId,
              booking_id: id,
              amount: booking.price,
              reason: reason,
              status: 'processed'
            }
          });
        }
      } else {
        // For cash payments, complete refund immediately
        await completeRefund(parseInt(id), refundId);

        return NextResponse.json({
          success: true,
          message: 'Refund processed successfully.',
          refund: {
            id: refundId,
            booking_id: id,
            amount: booking.price,
            reason: reason,
            status: 'processed'
          }
        });
      }

    } catch (refundError) {
      console.error('Refund processing error:', refundError);
      return NextResponse.json({
        error: 'Failed to process refund',
        details: refundError instanceof Error ? refundError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Admin refund error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check refund eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

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

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({
        error: 'Invalid booking ID'
      }, { status: 400 });
    }

    // Check refund eligibility using the service
    const eligibilityCheck = await checkRefundEligibility(parseInt(id));

    // Get booking details for additional info
    const bookingResult = await query(`
      SELECT id, status, payment_status, price, payment_method
      FROM service_bookings WHERE id = ?
    `, [id]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found'
      }, { status: 404 });
    }

    const booking = bookingResult[0];

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        payment_status: booking.payment_status,
        amount: booking.price,
        payment_method: booking.payment_method
      },
      refund_eligible: eligibilityCheck.eligible,
      already_refunded: booking.payment_status === 'refunded',
      reason: eligibilityCheck.reason,
      refund_policy: eligibilityCheck.refund_policy,
      message: eligibilityCheck.eligible
        ? 'This booking is eligible for refund'
        : eligibilityCheck.reason || 'This booking is not eligible for refund'
    });

  } catch (error) {
    console.error('Refund eligibility check error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
