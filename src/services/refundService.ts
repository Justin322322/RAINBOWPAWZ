/**
 * Refund Service
 * Handles refund processing logic, database operations, and PayMongo integration
 */

import { query } from '@/lib/db';
import { createRefund as createPayMongoRefund, phpToCentavos, centavosToPHP } from '@/lib/paymongo';
import {
  Refund,
  RefundRequest,
  RefundResponse,
  RefundEligibilityCheck,
  PayMongoRefundData,
  REFUND_REASONS,
  REFUND_STATUS
} from '@/types/refund';

/**
 * Check if a booking is eligible for refund
 */
export async function checkRefundEligibility(bookingId: number): Promise<RefundEligibilityCheck> {
  try {
    // Get booking details
    const bookingResult = await query(`
      SELECT sb.*, pt.payment_intent_id, pt.source_id, pt.provider_transaction_id
      FROM service_bookings sb
      LEFT JOIN payment_transactions pt ON sb.id = pt.booking_id AND pt.status = 'succeeded'
      WHERE sb.id = ?
    `, [bookingId]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return {
        eligible: false,
        reason: 'Booking not found'
      };
    }

    const booking = bookingResult[0];

    // Check if already refunded
    if (booking.payment_status === 'refunded') {
      return {
        eligible: false,
        reason: 'Booking has already been refunded',
        booking_status: booking.status,
        payment_status: booking.payment_status
      };
    }

    // Check if payment was made
    if (booking.payment_status !== 'paid') {
      return {
        eligible: false,
        reason: 'No payment was made for this booking',
        booking_status: booking.status,
        payment_status: booking.payment_status
      };
    }

    // Check booking status - only cancelled bookings are eligible for refunds
    if (booking.status !== 'cancelled') {
      return {
        eligible: false,
        reason: 'Only cancelled bookings are eligible for refunds',
        booking_status: booking.status,
        payment_status: booking.payment_status
      };
    }

    // Check if there's already a refund request for this booking
    const existingRefundResult = await query(`
      SELECT id, status FROM refunds WHERE booking_id = ? AND status IN ('pending', 'processing', 'processed')
    `, [bookingId]) as any[];

    if (existingRefundResult && existingRefundResult.length > 0) {
      const existingRefund = existingRefundResult[0];
      return {
        eligible: false,
        reason: `A refund request already exists for this booking (Status: ${existingRefund.status})`,
        booking_status: booking.status,
        payment_status: booking.payment_status
      };
    }

    // Calculate refund policy based on booking date
    const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const refundPolicy = {
      full_refund_hours: 24,
      partial_refund_hours: 12,
      no_refund_hours: 2
    };

    return {
      eligible: true,
      booking_status: booking.status,
      payment_status: booking.payment_status,
      amount: parseFloat(booking.price),
      refund_policy: refundPolicy
    };

  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    return {
      eligible: false,
      reason: 'Error checking refund eligibility'
    };
  }
}

/**
 * Create a refund record in the database
 */
