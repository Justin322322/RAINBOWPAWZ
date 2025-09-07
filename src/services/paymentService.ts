/**
 * Payment Service
 * Handles payment processing logic and database operations
 */

import { query } from '@/lib/db';
import { createSource, phpToCentavos, createRefund } from '@/lib/paymongo';
import { getServerAppUrl } from '@/utils/appUrl';
import { createPaymentNotification } from '@/utils/comprehensiveNotificationService';
import {
  PaymentTransaction,
  CreatePaymentRequest,
  PaymentResponse,
  PaymentStatus
} from '@/types/payment';

/**
 * Create a new payment transaction
 */
export async function createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
  try {
    // Validate booking exists
    const bookingQuery = `
      SELECT id, price, payment_status, user_id
      FROM service_bookings
      WHERE id = ?
    `;
    const bookingResult = await query(bookingQuery, [request.booking_id]) as any[];

    if (bookingResult.length === 0) {
      return {
        success: false,
        status: 'failed',
        error: 'Booking not found'
      };
    }

    const booking = bookingResult[0];

    // Check if payment already processed successfully
    if (booking.payment_status === 'paid') {
      // Check if there's actually a successful payment transaction
      const successfulPaymentQuery = `
        SELECT id FROM payment_transactions
        WHERE booking_id = ? AND status = 'succeeded'
        LIMIT 1
      `;
      const successfulPaymentResult = await query(successfulPaymentQuery, [request.booking_id]) as any[];

      if (successfulPaymentResult.length > 0) {
        return {
          success: false,
          status: 'failed',
          error: 'Payment already processed for this booking'
        };
      } else {
        // Payment status is 'paid' but no successful transaction found
        // Reset payment status to allow retry
        await query(
          'UPDATE service_bookings SET payment_status = ? WHERE id = ?',
          ['not_paid', request.booking_id]
        );
      }
    }

    // For cash payments, just create a pending transaction record
    if (request.payment_method === 'cash') {
      const transactionId = await createPaymentTransaction({
        booking_id: request.booking_id,
        amount: request.amount,
        currency: request.currency || 'PHP',
        payment_method: 'cash',
        status: 'pending',
        provider: 'manual'
      });

      return {
        success: true,
        transaction_id: transactionId,
        status: 'pending',
        message: 'Cash payment recorded. Payment will be collected upon service delivery.'
      };
    }

    // For GCash payments, create PayMongo source
    if (request.payment_method === 'gcash') {
// Ensure baseUrl never has a trailing slash
const baseUrl = getServerAppUrl().replace(/\/$/, '');

// Accept external URLs only if they are same-origin to avoid open-redirects
const sanitizeRedirect = (url?: string): string | undefined =>
  url && url.startsWith(baseUrl) ? url : undefined;

const returnUrl =
  sanitizeRedirect(request.return_url) ??
  `${baseUrl}/payment/success?booking_id=${encodeURIComponent(request.booking_id)}`;

const failureUrl =
  sanitizeRedirect(request.cancel_url) ??
  `${baseUrl}/payment/failed?booking_id=${encodeURIComponent(request.booking_id)}`;
      const sourceData = {
        amount: phpToCentavos(request.amount),
        currency: request.currency || 'PHP',
        type: 'gcash',
        redirect: {
          success: returnUrl,
          failed: failureUrl
        },
        billing: request.customer_info ? {
          name: request.customer_info.name,
          email: request.customer_info.email,
          phone: request.customer_info.phone
        } : undefined,
        description: request.description || `Payment for booking #${request.booking_id}`
      };

      const source = await createSource(sourceData);

      // Create transaction record
      const transactionId = await createPaymentTransaction({
        booking_id: request.booking_id,
        source_id: source.id,
        amount: request.amount,
        currency: request.currency || 'PHP',
        payment_method: 'gcash',
        status: 'pending',
        provider: 'paymongo',
        checkout_url: source.attributes.redirect.checkout_url,
        return_url: returnUrl,
        metadata: {
          source_id: source.id,
          customer_info: request.customer_info
        }
      });


      return {
        success: true,
        transaction_id: transactionId,
        source_id: source.id,
        checkout_url: source.attributes.redirect.checkout_url,
        status: 'pending',
        message: 'GCash payment created. Please complete payment through the checkout URL.'
      };
    }

    return {
      success: false,
      status: 'failed',
      error: 'Invalid payment method'
    };

  } catch (error) {
    console.error('Payment creation error:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Payment creation failed',
      message: 'Failed to create payment. Please try again.'
    };
  }
}

