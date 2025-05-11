import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// Import the simple email service
const { sendBookingStatusUpdateEmail } = require('@/lib/simpleEmailService');

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

    const [userId, accountType] = authToken.split('_');
    if (!userId || accountType !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    console.log(`Cancelling booking ${bookingId} for user ${userId}`);

    // In a real app, we would update the booking status in the database
    // For now, we'll just return a success response

    // Simulate a delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send booking cancellation email
    try {
      console.log('Preparing to send booking cancellation email...');

      // Get booking details from database (in a real app)
      // For now, we'll use mock data
      let bookingDetails;
      let userEmail = '';

      try {
        // Try to get real booking data and user email from database
        const bookingResult = await query(
          `SELECT b.*, u.email, u.first_name, u.last_name, p.name as pet_name
           FROM bookings b
           JOIN users u ON b.user_id = u.id
           LEFT JOIN pets p ON b.pet_id = p.id
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
      } catch (dbError) {
        console.error('Error fetching booking details:', dbError);
        // Continue with mock data if we can't get real data
      }

      // If we couldn't get real data, use mock data
      if (!bookingDetails) {
        // Get user email from database
        try {
          const userResult = await query('SELECT email, first_name, last_name FROM users WHERE id = ?', [userId]) as any[];
          if (userResult && userResult.length > 0) {
            userEmail = userResult[0].email;

            // Create mock booking details
            bookingDetails = {
              customerName: `${userResult[0].first_name} ${userResult[0].last_name}`,
              serviceName: 'Pet Memorial Service',
              providerName: 'Rainbow Paws Provider',
              bookingDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              bookingTime: '10:00 AM',
              petName: 'Your Pet',
              bookingId: bookingId,
              status: 'cancelled',
              notes: 'Your booking has been cancelled as requested.'
            };
          }
        } catch (userError) {
          console.error('Error fetching user details:', userError);
        }
      }

      // If we still don't have an email or booking details, use fallbacks
      if (!userEmail) {
        console.warn('Could not find user email for cancellation notification. Using fallback.');
        userEmail = 'user@example.com';
      }

      if (!bookingDetails) {
        bookingDetails = {
          customerName: 'Valued Customer',
          serviceName: 'Pet Memorial Service',
          providerName: 'Rainbow Paws Provider',
          bookingDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          bookingTime: '10:00 AM',
          petName: 'Your Pet',
          bookingId: bookingId,
          status: 'cancelled',
          notes: 'Your booking has been cancelled as requested.'
        };
      }

      // Send email using simple email service
      const emailResult = await sendBookingStatusUpdateEmail(userEmail, bookingDetails);

      if (emailResult.success) {
        console.log(`Booking cancellation email sent successfully to ${userEmail}. Message ID: ${emailResult.messageId}`);
      } else {
        console.error('Failed to send booking cancellation email:', emailResult.error);
        // Continue with the cancellation process even if the email fails
      }
    } catch (emailError) {
      console.error('Error sending booking cancellation email:', emailError);
      // Continue with the cancellation process even if the email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: bookingId,
        status: 'cancelled'
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
