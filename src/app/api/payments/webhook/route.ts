import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/services/paymentService';
import { createPaymentNotification } from '@/utils/comprehensiveNotificationService';
import { validateWebhookSignature } from '@/lib/paymongo';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();

    // Validate webhook signature for security
    const signature = request.headers.get('paymongo-signature');
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (signature && !validateWebhookSignature(body, signature, webhookSecret)) {
      console.error('Webhook signature validation failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let webhookData;

    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Validate webhook structure
    if (!webhookData.data || !webhookData.data.attributes) {
      console.error('Invalid webhook structure:', webhookData);
      return NextResponse.json({ error: 'Invalid webhook structure' }, { status: 400 });
    }

    const event = webhookData.data;
    const eventType = event.attributes.type;
    const eventData = event.attributes.data;

    console.log('Received webhook:', {
      type: eventType,
      id: event.id,
      dataId: eventData?.id
    });

    // Handle different webhook events
    switch (eventType) {
      case 'source.chargeable':
        await handleSourceChargeable(eventData);
        break;

      case 'payment.paid':
        await handlePaymentPaid(eventData);
        break;

      case 'payment.failed':
        await handlePaymentFailed(eventData);
        break;

      case 'refund.succeeded':
        await handleRefundSucceeded(eventData);
        break;

      case 'refund.failed':
        await handleRefundFailed(eventData);
        break;

      default:
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleSourceChargeable(sourceData: any) {
  try {
    const sourceId = sourceData.id;
    const _status = sourceData.attributes._status;


    // Update payment status
    const success = await processPaymentWebhook(sourceId, 'chargeable');

    if (success) {
      // Get booking details for notification
      const bookingQuery = `
        SELECT pt.booking_id, sb.user_id
        FROM payment_transactions pt
        JOIN service_bookings sb ON pt.booking_id = sb.id
        WHERE pt.source_id = ?
      `;
      const bookingResult = await query(bookingQuery, [sourceId]) as any[];

      if (bookingResult.length > 0) {
        const { booking_id } = bookingResult[0];

        // Create payment notification
        await createPaymentNotification(booking_id, 'payment_confirmed');
      }
    }
  } catch (error) {
    console.error('Error handling source.chargeable:', error);
  }
}

async function handlePaymentPaid(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    const _status = paymentData.attributes._status;


    // For payment intents, we need to find the transaction by payment_intent_id
    const transactionQuery = `
      SELECT pt.id, pt.booking_id, sb.user_id
      FROM payment_transactions pt
      JOIN service_bookings sb ON pt.booking_id = sb.id
      WHERE pt.payment_intent_id = ? OR pt.source_id = ?
    `;
    const transactionResult = await query(transactionQuery, [paymentId, paymentId]) as any[];

    if (transactionResult.length > 0) {
      const { id: transactionId, booking_id } = transactionResult[0];

      // Update transaction status
      const { updatePaymentStatus } = await import('@/services/paymentService');
      await updatePaymentStatus(transactionId, 'succeeded', {
        provider_transaction_id: paymentId
      });

      // Update booking payment status
      const updateBookingQuery = `
        UPDATE service_bookings
        SET payment_status = 'paid'
        WHERE id = ?
      `;
      await query(updateBookingQuery, [booking_id]);

      // Create payment notification
      await createPaymentNotification(booking_id, 'payment_confirmed');
    }
  } catch (error) {
    console.error('Error handling payment.paid:', error);
  }
}

async function handlePaymentFailed(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    const _status = paymentData.attributes._status;
    const failureReason = paymentData.attributes.last_payment_error?.message || 'Payment failed';


    // Find the transaction
    const transactionQuery = `
      SELECT pt.id, pt.booking_id, sb.user_id
      FROM payment_transactions pt
      JOIN service_bookings sb ON pt.booking_id = sb.id
      WHERE pt.payment_intent_id = ? OR pt.source_id = ?
    `;
    const transactionResult = await query(transactionQuery, [paymentId, paymentId]) as any[];

    if (transactionResult.length > 0) {
      const { id: transactionId, booking_id } = transactionResult[0];

      // Update transaction status
      const { updatePaymentStatus } = await import('@/services/paymentService');
      await updatePaymentStatus(transactionId, 'failed', {
        provider_transaction_id: paymentId,
        failure_reason: failureReason
      });

      // Create payment notification
      await createPaymentNotification(booking_id, 'payment_failed');
    }
  } catch (error) {
    console.error('Error handling payment.failed:', error);
  }
}

async function handleRefundSucceeded(refundData: any) {
  try {
    const refundId = refundData.id;
    const _paymentId = refundData.attributes.payment_id;
    const _status = refundData.attributes._status;


    // Find the refund record by PayMongo transaction ID
    const refundQuery = `
      SELECT r.id, r.booking_id, r.amount, sb.user_id, sb.pet_name, sb.provider_id
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE r.transaction_id = ? AND r.status = 'processing'
    `;
    const refundResult = await query(refundQuery, [refundId]) as any[];

    if (refundResult.length > 0) {
      const { id: localRefundId, booking_id, amount, user_id, pet_name, provider_id } = refundResult[0];

      // Complete the refund process
      const { completeRefund } = await import('@/services/refundService');
      await completeRefund(booking_id, localRefundId);

      // Create comprehensive refund notification for user
      await createPaymentNotification(booking_id, 'payment_refunded');

      // Create user notification with detailed information
      const { createUserNotification } = await import('@/utils/userNotificationService');
      try {
        await createUserNotification({
          userId: user_id,
          type: 'refund_processed',
          title: 'Refund Processed',
          message: `Your refund for ${pet_name} has been processed successfully. The amount of ₱${parseFloat(amount).toFixed(2)} has been refunded to your account.`,
          entityType: 'booking',
          entityId: booking_id,
          shouldSendEmail: true,
          emailSubject: 'Refund Completed - Rainbow Paws'
        });
      } catch (notificationError) {
        console.error('Failed to create user notification:', notificationError);
      }

      // Notify service provider about the refund
      if (provider_id) {
        const { createBusinessNotification } = await import('@/utils/businessNotificationService');
        try {
          // Get provider user ID
          let providerResult = await query('SELECT user_id FROM service_providers WHERE provider_id = ?', [provider_id]) as any[];
          
          if (!providerResult || providerResult.length === 0) {
            providerResult = await query('SELECT user_id FROM businesses WHERE id = ?', [provider_id]) as any[];
          }
          
          if (!providerResult || providerResult.length === 0) {
            providerResult = await query('SELECT user_id FROM users WHERE user_id = ? AND role = "business"', [provider_id]) as any[];
          }

          if (providerResult && providerResult.length > 0) {
            const providerUserId = providerResult[0].user_id;
            
            await createBusinessNotification({
              userId: providerUserId,
              title: 'Refund Processed',
              message: `A refund of ₱${parseFloat(amount).toFixed(2)} has been processed for booking #${booking_id} (${pet_name}).`,
              type: 'info',
              link: `/cremation/bookings/${booking_id}`,
              shouldSendEmail: true,
              emailSubject: 'Refund Notification - Rainbow Paws'
            });
          }
        } catch (providerNotificationError) {
          console.error('Failed to create provider notification:', providerNotificationError);
        }
      }

    } else {
      console.warn('Refund record not found for PayMongo refund:', refundId);
    }
  } catch (error) {
    console.error('Error handling refund.succeeded:', error);
  }
}

async function handleRefundFailed(refundData: any) {
  try {
    const refundId = refundData.id;
    const _paymentId = refundData.attributes.payment_id;
    const _status = refundData.attributes._status;
    const failureReason = refundData.attributes.failure_reason || 'Refund failed';


    // Find the refund record by PayMongo transaction ID
    const refundQuery = `
      SELECT r.id, r.booking_id
      FROM refunds r
      WHERE r.transaction_id = ? AND r.status = 'processing'
    `;
    const refundResult = await query(refundQuery, [refundId]) as any[];

    if (refundResult.length > 0) {
      const { id: localRefundId, booking_id } = refundResult[0];

      // Mark refund as failed
      await query(`
        UPDATE refunds
        SET status = 'failed', notes = CONCAT(COALESCE(notes, ''), '\nPayMongo refund failed: ', ?), updated_at = NOW()
        WHERE id = ?
      `, [failureReason, localRefundId]);

      // Create refund notification
      await createPaymentNotification(booking_id, 'payment_failed');

    } else {
      console.warn('Refund record not found for PayMongo refund:', refundId);
    }
  } catch (error) {
    console.error('Error handling refund.failed:', error);
  }
}

// Handle GET requests (for webhook verification)
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'PayMongo webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
