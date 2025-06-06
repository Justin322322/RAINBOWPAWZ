import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { getAllTestSplitPayments, getTestSplitPaymentStatus } from '@/services/testPaymentSplittingService';

/**
 * GET - Get test split payment analytics and monitoring data
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a JWT token or old format
    let userId = null;
    let accountType = null;

    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    // Get test split payment analytics
    const testTransactions = await getAllTestSplitPayments();
    
    const summary = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        SUM(platform_fee_amount) as total_platform_fees,
        SUM(provider_amount) as total_provider_payouts,
        COUNT(CASE WHEN split_status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN split_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN split_status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN main_payment_id LIKE 'sim_split_%' THEN 1 END) as simulation_count
      FROM split_payment_transactions
    `) as any[];

    // Get provider breakdown
    const providerBreakdown = await query(`
      SELECT 
        sp.name as provider_name,
        sp.provider_id,
        COUNT(spt.id) as transaction_count,
        SUM(spt.provider_amount) as total_earnings,
        SUM(spt.platform_fee_amount) as total_fees_generated,
        AVG(spt.provider_amount) as avg_transaction_amount
      FROM split_payment_transactions spt
      JOIN service_bookings sb ON spt.booking_id = sb.id
      JOIN service_providers sp ON sb.provider_id = sp.provider_id
      GROUP BY sp.provider_id, sp.name
      ORDER BY total_earnings DESC
    `) as any[];

    // Add simulation flags to transactions
    const transactionsWithFlags = testTransactions.map((transaction: any) => ({
      ...transaction,
      is_simulation: transaction.main_payment_id?.startsWith('sim_split_') || false
    }));

    return NextResponse.json({
      success: true,
      test_split_payments: {
        transactions: transactionsWithFlags,
        summary: summary[0] || {
          total_transactions: 0,
          total_revenue: 0,
          total_platform_fees: 0,
          total_provider_payouts: 0,
          completed_count: 0,
          pending_count: 0,
          failed_count: 0,
          simulation_count: 0
        },
        provider_breakdown: providerBreakdown
      },
      configuration: {
        split_payments_enabled: process.env.ENABLE_SPLIT_PAYMENTS === 'true',
        seeds_configured: !!process.env.PAYMONGO_SEEDS_SECRET_KEY,
        main_merchant_id: process.env.PAYMONGO_MAIN_MERCHANT_ID || 'Not configured',
        test_provider_ids: {
          provider_1: process.env.TEST_PROVIDER_1_MERCHANT_ID || 'Not configured',
          provider_2: process.env.TEST_PROVIDER_2_MERCHANT_ID || 'Not configured'
        },
        platform_commission: process.env.DEFAULT_PLATFORM_COMMISSION || '15.00'
      }
    });
  } catch (error) {
    console.error('Error fetching test split payment data:', error);
    return NextResponse.json({
      error: 'Failed to fetch test split payment data'
    }, { status: 500 });
  }
}

/**
 * POST - Trigger a test split payment for a specific booking
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authentication format
    let accountType = null;
    if (authToken.includes('.')) {
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      accountType = payload?.accountType || null;
    } else {
      const parts = authToken.split('_');
      if (parts.length === 2) {
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    const { booking_id } = await request.json();

    if (!booking_id) {
      return NextResponse.json({
        error: 'booking_id is required'
      }, { status: 400 });
    }

    // Get booking details
    const bookingResult = await query(`
      SELECT sb.*, sp.provider_id, sp.name as provider_name
      FROM service_bookings sb
      JOIN service_providers sp ON sb.provider_id = sp.provider_id
      WHERE sb.id = ?
    `, [booking_id]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found'
      }, { status: 404 });
    }

    const booking = bookingResult[0];

    // Check if split payment already exists
    const existingSplit = await getTestSplitPaymentStatus(booking_id);
    if (existingSplit.found) {
      return NextResponse.json({
        error: 'Split payment already exists for this booking',
        existing_split: existingSplit
      }, { status: 400 });
    }

    // Create test split payment
    const { createTestSplitPayment } = await import('@/services/testPaymentSplittingService');
    
    const splitResult = await createTestSplitPayment({
      booking_id: booking_id,
      provider_id: booking.provider_id,
      amount: booking.price,
      customer_info: {
        name: `${booking.first_name || ''} ${booking.last_name || ''}`.trim(),
        email: booking.email
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test split payment created successfully',
      split_payment: splitResult,
      booking_details: {
        booking_id: booking.id,
        pet_name: booking.pet_name,
        service_type: booking.service_type,
        provider_name: booking.provider_name,
        total_amount: booking.price
      }
    });

  } catch (error) {
    console.error('Error creating test split payment:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create test split payment'
    }, { status: 500 });
  }
} 