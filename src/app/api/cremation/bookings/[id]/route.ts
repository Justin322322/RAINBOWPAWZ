import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createBookingNotification, type BookingNotificationType } from '@/utils/comprehensiveNotificationService';
import { cancelBookingWithRefund } from '@/services/bookingCancellationService';

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

    // Detect optional columns in bookings table for safe SELECT
    const columnsRows = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME IN ('pet_dob','pet_date_of_death')`
    ) as Array<{ COLUMN_NAME: string }>;
    const colSet = new Set((columnsRows || []).map(r => r.COLUMN_NAME));
    const petDobSelect = colSet.has('pet_dob') ? 'sb.pet_dob' : 'NULL as pet_dob';
    const petDodSelect = colSet.has('pet_date_of_death') ? 'sb.pet_date_of_death' : 'NULL as pet_date_of_death';

    // Build query with available columns
    const bookingQuery = `
      SELECT
        sb.id,
        sb.status,
        sb.booking_date,
        sb.booking_time,
        sb.special_requests as notes,
        sb.created_at,
        sb.total_price as price,
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
        ${petDobSelect},
        ${petDodSelect},
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        sp.package_id,
        sp.name as service_name,
        sp.processing_time
      FROM bookings sb
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

    // Fallback: if pet_dob / pet_date_of_death are missing on bookings table,
    // try to infer them from the user's pets table using creation time proximity
    let fallbackPetDob: string | null = null;
    let fallbackPetDod: string | null = null;
    try {
      if (!booking.pet_dob || !booking.pet_date_of_death) {
        // Ensure pets table exists and has date columns gracefully
        const petsTableCheck = await query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pets'"
        ) as any[];
        if (petsTableCheck && petsTableCheck[0].count > 0) {
          // Check if date columns exist
          const petColRows = await query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets'
             AND COLUMN_NAME IN ('date_of_birth','date_of_death')`
          ) as Array<{ COLUMN_NAME: string }>;
          const petCols = new Set((petColRows || []).map(r => r.COLUMN_NAME));
          const selectDob = petCols.has('date_of_birth') ? 'p.date_of_birth' : 'NULL as date_of_birth';
          const selectDod = petCols.has('date_of_death') ? 'p.date_of_death' : 'NULL as date_of_death';

          // Find the pet most likely tied to this booking: created at or just before booking
          const pets = await query(
            `SELECT p.pet_id, p.user_id, ${selectDob}, ${selectDod}, p.created_at
             FROM pets p
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC
             LIMIT 5`,
            [booking.user_id]
          ) as any[];

          if (Array.isArray(pets) && pets.length > 0) {
            // Prefer the latest pet created at or before booking.created_at (+5s tolerance)
            const bookingCreated = new Date(booking.created_at).getTime();
            const match = pets.find((pet: any) => {
              const petCreated = new Date(pet.created_at).getTime();
              return petCreated <= bookingCreated + 5000;
            }) || pets[0];

            fallbackPetDob = match?.date_of_birth || null;
            fallbackPetDod = match?.date_of_death || null;
          }
        }
      }
    } catch {
      // Silent fallback - we just won't populate if anything fails
    }

    // Format the response
    const formattedBooking = {
      id: booking.id,
      pet_name: booking.pet_name || 'Unknown Pet',
      pet_type: booking.pet_type || 'Unknown',
      cause_of_death: booking.cause_of_death || 'Not specified',
      pet_image_url: booking.pet_image_url,
      pet_dob: booking.pet_dob || fallbackPetDob || null,
      pet_date_of_death: booking.pet_date_of_death || fallbackPetDod || null,
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

    // Update booking status in bookings table
    const updateQuery = `UPDATE bookings SET status = ? WHERE id = ?`;
    const result = await query(updateQuery, [status, bookingId]) as any;

    if (result.affectedRows > 0) {

      // Send notification to customer about status update
      try {
        let notificationType: BookingNotificationType;
        let additionalData: Record<string, any> = {};

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
            // Use the booking cancellation service for provider cancellations
            try {
              const clientIp = request.headers.get('x-forwarded-for') || 
                               request.headers.get('x-real-ip') || 
                               'unknown';

              const cancellationResult = await cancelBookingWithRefund({
                bookingId: parseInt(bookingId),
                reason: 'Service provider cancelled the booking',
                cancelledBy: 0, // System cancellation - could be improved to track actual provider
                cancelledByType: 'provider',
                notes: 'Cancellation initiated by cremation service provider',
                ipAddress: clientIp
              });

              notificationType = 'booking_cancelled';
              additionalData = {
                cancelledBy: 'provider',
                source: 'provider',
                reason: 'Service provider cancelled the booking',
                refund_initiated: cancellationResult.refundInitiated,
                refund_type: cancellationResult.refundType,
                refund_id: cancellationResult.refundId
              };
            } catch (cancellationError) {
              console.error('Error processing refund for provider cancellation:', cancellationError);
              // Fall back to basic cancellation notification
              notificationType = 'booking_cancelled';
              additionalData = {
                cancelledBy: 'provider',
                source: 'provider',
                reason: 'Service provider cancelled the booking'
              };
            }
            break;
          default:
            notificationType = 'booking_pending';
        }

        // Send comprehensive notification (in-app + email)
        await createBookingNotification(parseInt(bookingId), notificationType, additionalData);

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
