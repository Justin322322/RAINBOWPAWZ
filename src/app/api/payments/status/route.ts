import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { retrieveSource, retrievePaymentIntent } from '@/lib/paymongo';

/**
 * GET /api/payments/status
 * Retrieve payment status for a booking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      return NextResponse.json({
        error: 'Booking ID is required',
        details: 'Please provide a valid booking ID'
      }, { status: 400 });
    }

    // Get payment transaction details
    const transactionQuery = `
      SELECT
        pt.*,
        sb.user_id,
        sb.pet_name,
        sb.payment_method as booking_payment_method,
        sb.payment_status as booking_payment_status,
        sb.price as booking_amount,
        sp.name as service_name,
        sp.name as provider_name
      FROM payment_transactions pt
      JOIN bookings sb ON pt.booking_id = sb.id
      LEFT JOIN service_providers sp ON sb.provider_id = sp.provider_id
      WHERE pt.booking_id = ?
      ORDER BY pt.created_at DESC
      LIMIT 1
    `;

    const transactionResult = await query(transactionQuery, [bookingId]) as any[];

    if (transactionResult.length === 0) {
      // Check if booking exists but has no payment transactions
      const bookingQuery = `
        SELECT id, payment_status, payment_method, price
        FROM bookings
        WHERE id = ?
      `;
      const bookingResult = await query(bookingQuery, [bookingId]) as any[];

      if (bookingResult.length === 0) {
        return NextResponse.json({
          error: 'Booking not found',
          details: 'No booking found with the provided ID'
        }, { status: 404 });
      }

      const booking = bookingResult[0];
      return NextResponse.json({
        success: true,
        data: {
          booking_id: parseInt(bookingId),
          payment_status: booking.payment_status || 'not_paid',
          payment_method: booking.payment_method || 'cash',
          amount: booking.price || 0,
          transaction_status: 'no_transaction',
          message: 'No payment transaction found for this booking'
        }
      });
    }

    const transaction = transactionResult[0];

    // If transaction exists, get latest status from PayMongo if applicable
    let latestStatus = transaction.status;
    let providerData = null;

    if (transaction.provider === 'paymongo' && (transaction.source_id || transaction.payment_intent_id)) {
      try {
        if (transaction.source_id) {
          const sourceData = await retrieveSource(transaction.source_id);
          latestStatus = mapPayMongoStatusToLocal(sourceData.attributes.status);
          providerData = {
            provider_status: sourceData.attributes.status,
            provider_id: sourceData.id,
            checkout_url: sourceData.attributes.redirect?.checkout_url
          };
        } else if (transaction.payment_intent_id) {
          const intentData = await retrievePaymentIntent(transaction.payment_intent_id);
          latestStatus = mapPayMongoStatusToLocal(intentData.attributes.status);
          providerData = {
            provider_status: intentData.attributes.status,
            provider_id: intentData.id
          };
        }

        // Update local status if it has changed
        if (latestStatus !== transaction.status) {
          const updateQuery = `
            UPDATE payment_transactions
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          await query(updateQuery, [latestStatus, transaction.id]);

          // Update booking payment status if payment succeeded
          if (latestStatus === 'succeeded') {
            const updateBookingQuery = `
              UPDATE bookings
              SET payment_status = 'paid'
              WHERE id = ?
            `;
            await query(updateBookingQuery, [bookingId]);
          }
        }
      } catch (providerError) {
        console.error('Error fetching latest status from PayMongo:', providerError);
        // Continue with local status if provider check fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction_id: transaction.id,
        booking_id: transaction.booking_id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: transaction.payment_method,
        status: latestStatus,
        provider: transaction.provider,
        checkout_url: transaction.checkout_url,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        booking_payment_status: transaction.booking_payment_status,
        service_name: transaction.service_name,
        provider_name: transaction.provider_name,
        pet_name: transaction.pet_name,
        provider_data: providerData,
        failure_reason: transaction.failure_reason
      }
    });

  } catch (error) {
    console.error('Error retrieving payment status:', error);
    return NextResponse.json({
      error: 'Failed to retrieve payment status',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Map PayMongo status to local payment status
 */
function mapPayMongoStatusToLocal(paymongoStatus: string): 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' {
  switch (paymongoStatus) {
    case 'pending':
    case 'awaiting_payment_method':
      return 'pending';
    case 'processing':
    case 'awaiting_next_action':
      return 'processing';
    case 'succeeded':
    case 'paid':
    case 'chargeable':
      return 'succeeded';
    case 'failed':
    case 'expired':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}
