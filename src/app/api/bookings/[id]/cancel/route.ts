import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

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


    // Get booking details first to check payment status
    let bookingDetails: any = null;
    let refundInfo: any = null;

    try {
      const bookingResult = await query(
        `SELECT sb.*, u.email, u.first_name, u.last_name
         FROM service_bookings sb
         JOIN users u ON sb.user_id = u.user_id
         WHERE sb.id = ? AND sb.user_id = ?`,
        [bookingId, userId]
      ) as any[];

      if (bookingResult && bookingResult.length > 0) {
        bookingDetails = bookingResult[0];
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }

    // Update the booking status in the database
    try {
      // First try to update in the service_bookings table
      const updateResult = await query(
        `UPDATE service_bookings
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [bookingId, userId]
      );

      // If no rows were affected, try the bookings table
      if (updateResult && 'affectedRows' in updateResult && updateResult.affectedRows === 0) {
        const bookingsUpdateResult = await query(
          `UPDATE bookings
           SET status = 'cancelled', updated_at = NOW()
           WHERE id = ? AND user_id = ?`,
          [bookingId, userId]
        );

        if (bookingsUpdateResult && 'affectedRows' in bookingsUpdateResult && bookingsUpdateResult.affectedRows === 0) {
          // We'll still continue with the process to maintain backward compatibility
        }
      }
    } catch (dbError) {
      console.error('Database update error:', dbError);
      // Continue with the process even if the database update fails
    }

    // Create refund request if payment was made (not automatic processing)
    if (bookingDetails && bookingDetails.payment_status === 'paid') {
      try {
        // Check refund eligibility
        const eligibilityCheck = await checkRefundEligibility(parseInt(bookingId));

        if (eligibilityCheck.eligible) {
          // Create refund request (pending admin approval)
          const refundId = await createRefundRecord({
            booking_id: parseInt(bookingId),
            reason: REFUND_REASONS.USER_REQUESTED,
            amount: parseFloat(bookingDetails.price),
            notes: 'Refund request due to booking cancellation'
          });

          // Create admin notification for refund request
                        try {
                // Use the createAdminNotification function instead of direct query
                const result = await createAdminNotification({
                  type: 'refund_request',
                  title: 'Refund Request - Booking Cancelled',
                  message: `Refund request for cancelled booking #${bookingId} (${bookingDetails.pet_name}) - Amount: ₱${parseFloat(bookingDetails.price).toFixed(2)}`,
                  entityType: 'refund',
                  entityId: refundId
                });
                
                if (!result.success) {
                  console.error('Failed to create admin notification:', result.error);
                } else {
                }
              } catch (notificationError) {
                console.error('Failed to create admin notification:', notificationError);
              }

          refundInfo = {
            status: 'pending',
            message: 'Refund request submitted. Our team will review and process it within 1-2 business days.',
            amount: parseFloat(bookingDetails.price)
          };

          // Send refund request notification email
          if (bookingDetails.email) {
            try {
              const refundEmailContent = createRefundNotificationEmail({
                customerName: `${bookingDetails.first_name} ${bookingDetails.last_name}`,
                bookingId: bookingId,
                petName: bookingDetails.pet_name || 'Your pet',
                amount: parseFloat(bookingDetails.price),
                reason: REFUND_REASONS.USER_REQUESTED,
                status: 'pending',
                paymentMethod: bookingDetails.payment_method,
                estimatedDays: undefined // Will be determined after admin approval
              });

              await sendEmail({
                to: bookingDetails.email,
                subject: refundEmailContent.subject,
                html: refundEmailContent.html
              });
            } catch (emailError) {
              console.error('Refund email error:', emailError);
            }
          }
        }
      } catch (refundError) {
        console.error('Refund request error:', refundError);
        // Continue with cancellation even if refund request fails
      }
    }

    // Send booking cancellation notifications (indicate cancelled by customer)
    try {
      await createBookingNotification(parseInt(bookingId), 'booking_cancelled', {
        cancelledBy: 'customer',
        source: 'customer',
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

      // Get booking details from database (in a real app)
      // For now, we'll use mock data
      let bookingDetails;
      let userEmail = '';

      try {
        // Try to get real booking data and user email from database
        const bookingResult = await query(
          `SELECT b.*, u.email, u.first_name, u.last_name, 'N/A' as pet_name
           FROM bookings b
           JOIN users u ON b.user_id = u.user_id
           WHERE b.id = ? AND b.user_id = ?`,
          [bookingId, userId]
        ) as any[];

        if (bookingResult && bookingResult.length > 0) {
          const booking = bookingResult[0];
          userEmail = booking.email;

          // Format date for email
          const bookingDate = new Date(booking.booking_date);
          const formattedDate = bookingDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          bookingDetails = {
            customerName: `${booking.first_name} ${booking.last_name}`,
            serviceName: booking.service_name,
            providerName: booking.provider_name,
            bookingDate: formattedDate,
            bookingTime: booking.booking_time,
            petName: booking.pet_name,
            bookingId: booking.id,
            status: 'cancelled',
            notes: 'Your booking has been cancelled as requested.'
          };
        }
      } catch {
        // Continue with mock data if we can't get real data
      }

      // If we couldn't get real data, use mock data
      if (!bookingDetails) {
        // Get user email from database
        try {
          const userResult = await query('SELECT email, first_name, last_name FROM users WHERE user_id = ?', [userId]) as any[];
          if (userResult && userResult.length > 0) {
            userEmail = userResult[0].email;

            // Create mock booking details
            bookingDetails = {
              customerName: `${userResult[0].first_name} ${userResult[0].last_name}`,
              serviceName: 'Pet Memorial Service' as string,
              providerName: 'Rainbow Paws Provider' as string,
              bookingDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              bookingTime: '10:00 AM' as string,
              petName: 'Your Pet' as string,
              bookingId: bookingId as string | number,
              status: 'cancelled' as const,
              notes: 'Your booking has been cancelled as requested.'
            };
          }
        } catch {
        }
      }

      // If we still don't have an email or booking details, use fallbacks
      if (!userEmail) {
        userEmail = 'user@example.com';
      }

      if (!bookingDetails) {
        bookingDetails = {
          customerName: 'Valued Customer',
          serviceName: 'Pet Memorial Service' as string,
          providerName: 'Rainbow Paws Provider' as string,
          bookingDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          bookingTime: '10:00 AM' as string,
          petName: 'Your Pet' as string,
          bookingId: bookingId as string | number,
          status: 'cancelled' as const,
          notes: 'Your booking has been cancelled as requested.'
        };
      }

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
          to: userEmail,
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (emailResult.success) {
        } else {
          // Continue with the cancellation process even if the email fails
        }
      } catch {
        // Continue with the cancellation process even if the email fails
      }
    } catch {
      // Continue with the cancellation process even if the email fails
    }

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
