import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createPaymentNotification } from '@/utils/comprehensiveNotificationService';

/**
 * POST /api/payments/test
 * Test payment functionality and simulate different payment scenarios
 * Only available in development environment
 */
export async function POST(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Payment testing is not available in production'
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      action, 
      booking_id, 
      payment_status, 
      amount, 
      payment_method = 'gcash',
      simulate_delay = false 
    } = body;

    if (!action) {
      return NextResponse.json({
        error: 'Action is required',
        details: 'Specify action: create_test_payment, simulate_webhook, update_status, or create_test_booking'
      }, { status: 400 });
    }

    switch (action) {
      case 'create_test_booking':
        return await createTestBooking(body);
      
      case 'create_test_payment':
        return await createTestPayment(booking_id, amount, payment_method);
      
      case 'simulate_webhook':
        return await simulateWebhook(booking_id, payment_status, simulate_delay);
      
      case 'update_status':
        return await updatePaymentStatus(booking_id, payment_status);
      
      case 'test_notifications':
        return await testPaymentNotifications(booking_id, payment_status);
      
      default:
        return NextResponse.json({
          error: 'Invalid action',
          details: 'Valid actions: create_test_booking, create_test_payment, simulate_webhook, update_status, test_notifications'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment test error:', error);
    return NextResponse.json({
      error: 'Payment test failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Create a test booking for payment testing
 */
async function createTestBooking(data: any) {
  try {
    const {
      user_id = 1,
      provider_id = 1,
      package_id = 1,
      pet_name = 'Test Pet',
      pet_type = 'Dog',
      price = 1000.00
    } = data;

    const bookingQuery = `
      INSERT INTO service_bookings (
        user_id, provider_id, package_id, pet_name, pet_type, 
        booking_date, booking_time, status, payment_method, 
        payment_status, price, created_at
      ) VALUES (?, ?, ?, ?, ?, CURDATE(), '10:00:00', 'pending', 'gcash', 'not_paid', ?, NOW())
    `;

    const result = await query(bookingQuery, [
      user_id, provider_id, package_id, pet_name, pet_type, price
    ]) as any;

    return NextResponse.json({
      success: true,
      message: 'Test booking created successfully',
      data: {
        booking_id: result.insertId,
        user_id,
        provider_id,
        package_id,
        pet_name,
        pet_type,
        price,
        status: 'pending',
        payment_status: 'not_paid'
      }
    });

  } catch (error) {
    throw new Error(`Failed to create test booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a test payment transaction
 */
async function createTestPayment(booking_id: number, amount: number, payment_method: string) {
  if (!booking_id || !amount) {
    throw new Error('booking_id and amount are required for creating test payment');
  }

  try {
    const transactionQuery = `
      INSERT INTO payment_transactions (
        booking_id, amount, currency, payment_method, status, 
        provider, source_id, checkout_url, created_at
      ) VALUES (?, ?, 'PHP', ?, 'pending', 'paymongo', ?, ?, NOW())
    `;

    const sourceId = `src_test_${Date.now()}`;
    const checkoutUrl = `https://test-checkout.paymongo.com/${sourceId}`;

    const result = await query(transactionQuery, [
      booking_id, amount, payment_method, sourceId, checkoutUrl
    ]) as any;

    return NextResponse.json({
      success: true,
      message: 'Test payment transaction created successfully',
      data: {
        transaction_id: result.insertId,
        booking_id,
        amount,
        payment_method,
        status: 'pending',
        source_id: sourceId,
        checkout_url: checkoutUrl
      }
    });

  } catch (error) {
    throw new Error(`Failed to create test payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simulate a payment webhook
 */
async function simulateWebhook(booking_id: number, payment_status: string, simulate_delay: boolean) {
  if (!booking_id || !payment_status) {
    throw new Error('booking_id and payment_status are required for webhook simulation');
  }

  try {
    // Add delay if requested
    if (simulate_delay) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Get the payment transaction
    const transactionQuery = `
      SELECT * FROM payment_transactions 
      WHERE booking_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const transactionResult = await query(transactionQuery, [booking_id]) as any[];

    if (transactionResult.length === 0) {
      throw new Error('No payment transaction found for this booking');
    }

    const transaction = transactionResult[0];

    // Update transaction status
    const updateQuery = `
      UPDATE payment_transactions 
      SET status = ?, updated_at = NOW() 
      WHERE id = ?
    `;
    await query(updateQuery, [payment_status, transaction.id]);

    // Update booking payment status if payment succeeded
    if (payment_status === 'succeeded') {
      const updateBookingQuery = `
        UPDATE service_bookings 
        SET payment_status = 'paid' 
        WHERE id = ?
      `;
      await query(updateBookingQuery, [booking_id]);
    }

    // Send notification
    const notificationStatus = payment_status === 'succeeded' ? 'payment_confirmed' : 
                              payment_status === 'failed' ? 'payment_failed' : 'payment_pending';
    
    await createPaymentNotification(booking_id, notificationStatus as any);

    return NextResponse.json({
      success: true,
      message: `Webhook simulation completed - payment ${payment_status}`,
      data: {
        transaction_id: transaction.id,
        booking_id,
        old_status: transaction.status,
        new_status: payment_status,
        notification_sent: true
      }
    });

  } catch (error) {
    throw new Error(`Failed to simulate webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update payment status directly
 */
async function updatePaymentStatus(booking_id: number, payment_status: string) {
  if (!booking_id || !payment_status) {
    throw new Error('booking_id and payment_status are required');
  }

  try {
    const updateQuery = `
      UPDATE payment_transactions 
      SET status = ?, updated_at = NOW() 
      WHERE booking_id = ?
    `;
    const result = await query(updateQuery, [payment_status, booking_id]) as any;

    if (result.affectedRows === 0) {
      throw new Error('No payment transaction found to update');
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        booking_id,
        new_status: payment_status,
        updated_transactions: result.affectedRows
      }
    });

  } catch (error) {
    throw new Error(`Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test payment notifications
 */
async function testPaymentNotifications(booking_id: number, payment_status: string) {
  if (!booking_id || !payment_status) {
    throw new Error('booking_id and payment_status are required for notification testing');
  }

  try {
    const validStatuses = ['payment_pending', 'payment_confirmed', 'payment_failed', 'payment_refunded'];
    if (!validStatuses.includes(payment_status)) {
      throw new Error(`Invalid payment status. Valid options: ${validStatuses.join(', ')}`);
    }

    const result = await createPaymentNotification(booking_id, payment_status as any);

    return NextResponse.json({
      success: true,
      message: 'Payment notification test completed',
      data: {
        booking_id,
        payment_status,
        notification_result: result
      }
    });

  } catch (error) {
    throw new Error(`Failed to test notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * GET /api/payments/test
 * Get available test actions and current test data
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Payment testing is not available in production'
    }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    message: 'Payment testing API is available',
    available_actions: [
      'create_test_booking',
      'create_test_payment', 
      'simulate_webhook',
      'update_status',
      'test_notifications'
    ],
    example_requests: {
      create_test_booking: {
        action: 'create_test_booking',
        user_id: 1,
        provider_id: 1,
        package_id: 1,
        pet_name: 'Test Pet',
        pet_type: 'Dog',
        price: 1000.00
      },
      create_test_payment: {
        action: 'create_test_payment',
        booking_id: 1,
        amount: 1000.00,
        payment_method: 'gcash'
      },
      simulate_webhook: {
        action: 'simulate_webhook',
        booking_id: 1,
        payment_status: 'succeeded',
        simulate_delay: true
      }
    }
  });
}
