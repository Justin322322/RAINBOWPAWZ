import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createPaymentNotification } from '@/utils/comprehensiveNotificationService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get booking ID from params
    const bookingId = await Promise.resolve(params.id);

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Parse request body
    const requestBody = await request.json();
    const { paymentStatus } = requestBody;

    // Validate payment status
    if (!paymentStatus || !['not_paid', 'partially_paid', 'paid', 'awaiting_payment_confirmation', 'refunded', 'failed'].includes(paymentStatus)) {
      return NextResponse.json({
        error: 'Valid payment status is required',
        details: 'Payment status must be one of: not_paid, partially_paid, paid, awaiting_payment_confirmation, refunded, failed'
      }, { status: 400 });
    }


    // Check if bookings table exists
    const tableCheckQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
    `;
    const tableResult = await query(tableCheckQuery) as any[];
    const hasServiceBookings = tableResult[0].count > 0;

    if (!hasServiceBookings) {
      return NextResponse.json({
        error: 'Service bookings table not found',
        details: 'The bookings table does not exist in the database'
      }, { status: 500 });
    }

    // Check if payment_status column exists
    const columnCheckQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'payment_status'
    `;
    const columnResult = await query(columnCheckQuery) as any[];
    const hasPaymentStatusColumn = columnResult[0].count > 0;

    if (!hasPaymentStatusColumn) {

      // Instead of returning an error, return a success response with a note
      // This allows the client to continue tracking payment status locally
      return NextResponse.json({
        success: true,
        message: 'Payment status tracked in client only',
        paymentStatus: paymentStatus,
        note: 'The payment_status column does not exist in the database. Status is only tracked in the client.'
      });
    }

    // Update payment status in bookings table
    const updateQuery = `UPDATE bookings SET payment_status = ? WHERE id = ?`;
    const result = await query(updateQuery, [paymentStatus, bookingId]) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json({
        error: 'Booking not found or could not be updated',
        details: 'The specified booking ID does not exist or could not be updated'
      }, { status: 404 });
    }

    // Get the updated booking details
    const getBookingQuery = `
      SELECT payment_method, payment_status
      FROM bookings
      WHERE id = ?
    `;
    const bookingResult = await query(getBookingQuery, [bookingId]) as any[];
    const bookingDetails = bookingResult[0];

    // Create payment notification
    try {
      let notificationType: 'payment_pending' | 'payment_confirmed' | 'payment_failed';

      switch (paymentStatus) {
        case 'paid':
          notificationType = 'payment_confirmed';
          break;
        case 'partially_paid':
          notificationType = 'payment_pending';
          break;
        case 'not_paid':
        default:
          notificationType = 'payment_pending';
          break;
      }

      await createPaymentNotification(parseInt(bookingId), notificationType);
    } catch (notificationError) {
      // Log notification errors but don't fail the payment update
      console.error('Error creating payment notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      paymentStatus: paymentStatus,
      paymentMethod: bookingDetails.payment_method
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update payment status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
