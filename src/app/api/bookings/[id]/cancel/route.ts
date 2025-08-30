import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query, withTransaction } from '@/lib/db';

// Import the email templates
import { createBookingStatusUpdateEmail, createRefundNotificationEmail } from '@/lib/emailTemplates';
// Import the consolidated email service
import { sendEmail } from '@/lib/consolidatedEmailService';
// Import refund services
import {
  checkRefundEligibility,
  createRefundRecord
} from '@/services/refundService';
import { REFUND_REASONS } from '@/types/refund';
import { createAdminNotification } from '@/utils/adminNotificationService';
// Import comprehensive notification service
import { createBookingNotification } from '@/utils/comprehensiveNotificationService';

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


    // Initialize refund info variable
    let refundInfo: any = null;

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
    const cancellationResult = await withTransaction(async (transaction) => {
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

      let refundId: number | null = null;

      // Create refund request if payment was made
      if (bookingData.payment_status === 'paid') {
        try {
          // Check refund eligibility
          const eligibilityCheck = await checkRefundEligibility(parseInt(bookingId));

          if (eligibilityCheck.eligible) {
            // Create refund request (pending admin approval)
            refundId = await createRefundRecord({
              booking_id: parseInt(bookingId),
              reason: REFUND_REASONS.USER_REQUESTED,
              amount: parseFloat(bookingData.price),
              notes: 'Refund request due to booking cancellation'
            });
          }
        } catch (refundError) {
          console.error('Refund request error:', refundError);
          // Continue with cancellation even if refund request fails
        }
      }

      return { refundId };
    });

    // Handle refund notification outside transaction (not critical for booking integrity)
    let refundInfo: any = null;
    if (cancellationResult.refundId) {
      try {
        // Create admin notification for refund request
        const result = await createAdminNotification({
          type: 'refund_request',
          title: 'Refund Request - Booking Cancelled',
          message: `Refund request for cancelled booking #${bookingId} (${bookingData.pet_name}) - Amount: ₱${parseFloat(bookingData.price).toFixed(2)}`,
          entityType: 'refund',
          entityId: cancellationResult.refundId
        });

        if (!result.success) {
          console.error('Failed to create admin notification:', result.error);
        }

        refundInfo = {
          status: 'pending',
          message: 'Refund request submitted. Our team will review and process it within 1-2 business days.',
          amount: parseFloat(bookingData.price)
        };

        // Send refund request notification email
        try {
          const userResult = await query('SELECT email, first_name, last_name FROM users WHERE user_id = ?', [userId]) as any[];
          if (userResult && userResult.length > 0) {
            const userData = userResult[0];
            const refundEmailContent = createRefundNotificationEmail({
              customerName: `${userData.first_name} ${userData.last_name}`,
              bookingId: bookingId,
              petName: bookingData.pet_name || 'Your pet',
              amount: parseFloat(bookingData.price),
              reason: REFUND_REASONS.USER_REQUESTED,
              status: 'pending',
              paymentMethod: 'N/A',
              estimatedDays: undefined
            });

            await sendEmail({
              to: userData.email,
              subject: refundEmailContent.subject,
              html: refundEmailContent.html
            });
          }
        } catch (emailError) {
          console.error('Refund email error:', emailError);
        }
      } catch (notificationError) {
        console.error('Failed to create admin notification:', notificationError);
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

    // Return success response
    return NextResponse.json({
      success: true,
      message: refundInfo
        ? `Booking cancelled successfully. ${refundInfo.message}`
        : 'Booking cancelled successfully',
      booking: {
        id: bookingId,
        status: 'cancelled'
      },
      refund: refundInfo ? {
        status: refundInfo.status,
        amount: refundInfo.amount,
        message: refundInfo.message
      } : null
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
