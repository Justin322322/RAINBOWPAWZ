import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { retryFailedRefunds, validatePaymentDataForRefund } from '@/services/refundService';

/**
 * POST - Retry all failed PayMongo refunds that are eligible for retry
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a JWT token or old format
    let _userId = null;
    let accountType = null;

    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      _userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        _userId = parts[0];
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { validatePaymentData = false } = body;

    let validationResults = { validated: 0, failed: 0 };

    // Optionally validate payment data first
    if (validatePaymentData) {
      console.log('Validating payment data before retry...');
      
      // Get bookings with missing payment IDs
      const { query } = await import('@/lib/db');
      const bookingsToValidate = await query(`
        SELECT DISTINCT sb.id
        FROM service_bookings sb
        JOIN payment_transactions pt ON sb.id = pt.booking_id
        WHERE sb.payment_method = 'gcash' 
        AND sb.payment_status = 'paid'
        AND pt.status = 'succeeded'
        AND pt.provider_transaction_id IS NULL
        AND (pt.payment_intent_id IS NOT NULL OR pt.source_id IS NOT NULL)
      `) as any[];

      for (const booking of bookingsToValidate) {
        try {
          const validated = await validatePaymentDataForRefund(booking.id);
          if (validated) {
            validationResults.validated++;
          } else {
            validationResults.failed++;
          }
        } catch (error) {
          console.error(`Error validating booking ${booking.id}:`, error);
          validationResults.failed++;
        }
      }

      console.log(`Payment validation results: ${validationResults.validated} validated, ${validationResults.failed} failed`);
    }

    // Retry failed refunds
    console.log('Starting retry of failed PayMongo refunds...');
    const retryResults = await retryFailedRefunds();

    return NextResponse.json({
      success: true,
      message: 'Refund retry process completed',
      results: {
        retries: retryResults,
        validation: validatePaymentData ? validationResults : null
      }
    });

  } catch (error) {
    console.error('Error in retry failed refunds:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Get status of failed refunds that can be retried
 */
export async function GET(request: NextRequest) {
  try {
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

    const { query } = await import('@/lib/db');

    // Get retryable refunds
    const retryableRefunds = await query(`
      SELECT r.id, r.booking_id, r.amount, r.reason, r.status, r.updated_at, r.notes
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE r.status = 'pending' 
      AND sb.payment_method = 'gcash'
      AND r.notes LIKE '%Will retry automatically%'
      ORDER BY r.updated_at DESC
    `) as any[];

    // Get failed refunds that can't be retried
    const failedRefunds = await query(`
      SELECT r.id, r.booking_id, r.amount, r.reason, r.status, r.updated_at, r.notes
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE r.status = 'failed' 
      AND sb.payment_method = 'gcash'
      ORDER BY r.updated_at DESC
      LIMIT 20
    `) as any[];

    // Get bookings with missing payment data
    const missingPaymentData = await query(`
      SELECT DISTINCT sb.id, sb.price, pt.payment_intent_id, pt.source_id
      FROM service_bookings sb
      JOIN payment_transactions pt ON sb.id = pt.booking_id
      WHERE sb.payment_method = 'gcash' 
      AND sb.payment_status = 'paid'
      AND pt.status = 'succeeded'
      AND pt.provider_transaction_id IS NULL
      AND (pt.payment_intent_id IS NOT NULL OR pt.source_id IS NOT NULL)
      LIMIT 10
    `) as any[];

    return NextResponse.json({
      success: true,
      data: {
        retryable: retryableRefunds,
        failed: failedRefunds,
        missingPaymentData: missingPaymentData,
        summary: {
          retryableCount: retryableRefunds.length,
          failedCount: failedRefunds.length,
          missingDataCount: missingPaymentData.length
        }
      }
    });

  } catch (error) {
    console.error('Error getting retry status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 