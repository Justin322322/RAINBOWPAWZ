import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createBookingNotification, type BookingNotificationType } from '@/utils/comprehensiveNotificationService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const awaitedParams = await params;
    const bookingId = awaitedParams.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Try to fetch booking from service_bookings table with all related data
    const bookingQuery = `
      SELECT
        sb.id,
        sb.status,
        sb.booking_date,
        sb.booking_time,
        sb.special_requests as notes,
        sb.created_at,
        sb.price,
        sb.payment_method,
        COALESCE(sb.payment_status, 'not_paid') as payment_status,
        sb.delivery_option,
        sb.delivery_address,
        sb.delivery_distance,
        sb.delivery_fee,
        sb.pet_name,
        sb.pet_type,
        sb.cause_of_death,
        sb.pet_image_url,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        sp.package_id,
        sp.name as service_name,
        sp.processing_time
      FROM service_bookings sb
      LEFT JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
      WHERE sb.id = ?
      LIMIT 1
    `;

    const bookingResult = await query(bookingQuery, [bookingId]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingResult[0];

    // Format the response
    const formattedBooking = {
      id: booking.id,
      pet_name: booking.pet_name || 'Unknown Pet',
      pet_type: booking.pet_type || 'Unknown',
      cause_of_death: booking.cause_of_death || 'Not specified',
      pet_image_url: booking.pet_image_url,
      first_name: booking.first_name || 'Unknown',
      last_name: booking.last_name || 'User',
      email: booking.email || 'not.provided@example.com',
      phone: booking.phone || 'Not provided',
      service_name: booking.service_name || 'Unknown Service',
      status: booking.status || 'pending',
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      notes: booking.notes || 'No special notes',
      price: booking.price || 0,
      payment_method: booking.payment_method || 'cash',
      payment_status: booking.payment_status || 'not_paid',
      delivery_option: booking.delivery_option || 'pickup',
      delivery_distance: booking.delivery_distance || 0,
      delivery_fee: booking.delivery_fee || 0,
      created_at: booking.created_at,
      processing_time: booking.processing_time || 'Not specified'
    };

    return NextResponse.json(formattedBooking);

  } catch (error) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json({
      error: 'Failed to fetch booking details',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Status update endpoint for the booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const awaitedParams = await params;
    const bookingId = awaitedParams.id;

    const requestBody = await request.json();
    const { status } = requestBody;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    // Update booking status in service_bookings table
    const updateQuery = `UPDATE service_bookings SET status = ? WHERE id = ?`;
    const result = await query(updateQuery, [status, bookingId]) as any;

    if (result.affectedRows > 0) {
      // Send notification to customer about status update
      try {
        let notificationType: BookingNotificationType;

        switch (status) {
          case 'confirmed':
            notificationType = 'booking_confirmed';
            break;
          case 'in_progress':
            notificationType = 'booking_in_progress';
            break;
          case 'completed':
            notificationType = 'booking_completed';
            break;
          case 'cancelled':
            notificationType = 'booking_cancelled';
            break;
          default:
            notificationType = 'booking_pending';
        }

        // Send comprehensive notification (in-app + email)
        await createBookingNotification(parseInt(bookingId), notificationType);

      } catch (notificationError) {
        console.error('Error sending notification for booking status update:', notificationError);
        // Don't fail the status update if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'Booking status updated successfully',
        status: status
      });
    } else {
      return NextResponse.json({ error: 'Booking not found or no changes made' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({
      error: 'Failed to update booking status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
