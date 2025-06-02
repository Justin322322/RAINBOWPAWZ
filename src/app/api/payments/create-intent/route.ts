import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { createPayment } from '@/services/paymentService';
import { CreatePaymentRequest } from '@/types/payment';

export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Parse request body
    const body = await request.json();
    const {
      booking_id,
      amount,
      currency = 'PHP',
      payment_method,
      description,
      customer_info,
      return_url,
      cancel_url
    } = body;

    // Validate required fields
    if (!booking_id || !amount || !payment_method) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'booking_id, amount, and payment_method are required'
      }, { status: 400 });
    }

    // Validate payment method
    if (!['gcash', 'cash'].includes(payment_method)) {
      return NextResponse.json({
        error: 'Invalid payment method',
        details: 'payment_method must be either "gcash" or "cash"'
      }, { status: 400 });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({
        error: 'Invalid amount',
        details: 'Amount must be a positive number'
      }, { status: 400 });
    }

    // For GCash payments, validate minimum and maximum amounts
    if (payment_method === 'gcash') {
      if (amount < 1) {
        return NextResponse.json({
          error: 'Amount too low',
          details: 'Minimum amount for GCash payments is PHP 1.00'
        }, { status: 400 });
      }

      if (amount > 50000) {
        return NextResponse.json({
          error: 'Amount too high',
          details: 'Maximum amount for GCash payments is PHP 50,000.00'
        }, { status: 400 });
      }
    }

    // Create payment request
    const paymentRequest: CreatePaymentRequest = {
      booking_id: parseInt(booking_id),
      amount: parseFloat(amount.toString()),
      currency,
      payment_method,
      description: description || `Payment for booking #${booking_id}`,
      customer_info,
      return_url,
      cancel_url
    };

    console.log('Payment request created:', {
      booking_id: paymentRequest.booking_id,
      amount: paymentRequest.amount,
      payment_method: paymentRequest.payment_method,
      description: paymentRequest.description
    });

    // Process payment
    const paymentResponse = await createPayment(paymentRequest);

    if (!paymentResponse.success) {
      return NextResponse.json({
        error: 'Payment creation failed',
        details: paymentResponse.error
      }, { status: 400 });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        transaction_id: paymentResponse.transaction_id,
        payment_intent_id: paymentResponse.payment_intent_id,
        source_id: paymentResponse.source_id,
        checkout_url: paymentResponse.checkout_url,
        status: paymentResponse.status,
        message: paymentResponse.message
      }
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking_id from query params
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      return NextResponse.json({
        error: 'Missing booking_id parameter'
      }, { status: 400 });
    }

    // Get payment status
    const { getPaymentStatus } = await import('@/services/paymentService');
    const paymentStatus = await getPaymentStatus(parseInt(bookingId));

    if (!paymentStatus) {
      return NextResponse.json({
        error: 'Payment status not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    console.error('Payment status retrieval error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