export async function createRefundRecord(refundData: RefundRequest): Promise<number> {
  try {
    // Get booking details to determine amount if not provided
    let amount = refundData.amount;
    if (!amount) {
      const bookingResult = await query(`
        SELECT price FROM service_bookings WHERE id = ?
      `, [refundData.booking_id]) as any[];

      if (bookingResult && bookingResult.length > 0) {
        amount = bookingResult[0].price;
      } else {
        throw new Error('Booking not found');
      }
    }

    const result = await query(`
      INSERT INTO refunds (booking_id, amount, reason, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      refundData.booking_id,
      amount,
      refundData.reason,
      REFUND_STATUS.PENDING,
      refundData.notes || null
    ]) as any;

    return result.insertId;
  } catch (error) {
    console.error('Error creating refund record:', error);
    throw error;
  }
}

/**
 * Check if a booking has a valid PayMongo transaction for refund
 */
export async function hasValidPayMongoTransaction(bookingId: number): Promise<boolean> {
  try {
    const transactionResult = await query(`
      SELECT pt.id
      FROM payment_transactions pt
      WHERE pt.booking_id = ? AND pt.status = 'succeeded' AND pt.provider = 'paymongo'
      AND (pt.payment_intent_id IS NOT NULL OR pt.source_id IS NOT NULL)
    `, [bookingId]) as any[];

    return transactionResult && transactionResult.length > 0;
  } catch (error) {
    console.error('Error checking PayMongo transaction:', error);
    return false;
  }
}

/**
 * Process refund with PayMongo (for GCash payments)
 */
export async function processPayMongoRefund(
  bookingId: number,
  refundId: number,
  reason: string
): Promise<boolean> {
  try {
    // Get payment transaction details
    const transactionResult = await query(`
      SELECT pt.*, sb.price, sb.payment_method
      FROM payment_transactions pt
      JOIN service_bookings sb ON pt.booking_id = sb.id
      WHERE pt.booking_id = ? AND pt.status = 'succeeded' AND pt.provider = 'paymongo'
    `, [bookingId]) as any[];

    if (!transactionResult || transactionResult.length === 0) {
      // Check if this booking was actually paid with GCash but has no PayMongo transaction
      const bookingResult = await query(`
        SELECT payment_method, payment_status FROM service_bookings WHERE id = ?
      `, [bookingId]) as any[];

      if (bookingResult && bookingResult.length > 0) {
        const booking = bookingResult[0];
        if (booking.payment_method === 'gcash' && booking.payment_status === 'paid') {
          throw new Error('GCash payment found but no PayMongo transaction record exists. This booking may have been paid manually or through a different system.');
        } else if (booking.payment_method === 'cash') {
          throw new Error('This booking was paid with cash, not through PayMongo. Use manual refund processing instead.');
        }
      }

      throw new Error('No PayMongo transaction found for this booking');
    }

    const transaction = transactionResult[0];

    // Create refund with PayMongo
    const refundData: PayMongoRefundData = {
      amount: phpToCentavos(transaction.price),
      reason: reason,
      notes: `Refund for booking #${bookingId}`
    };

    const paymongoRefund = await createPayMongoRefund(
      transaction.payment_intent_id || transaction.source_id,
      refundData
    );

    // Update refund record with PayMongo transaction ID
    await query(`
      UPDATE refunds
      SET transaction_id = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `, [paymongoRefund.id, REFUND_STATUS.PROCESSING, refundId]);

    return true;
  } catch (error) {
    console.error('Error processing PayMongo refund:', error);

    // Update refund status to failed
    await query(`
      UPDATE refunds
      SET status = ?, notes = CONCAT(COALESCE(notes, ''), '\nPayMongo Error: ', ?), updated_at = NOW()
      WHERE id = ?
    `, [REFUND_STATUS.FAILED, error instanceof Error ? error.message : 'Unknown error', refundId]);

    throw error;
  }
}

/**
 * Complete refund process (update booking and payment status)
 */
export async function completeRefund(bookingId: number, refundId: number): Promise<void> {
  try {
    // Update booking status
    await query(`
      UPDATE service_bookings
      SET payment_status = 'refunded', status = 'cancelled', refund_id = ?, updated_at = NOW()
      WHERE id = ?
    `, [refundId, bookingId]);

    // Update payment transaction status
    await query(`
      UPDATE payment_transactions
      SET status = 'refunded', refund_id = ?, refunded_at = NOW(), updated_at = NOW()
      WHERE booking_id = ? AND status = 'succeeded'
    `, [refundId, bookingId]);

    // Update refund status to processed
    await query(`
      UPDATE refunds
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [REFUND_STATUS.PROCESSED, refundId]);

  } catch (error) {
    console.error('Error completing refund:', error);
    throw error;
  }
}

/**
 * Get refund details by ID
 */
export async function getRefundById(refundId: number): Promise<Refund | null> {
  try {
    const result = await query(`
      SELECT * FROM refunds WHERE id = ?
    `, [refundId]) as any[];

    if (!result || result.length === 0) {
      return null;
    }

    return result[0] as Refund;
  } catch (error) {
    console.error('Error getting refund by ID:', error);
    return null;
  }
}

/**
 * Get refunds by booking ID
 */
export async function getRefundsByBookingId(bookingId: number): Promise<Refund[]> {
  try {
    const result = await query(`
      SELECT * FROM refunds WHERE booking_id = ? ORDER BY created_at DESC
    `, [bookingId]) as any[];

    return result as Refund[];
  } catch (error) {
    console.error('Error getting refunds by booking ID:', error);
    return [];
  }
}