/**
 * Create payment transaction record in database
 */
async function createPaymentTransaction(transaction: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const insertQuery = `
    INSERT INTO payment_transactions (
      booking_id, payment_intent_id, source_id, amount, currency,
      payment_method, status, provider, provider_transaction_id,
      checkout_url, return_url, failure_reason, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    transaction.booking_id,
    transaction.payment_intent_id || null,
    transaction.source_id || null,
    transaction.amount,
    transaction.currency,
    transaction.payment_method,
    transaction.status,
    transaction.provider,
    transaction.provider_transaction_id || null,
    transaction.checkout_url || null,
    transaction.return_url || null,
    transaction.failure_reason || null,
    transaction.metadata ? JSON.stringify(transaction.metadata) : null
  ];

  const result = await query(insertQuery, values) as any;
  return result.insertId;
}

/**
 * Update payment transaction status
 */
export async function updatePaymentStatus(
  transactionId: number,
  status: PaymentTransaction['status'],
  additionalData?: Partial<PaymentTransaction>
): Promise<boolean> {
  try {
    let updateQuery = 'UPDATE payment_transactions SET status = ?, updated_at = NOW()';
    const values: any[] = [status];

    if (additionalData?.provider_transaction_id) {
      updateQuery += ', provider_transaction_id = ?';
      values.push(additionalData.provider_transaction_id);
    }

    if (additionalData?.failure_reason) {
      updateQuery += ', failure_reason = ?';
      values.push(additionalData.failure_reason);
    }

    if (additionalData?.metadata) {
      updateQuery += ', metadata = ?';
      values.push(JSON.stringify(additionalData.metadata));
    }

    updateQuery += ' WHERE id = ?';
    values.push(transactionId);

    const result = await query(updateQuery, values) as any;
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating payment status:', error);
    return false;
  }
}

/**
 * Get payment status for a booking
 */
export async function getPaymentStatus(bookingId: number): Promise<PaymentStatus | null> {
  try {
    const statusQuery = `
      SELECT
        sb.id as booking_id,
        sb.payment_status,
        sb.payment_method,
        pt.id as transaction_id,
        pt.amount as amount_paid,
        pt.updated_at as last_payment_date
      FROM service_bookings sb
      LEFT JOIN payment_transactions pt ON sb.id = pt.booking_id AND pt.status = 'succeeded'
      WHERE sb.id = ?
      ORDER BY pt.updated_at DESC
      LIMIT 1
    `;

    const result = await query(statusQuery, [bookingId]) as any[];

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      booking_id: row.booking_id,
      payment_status: row.payment_status,
      payment_method: row.payment_method,
      transaction_id: row.transaction_id,
      amount_paid: row.amount_paid,
      last_payment_date: row.last_payment_date
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    return null;
  }
}



/**
 * Process webhook for payment updates
 */
export async function processPaymentWebhook(sourceId: string, status: string): Promise<boolean> {
  try {
    // Get transaction by source_id
    const transactionQuery = `
      SELECT id, booking_id, amount, status as current_status
      FROM payment_transactions
      WHERE source_id = ?
    `;
    const transactionResult = await query(transactionQuery, [sourceId]) as any[];

    if (transactionResult.length === 0) {
      console.error('Transaction not found for source:', sourceId);
      return false;
    }

    const transaction = transactionResult[0];

    // Update transaction status based on webhook
    let newStatus: PaymentTransaction['status'];
    let bookingPaymentStatus: 'not_paid' | 'paid' = 'not_paid';

    switch (status) {
      case 'chargeable':
      case 'paid':
        newStatus = 'succeeded';
        bookingPaymentStatus = 'paid';
        break;
      case 'failed':
      case 'expired':
        newStatus = 'failed';
        bookingPaymentStatus = 'not_paid';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        bookingPaymentStatus = 'not_paid';
        break;
      default:
        newStatus = 'processing';
        bookingPaymentStatus = 'not_paid';
    }

    // Update transaction
    await updatePaymentStatus(transaction.id, newStatus);

    // Update booking payment status
    if (newStatus === 'succeeded') {
      const updateBookingQuery = `
        UPDATE service_bookings
        SET payment_status = ?
        WHERE id = ?
      `;
      await query(updateBookingQuery, [bookingPaymentStatus, transaction.booking_id]);
    }

    return true;
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return false;
  }
}

/**
 * Process automatic refund for cancelled booking
 */
export async function processAutomaticRefund(bookingId: number): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
  message: string;
}> {
  try {
    // Get booking and payment details
    const bookingQuery = `
      SELECT 
        sb.id, sb.price, sb.payment_method, sb.payment_status,
        pt.id as transaction_id, pt.paymongo_payment_id, pt.status as transaction_status
      FROM service_bookings sb
      LEFT JOIN payment_transactions pt ON sb.id = pt.booking_id AND pt.status = 'succeeded'
      WHERE sb.id = ?
    `;
    
    const bookingResult = await query(bookingQuery, [bookingId]) as any[];
    
    if (bookingResult.length === 0) {
      return {
        success: false,
        error: 'Booking not found',
        message: 'Booking not found'
      };
    }

    const booking = bookingResult[0];

    // Check if booking was paid
    if (booking.payment_status !== 'paid') {
      return {
        success: true,
        message: 'No refund needed - booking was not paid'
      };
    }

    // Check if there's a successful payment transaction
    if (!booking.paymongo_payment_id) {
      return {
        success: false,
        error: 'No payment transaction found',
        message: 'No payment transaction found for refund'
      };
    }

    // Process refund based on payment method
    if (booking.payment_method === 'gcash') {
      return await processGCashRefund(booking);
    } else if (booking.payment_method === 'qr_manual') {
      return await processManualQRRefund(booking);
    } else {
      return {
        success: false,
        error: 'Unsupported payment method',
        message: 'Refund not supported for this payment method'
      };
    }

  } catch (error) {
    console.error('Error processing automatic refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to process refund'
    };
  }
}

/**
 * Process GCash refund through PayMongo
 */
async function processGCashRefund(booking: any): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
  message: string;
}> {
  try {
    const refundAmount = phpToCentavos(parseFloat(booking.price));
    
    const refundResult = await createRefund(booking.paymongo_payment_id, {
      amount: refundAmount,
      reason: 'requested_by_customer',
      notes: `Automatic refund for cancelled booking #${booking.id}`
    });

    // Update booking payment status
    await query(`
      UPDATE service_bookings 
      SET payment_status = 'refunded' 
      WHERE id = ?
    `, [booking.id]);

    // Create refund transaction record
    await query(`
      INSERT INTO payment_transactions (
        booking_id, amount, currency, payment_method, status, provider, 
        paymongo_payment_id, paymongo_refund_id, created_at
      ) VALUES (?, ?, 'PHP', 'gcash', 'refunded', 'paymongo', ?, ?, NOW())
    `, [
      booking.id,
      booking.price,
      booking.paymongo_payment_id,
      refundResult.id
    ]);

    // Send unified refund notification (includes email)
    try {
      await createPaymentNotification(booking.id, 'payment_refunded');
    } catch (notificationError) {
      console.error('Failed to create payment refund notification (gcash):', notificationError);
    }

    return {
      success: true,
      refundId: refundResult.id,
      message: `GCash refund processed successfully. Refund ID: ${refundResult.id}`
    };

  } catch (error) {
    console.error('GCash refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GCash refund failed',
      message: 'Failed to process GCash refund'
    };
  }
}

/**
 * Process manual QR refund (mark as refunded, no actual payment processing)
 */
async function processManualQRRefund(booking: any): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
  message: string;
}> {
  try {
    // Update booking payment status
    await query(`
      UPDATE service_bookings 
      SET payment_status = 'refunded' 
      WHERE id = ?
    `, [booking.id]);

    // Create refund transaction record
    const refundId = `qr_refund_${booking.id}_${Date.now()}`;
    await query(`
      INSERT INTO payment_transactions (
        booking_id, amount, currency, payment_method, status, provider, 
        paymongo_refund_id, created_at
      ) VALUES (?, ?, 'PHP', 'qr_manual', 'refunded', 'manual', ?, NOW())
    `, [
      booking.id,
      booking.price,
      refundId
    ]);

    // Send unified refund notification (includes email)
    try {
      await createPaymentNotification(booking.id, 'payment_refunded');
    } catch (notificationError) {
      console.error('Failed to create payment refund notification (qr_manual):', notificationError);
    }

    return {
      success: true,
      refundId: refundId,
      message: 'Manual QR refund processed. Provider will handle the actual refund process.'
    };

  } catch (error) {
    console.error('Manual QR refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Manual QR refund failed',
      message: 'Failed to process manual QR refund'
    };
  }
}
