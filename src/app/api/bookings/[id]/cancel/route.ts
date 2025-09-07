import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query, withTransaction } from '@/lib/db';

// Import the email templates
import { createBookingStatusUpdateEmail } from '@/lib/emailTemplates';
// Import the consolidated email service
import { sendEmail } from '@/lib/consolidatedEmailService';
import { createBookingNotification } from '@/utils/comprehensiveNotificationService';
// Import payment service for automatic refunds
import { processAutomaticRefund } from '@/services/paymentService';

export async function POST(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const bookingId = pathParts[pathParts.length - 2]; // -2 because the last part is 'cancel'
  try {
    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
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

    if (!userId || accountType !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }



    // First, validate that the booking exists and belongs to the user
    const bookingExistsQuery = `
      SELECT id, status, payment_status, price, pet_name
      FROM bookings
      WHERE id = ? AND user_id = ?
    `;
    const existingBooking = await query(bookingExistsQuery, [bookingId, userId]) as any[];

    if (!existingBooking || existingBooking.length === 0) {
      return NextResponse.json({
        error: 'Booking not found or does not belong to this user'
      }, { status: 404 });
    }

    const bookingData = existingBooking[0];

    // Check if booking is already cancelled
    if (bookingData.status === 'cancelled') {
      return NextResponse.json({
        error: 'Booking is already cancelled'
      }, { status: 400 });
    }

    // Check if booking can be cancelled (only pending or confirmed bookings can be cancelled)
    if (!['pending', 'confirmed'].includes(bookingData.status)) {
      return NextResponse.json({
        error: `Cannot cancel booking with status: ${bookingData.status}`
      }, { status: 400 });
    }

    // Perform cancellation operations in a transaction for consistency
    const _cancellationResult = await withTransaction(async (transaction) => {
      // Update the booking status in the database
      const updateResult = await transaction.query(
        `UPDATE bookings
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = ? AND user_id = ? AND status IN ('pending', 'confirmed')`,
        [bookingId, userId]
      ) as any;

      // Verify the update was successful
      if (!updateResult || updateResult.affectedRows === 0) {
        throw new Error('Failed to update booking status - it may have already been processed');
      }

      return {};
    });

    // Process refund handling: for gcash auto-refund, for manual QR create pending refund record
    if (bookingData.payment_status === 'paid') {
      try {
        if (bookingData.payment_method === 'gcash') {
          const refundResult = await processAutomaticRefund(parseInt(bookingId));
          console.log('Automatic refund result (gcash):', refundResult);
        } else if (bookingData.payment_method === 'qr_manual' || bookingData.payment_method === 'qr_transfer') {
          // Create a pending refund record for manual QR to be approved by provider
          // Fetch latest receipt_path if available
          const receiptRows = await query(
            `SELECT receipt_path FROM payment_receipts WHERE booking_id = ? ORDER BY uploaded_at DESC LIMIT 1`,
            [bookingId]
          ) as any[];
          const receiptPath = receiptRows?.[0]?.receipt_path || '';
          const notes = receiptPath
            ? `User cancelled - awaiting provider approval. Receipt: ${receiptPath}`
            : 'User cancelled - awaiting provider approval.';

          // Insert refund row with notes including receipt link
          const priceRows = await query(`SELECT price FROM service_bookings WHERE id = ?`, [bookingId]) as any[];
          const amount = priceRows?.[0]?.price || 0;
          await query(
            `INSERT INTO refunds (booking_id, amount, reason, status, payment_method, notes)
             VALUES (?, ?, 'requested_by_customer', 'pending', 'qr_manual', ?)`,
            [bookingId, amount, notes]
          );
        }
      } catch (refundError) {
        console.error('Refund handling on cancel error:', refundError);
        // Continue with cancellation even if refund creation fails
      }
    }

    // Send booking cancellation notifications
    try {
      await createBookingNotification(parseInt(bookingId), 'booking_cancelled', {
        reason: 'Customer requested cancellation'
      });
    } catch (notificationError) {
      console.error('Error sending cancellation notifications:', notificationError);
      // Continue with the process even if notifications fail
    }

    // Simulate a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send booking cancellation email
    try {
      // Get user details for email
      const userResult = await query('SELECT email, first_name, last_name FROM users WHERE user_id = ?', [userId]) as any[];

      if (!userResult || userResult.length === 0) {
        console.error('User not found for booking cancellation email');
        // Continue with the process even if email fails
      } else {
        const userData = userResult[0];

        // Create booking details for email using validated data
        const bookingDetails = {
          customerName: `${userData.first_name} ${userData.last_name}`,
          serviceName: 'Pet Memorial Service',
          providerName: 'Rainbow Paws Provider',
          bookingDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          bookingTime: '10:00 AM',
          petName: bookingData.pet_name || 'Your Pet',
          bookingId: bookingId,
          status: 'cancelled',
          notes: 'Your booking has been cancelled as requested.'
        };

        // Create email content using template
        const emailContent = createBookingStatusUpdateEmail({
          customerName: bookingDetails.customerName,
          serviceName: bookingDetails.serviceName,
          providerName: bookingDetails.providerName,
          bookingDate: bookingDetails.bookingDate,
          bookingTime: bookingDetails.bookingTime,
          petName: bookingDetails.petName,
          bookingId: bookingDetails.bookingId,
          status: 'cancelled' as const,
          notes: bookingDetails.notes
        });

        // Send email using unified email service
        try {
          const emailResult = await sendEmail({
            to: userData.email,
            subject: emailContent.subject,
            html: emailContent.html
          });

          if (!emailResult.success) {
            console.error('Failed to send cancellation email');
          }
        } catch (emailError) {
          console.error('Error sending cancellation email:', emailError);
        }
      }
    } catch {
      // Continue with the cancellation process even if the email fails
    }

    // Return success response (refund details may be handled separately depending on payment method)
    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: bookingId,
        status: 'cancelled'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
