import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * Cleanup orphaned payment records and reset booking payment status
 * This endpoint helps fix issues where bookings are marked as paid but have no successful payment transactions
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [_userId, accountType] = authToken.split('_');

    // Only allow admin users to run cleanup
    if (accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only admin users can run payment cleanup'
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { bookingId, dryRun = true } = body;

    if (bookingId) {
      // Clean up specific booking
      return await cleanupSpecificBooking(bookingId, dryRun);
    } else {
      // Clean up all orphaned payments
      return await cleanupAllOrphanedPayments(dryRun);
    }

  } catch (error) {
    console.error('Payment cleanup error:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function cleanupSpecificBooking(bookingId: number, dryRun: boolean) {
  // Check if booking exists and its payment status
  const bookingQuery = `
    SELECT id, payment_status, payment_method
    FROM service_bookings
    WHERE id = ?
  `;
  const bookingResult = await query(bookingQuery, [bookingId]) as any[];

  if (bookingResult.length === 0) {
    return NextResponse.json({
      error: 'Booking not found'
    }, { status: 404 });
  }

  const booking = bookingResult[0];

  // Check for successful payment transactions
  const successfulPaymentQuery = `
    SELECT id, status, amount
    FROM payment_transactions
    WHERE booking_id = ? AND status = 'succeeded'
  `;
  const successfulPayments = await query(successfulPaymentQuery, [bookingId]) as any[];

  // Check for any payment transactions
  const allPaymentQuery = `
    SELECT id, status, amount, created_at
    FROM payment_transactions
    WHERE booking_id = ?
    ORDER BY created_at DESC
  `;
  const allPayments = await query(allPaymentQuery, [bookingId]) as any[];

  const result = {
    bookingId,
    currentPaymentStatus: booking.payment_status,
    paymentMethod: booking.payment_method,
    successfulPayments: successfulPayments.length,
    totalPaymentAttempts: allPayments.length,
    paymentTransactions: allPayments,
    actionTaken: null as string | null
  };

  // If booking is marked as paid but has no successful payments, reset it
  if (booking.payment_status === 'paid' && successfulPayments.length === 0) {
    if (!dryRun) {
      await query(
        'UPDATE service_bookings SET payment_status = ? WHERE id = ?',
        ['not_paid', bookingId]
      );
      result.actionTaken = 'Reset payment status from paid to not_paid';
    } else {
      result.actionTaken = 'Would reset payment status from paid to not_paid (dry run)';
    }
  } else if (booking.payment_status === 'not_paid' && successfulPayments.length > 0) {
    if (!dryRun) {
      await query(
        'UPDATE service_bookings SET payment_status = ? WHERE id = ?',
        ['paid', bookingId]
      );
      result.actionTaken = 'Updated payment status from not_paid to paid';
    } else {
      result.actionTaken = 'Would update payment status from not_paid to paid (dry run)';
    }
  } else {
    result.actionTaken = 'No action needed - payment status is consistent';
  }

  return NextResponse.json({
    success: true,
    result
  });
}

async function cleanupAllOrphanedPayments(dryRun: boolean) {
  // Find all bookings marked as paid but with no successful payment transactions
  const orphanedQuery = `
    SELECT sb.id, sb.payment_status, sb.payment_method, sb.created_at
    FROM service_bookings sb
    LEFT JOIN payment_transactions pt ON sb.id = pt.booking_id AND pt.status = 'succeeded'
    WHERE sb.payment_status = 'paid' AND pt.id IS NULL
  `;
  const orphanedBookings = await query(orphanedQuery) as any[];

  // Find bookings marked as not_paid but with successful payment transactions
  const inconsistentQuery = `
    SELECT sb.id, sb.payment_status, sb.payment_method, sb.created_at, pt.id as payment_id
    FROM service_bookings sb
    INNER JOIN payment_transactions pt ON sb.id = pt.booking_id AND pt.status = 'succeeded'
    WHERE sb.payment_status = 'not_paid'
  `;
  const inconsistentBookings = await query(inconsistentQuery) as any[];

  const result = {
    orphanedBookings: orphanedBookings.length,
    inconsistentBookings: inconsistentBookings.length,
    orphanedDetails: orphanedBookings,
    inconsistentDetails: inconsistentBookings,
    actionsPerformed: [] as string[]
  };

  if (!dryRun) {
    // Reset orphaned bookings
    for (const booking of orphanedBookings) {
      await query(
        'UPDATE service_bookings SET payment_status = ? WHERE id = ?',
        ['not_paid', booking.id]
      );
      result.actionsPerformed.push(`Reset booking ${booking.id} from paid to not_paid`);
    }

    // Fix inconsistent bookings
    for (const booking of inconsistentBookings) {
      await query(
        'UPDATE service_bookings SET payment_status = ? WHERE id = ?',
        ['paid', booking.id]
      );
      result.actionsPerformed.push(`Updated booking ${booking.id} from not_paid to paid`);
    }
  } else {
    result.actionsPerformed.push(`Dry run: Would reset ${orphanedBookings.length} orphaned bookings`);
    result.actionsPerformed.push(`Dry run: Would fix ${inconsistentBookings.length} inconsistent bookings`);
  }

  return NextResponse.json({
    success: true,
    result
  });
}

/**
 * GET endpoint to check payment status without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({
        error: 'Missing bookingId parameter'
      }, { status: 400 });
    }

    // Always run as dry run for GET requests
    return await cleanupSpecificBooking(parseInt(bookingId), true);

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
