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

      default:
        console.log('Unhandled webhook event type:', eventType);
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
    const status = sourceData.attributes.status;

    console.log('Processing source.chargeable:', { sourceId, status });

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
        console.log('Payment confirmed notification sent for booking:', booking_id);
      }
    }
  } catch (error) {
    console.error('Error handling source.chargeable:', error);
  }
}

async function handlePaymentPaid(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    const status = paymentData.attributes.status;

    console.log('Processing payment.paid:', { paymentId, status });

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
      console.log('Payment confirmed notification sent for booking:', booking_id);
    }
  } catch (error) {
    console.error('Error handling payment.paid:', error);
  }
}

async function handlePaymentFailed(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    const status = paymentData.attributes.status;
    const failureReason = paymentData.attributes.last_payment_error?.message || 'Payment failed';

    console.log('Processing payment.failed:', { paymentId, status, failureReason });

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
      console.log('Payment failed notification sent for booking:', booking_id);
    }
  } catch (error) {
    console.error('Error handling payment.failed:', error);
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'PayMongo webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
