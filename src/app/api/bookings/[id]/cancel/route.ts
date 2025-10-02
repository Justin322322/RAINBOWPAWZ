import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';
import { cancelBookingWithRefund } from '@/services/bookingCancellationService';

// Import the email templates
import { createBookingStatusUpdateEmail } from '@/lib/emailTemplates';
// Import the consolidated email service
import { sendEmail } from '@/lib/consolidatedEmailService';
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



    // First, validate that the booking exists and belongs to the user
    const bookingExistsQuery = `
      SELECT 
        id, 
        status, 
        COALESCE(payment_status, 'not_paid') as payment_status, 
        COALESCE(total_price, base_price, 0) as price, 
        pet_name
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

    // Get client IP for audit trail
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Use the new booking cancellation service with refund processing
    const cancellationResult = await cancelBookingWithRefund({
      bookingId: parseInt(bookingId),
      reason: 'Customer requested cancellation',
      cancelledBy: parseInt(userId),
      cancelledByType: 'customer',
      notes: 'Self-service cancellation via web portal',
      ipAddress: clientIp
    });

    if (!cancellationResult.success) {
      return NextResponse.json({
        error: cancellationResult.message || 'Failed to cancel booking',
        details: cancellationResult.error
      }, { status: 400 });
    }

    // Send booking cancellation notifications_unified (fallback if not sent by cancellation service)
    try {
      await createBookingNotification(parseInt(bookingId), 'booking_cancelled', {
        reason: 'Customer requested cancellation',
        refund_initiated: cancellationResult.refundInitiated,
        refund_type: cancellationResult.refundType,
        refund_id: cancellationResult.refundId
      });
    } catch (notificationError) {
      console.error('Error sending cancellation notifications_unified:', notificationError);
      // Continue with the process even if notifications_unified fail
    }

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

    // Return success response with refund information
    return NextResponse.json({
      success: true,
      message: cancellationResult.message,
      booking: {
        id: bookingId,
        status: 'cancelled'
      },
      refund_initiated: cancellationResult.refundInitiated,
      refund_id: cancellationResult.refundId,
      refund_type: cancellationResult.refundType,
      refund_instructions: cancellationResult.refundInstructions
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
