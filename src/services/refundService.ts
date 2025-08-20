/**
 * Refund Service
 * Handles refund processing logic, database operations, and PayMongo integration
 */

import { query } from '@/lib/db';
import { createRefund as createPayMongoRefund, phpToCentavos } from '@/lib/paymongo';
import {
  RefundRequest,
  RefundEligibilityCheck,
  PayMongoRefundData,
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
    const _hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

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

    // PayMongo requires the payment ID, not the payment_intent_id or source_id
    // We need to get the actual payment ID from PayMongo
    let paymentId: string | null = null;
    
    if (transaction.provider_transaction_id) {
      // If we have the payment ID stored, use it
      paymentId = transaction.provider_transaction_id;
    } else if (transaction.payment_intent_id) {
      // If we only have payment_intent_id, retrieve the payment from PayMongo
      try {
        const { retrievePaymentIntent } = await import('@/lib/paymongo');
        const paymentIntent = await retrievePaymentIntent(transaction.payment_intent_id);
        
        // Get the first successful payment from the payment intent
        if (paymentIntent.attributes.payments && paymentIntent.attributes.payments.length > 0) {
          const successfulPayment = paymentIntent.attributes.payments.find(
            (payment: any) => payment.attributes.status === 'paid'
          );
          if (successfulPayment) {
            paymentId = successfulPayment.id;
            
            // Store the payment ID for future use
            await query(`
              UPDATE payment_transactions
              SET provider_transaction_id = ?, updated_at = NOW()
              WHERE id = ?
            `, [paymentId, transaction.id]);
          }
        } else {
        }
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
        
        // Try to find payment by searching recent payments
        try {
          const { listPayments } = await import('@/lib/paymongo');
          const recentPayments = await listPayments({ limit: 100 });
          
          // Look for a payment that matches our transaction amount and timing
          const matchingPayment = recentPayments.find((payment: any) => {
            const paymentAmount = payment.attributes.amount;
            const transactionAmount = phpToCentavos(transaction.price);
            const paymentDate = new Date(payment.attributes.created_at * 1000);
            const transactionDate = new Date(transaction.created_at);
            
            // Check if amounts match and payments were created within 24 hours of each other
            const amountMatches = paymentAmount === transactionAmount;
            const timeDiff = Math.abs(paymentDate.getTime() - transactionDate.getTime());
            const timeMatches = timeDiff < (24 * 60 * 60 * 1000); // 24 hours
            
            return amountMatches && timeMatches && payment.attributes.status === 'paid';
          });
          
          if (matchingPayment) {
            paymentId = matchingPayment.id;
            
            // Store the payment ID for future use
            await query(`
              UPDATE payment_transactions
              SET provider_transaction_id = ?, updated_at = NOW()
              WHERE id = ?
            `, [paymentId, transaction.id]);
          }
        } catch (searchError) {
          console.error('Error searching for payments:', searchError);
        }
      }
    } else if (transaction.source_id) {
      // For source-based payments, try to find the payment using the source
      try {
        const { retrieveSource } = await import('@/lib/paymongo');
        const source = await retrieveSource(transaction.source_id);
        
        if (source.attributes.status === 'chargeable') {
          // Search for payments that used this source
          const { listPayments } = await import('@/lib/paymongo');
          const recentPayments = await listPayments({ limit: 100 });
          
          const sourcePayment = recentPayments.find((payment: any) => {
            return payment.attributes.source?.id === transaction.source_id && 
                   payment.attributes.status === 'paid';
          });
          
          if (sourcePayment) {
            paymentId = sourcePayment.id;
            
            // Store the payment ID for future use
            await query(`
              UPDATE payment_transactions
              SET provider_transaction_id = ?, updated_at = NOW()
              WHERE id = ?
            `, [paymentId, transaction.id]);
          }
        }
      } catch (error) {
        console.error('Error retrieving source:', error);
      }
    }

    if (!paymentId) {
      // Try one more approach - search by transaction metadata
      try {
        const { listPayments } = await import('@/lib/paymongo');
        const recentPayments = await listPayments({ limit: 200 });
        
        const bookingPayment = recentPayments.find((payment: any) => {
          const description = payment.attributes.description || '';
          const paymentAmount = payment.attributes.amount;
          const transactionAmount = phpToCentavos(transaction.price);
          
          // Look for booking ID in description and matching amount
          const hasBookingId = description.includes(`#${bookingId}`) || 
                             description.includes(`booking ${bookingId}`) ||
                             description.includes(`booking_${bookingId}`);
          const amountMatches = paymentAmount === transactionAmount;
          
          return hasBookingId && amountMatches && payment.attributes.status === 'paid';
        });
        
        if (bookingPayment) {
          paymentId = bookingPayment.id;
          
          // Store the payment ID for future use
          await query(`
            UPDATE payment_transactions
            SET provider_transaction_id = ?, updated_at = NOW()
            WHERE id = ?
          `, [paymentId, transaction.id]);
        }
      } catch (searchError) {
        console.error('Error searching payments by description:', searchError);
      }
    }

    if (!paymentId) {
      throw new Error(`Cannot determine PayMongo payment ID for refund. Tried all resolution methods for booking ${bookingId}. Please ensure the payment was processed through PayMongo and try again.`);
    }

    // Create refund with PayMongo
    const refundData: PayMongoRefundData = {
      amount: phpToCentavos(transaction.price),
      reason: reason,
      notes: `Refund for booking #${bookingId}`
    };

    console.log('Attempting PayMongo refund:', {
      paymentId,
      amount: refundData.amount,
      reason: refundData.reason
    });

    const paymongoRefund = await createPayMongoRefund(paymentId, refundData);

    // Update refund record with PayMongo transaction ID
    await query(`
      UPDATE refunds
      SET transaction_id = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `, [paymongoRefund.id, REFUND_STATUS.PROCESSING, refundId]);

    // Store the payment ID if we didn't have it before
    if (!transaction.provider_transaction_id && paymentId) {
      await query(`
        UPDATE payment_transactions
        SET provider_transaction_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [paymentId, transaction.id]);
    }

    return true;

  } catch (error) {
    console.error('Error processing PayMongo refund:', error);

    // Parse PayMongo specific errors for better handling
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let shouldRetry = false;
    let retryAfterMinutes = 0;

    // Check for specific PayMongo error patterns
    if (errorMessage.includes('provider_processing_error')) {
      errorMessage = 'PayMongo provider is temporarily unavailable. Retrying in 5 minutes.';
      shouldRetry = true;
      retryAfterMinutes = 5;
    } else if (errorMessage.includes('resource_processing_state')) {
      errorMessage = 'A refund is already being processed for this payment.';
      shouldRetry = false;
    } else if (errorMessage.includes('resource_failed_state')) {
      errorMessage = 'This payment cannot be refunded (payment not in paid state).';
      shouldRetry = false;
    } else if (errorMessage.includes('allowed_date_exceeded')) {
      errorMessage = 'Refund period has expired for this payment method.';
      shouldRetry = false;
    } else if (errorMessage.includes('available_balance_insufficient')) {
      errorMessage = 'Insufficient balance in PayMongo account for refund.';
      shouldRetry = false;
    } else if (errorMessage.includes('parameter_above_maximum')) {
      errorMessage = 'Refund amount exceeds the maximum refundable amount.';
      shouldRetry = false;
    } else if (errorMessage.includes('refund_not_allowed')) {
      errorMessage = 'Refunds are not allowed for this payment type.';
      shouldRetry = false;
    } else if (errorMessage.includes('Cannot determine PayMongo payment ID')) {
      // This is our custom error for payment ID resolution issues
      errorMessage = 'Unable to locate the PayMongo payment record. This may indicate a payment data synchronization issue.';
      shouldRetry = true;
      retryAfterMinutes = 10;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      errorMessage = 'Network timeout communicating with PayMongo. Retrying in 2 minutes.';
      shouldRetry = true;
      retryAfterMinutes = 2;
    } else if (errorMessage.includes('rate limit')) {
      errorMessage = 'PayMongo API rate limit exceeded. Retrying in 15 minutes.';
      shouldRetry = true;
      retryAfterMinutes = 15;
    }

    // Update refund status with detailed error message and retry info
    const statusToSet = shouldRetry ? REFUND_STATUS.PENDING : REFUND_STATUS.FAILED;
    const notes = shouldRetry 
      ? `PayMongo Error: ${errorMessage} Will retry automatically.`
      : `PayMongo Error: ${errorMessage} Manual intervention required.`;

    await query(`
      UPDATE refunds
      SET status = ?, notes = CONCAT(COALESCE(notes, ''), '\n', ?), updated_at = NOW()
      WHERE id = ?
    `, [statusToSet, notes, refundId]);

    // If we should retry, schedule a retry (you could implement a job queue for this)
    if (shouldRetry && retryAfterMinutes > 0) {
      // TODO: Implement automatic retry mechanism with job queue
    }

    throw new Error(errorMessage);
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
 * Retry failed PayMongo refunds that are eligible for retry
 */
export async function retryFailedRefunds(): Promise<{ success: number; failed: number; }> {
  try {
    // Get refunds that are pending and have retry notes
    const retryableRefunds = await query(`
      SELECT r.*, sb.payment_method
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE r.status = 'pending' 
      AND sb.payment_method = 'gcash'
      AND r.notes LIKE '%Will retry automatically%'
      AND r.updated_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
    `) as any[];

    let successCount = 0;
    let failedCount = 0;

    for (const refund of retryableRefunds) {
      try {
        
        await processPayMongoRefund(refund.booking_id, refund.id, refund.reason);
        successCount++;
        
      } catch (error) {
        console.error(`Failed to retry refund ${refund.id}:`, error);
        failedCount++;
      }
    }

    if (retryableRefunds.length > 0) {
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error retrying failed refunds:', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Validate and fix payment data for refunds
 */
export async function validatePaymentDataForRefund(bookingId: number): Promise<boolean> {
  try {
    
    // Get booking and transaction info
    const bookingResult = await query(`
      SELECT sb.*, pt.payment_intent_id, pt.source_id, pt.provider_transaction_id
      FROM service_bookings sb
      LEFT JOIN payment_transactions pt ON sb.id = pt.booking_id AND pt.status = 'succeeded'
      WHERE sb.id = ? AND sb.payment_method = 'gcash' AND sb.payment_status = 'paid'
    `, [bookingId]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return false;
    }

    const booking = bookingResult[0];
    
    // If we already have provider_transaction_id, we're good
    if (booking.provider_transaction_id) {
      return true;
    }

    // Try to resolve the payment ID using our improved resolution logic
    if (booking.payment_intent_id || booking.source_id) {
      try {
        // Use a simulated call to our payment resolution logic
        const _transaction = {
          id: booking.id,
          payment_intent_id: booking.payment_intent_id,
          source_id: booking.source_id,
          price: booking.price,
          created_at: booking.created_at
        };

        // Try to resolve payment ID (reuse the logic from processPayMongoRefund)
        let paymentId: string | null = null;

        if (booking.payment_intent_id) {
          const { retrievePaymentIntent } = await import('@/lib/paymongo');
          const paymentIntent = await retrievePaymentIntent(booking.payment_intent_id);
          
          if (paymentIntent.attributes.payments && paymentIntent.attributes.payments.length > 0) {
            const successfulPayment = paymentIntent.attributes.payments.find(
              (payment: any) => payment.attributes.status === 'paid'
            );
            if (successfulPayment) {
              paymentId = successfulPayment.id;
            }
          }
        }

        if (paymentId) {
          // Update the payment transaction with the resolved payment ID
          await query(`
            UPDATE payment_transactions
            SET provider_transaction_id = ?, updated_at = NOW()
            WHERE booking_id = ? AND status = 'succeeded'
          `, [paymentId, bookingId]);
          
          return true;
        }
      } catch (error) {
        console.error(`Error resolving payment ID for booking ${bookingId}:`, error);
      }
    }

    return false;
  } catch (error) {
    console.error(`Error validating payment data for booking ${bookingId}:`, error);
    return false;
  }
}


