import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Properly await the params to avoid the NextJS warning
    const bookingId = await Promise.resolve(params.id);
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    console.log(`Fetching booking with ID: ${bookingId}`);

    // Check which table structure is available
    const tablesCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('service_bookings', 'bookings')
    `;
    const tablesResult = await query(tablesCheckQuery) as any[];
    const tableNames = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    
    const hasServiceBookings = tableNames.includes('service_bookings');
    const hasBookings = tableNames.includes('bookings');
    
    console.log(`Available tables - service_bookings: ${hasServiceBookings}, bookings: ${hasBookings}`);
    
    let bookingData = null;
    
    // First try service_bookings if available
    if (hasServiceBookings) {
      // Using service_bookings table
      const serviceBookingQuery = `
        SELECT sb.id, sb.status, sb.booking_date, sb.booking_time, sb.special_requests as notes, 
               sb.created_at, sb.pet_name, sb.pet_type, sb.cause_of_death,
               sb.pet_image_url, sb.payment_method, sb.delivery_option, sb.delivery_distance,
               sb.delivery_fee, sb.price,
               u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
               p.id as package_id, p.name as service_name, p.processing_time
        FROM service_bookings sb
        JOIN users u ON sb.user_id = u.id
        LEFT JOIN service_packages p ON sb.package_id = p.id
        WHERE sb.id = ?
      `;
      const serviceBookingResult = await query(serviceBookingQuery, [bookingId]) as any[];
      
      if (serviceBookingResult && serviceBookingResult.length > 0) {
        bookingData = serviceBookingResult[0];
        console.log(`Found booking in service_bookings table: ${bookingData.id}`);
      } else {
        console.log(`Booking not found in service_bookings table, id: ${bookingId}`);
      }
    }
    
    // If not found in service_bookings, try bookings table
    if (!bookingData && hasBookings) {
      // Using traditional bookings table
      const bookingsQuery = `
        SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests as notes, 
               b.created_at, b.total_amount as price,
               u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
               sp.id as package_id, sp.name as service_name, sp.processing_time,
               p.name as pet_name, p.species as pet_type, p.breed as pet_breed
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN service_packages sp ON b.business_service_id = sp.id
        LEFT JOIN pets p ON p.user_id = u.id AND p.created_at <= DATE_ADD(b.created_at, INTERVAL 5 SECOND)
        WHERE b.id = ?
        ORDER BY p.created_at DESC
        LIMIT 1
      `;
      const bookingsResult = await query(bookingsQuery, [bookingId]) as any[];
      
      if (bookingsResult && bookingsResult.length > 0) {
        bookingData = bookingsResult[0];
        console.log(`Found booking in bookings table: ${bookingData.id}`);
      } else {
        console.log(`Booking not found in bookings table, id: ${bookingId}`);
      }
    }
    
    // If booking is still not found in either table
    if (!bookingData) {
      console.log(`Booking not found in any available tables, id: ${bookingId}`);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    // Format the booking data for response
    const formattedBooking = {
      id: bookingData.id,
      petName: bookingData.pet_name || 'Unknown',
      petType: bookingData.pet_type || 'Unknown',
      petBreed: bookingData.pet_breed || 'Not specified',
      causeOfDeath: bookingData.cause_of_death || 'Not specified',
      petImageUrl: bookingData.pet_image_url || null,
      owner: {
        name: `${bookingData.first_name || ''} ${bookingData.last_name || ''}`.trim() || 'Unknown',
        email: bookingData.email || 'Not provided',
        phone: bookingData.phone || 'Not provided'
      },
      service: bookingData.service_name || 'Unknown Service',
      package: bookingData.service_name || 'Unknown Package',
      status: bookingData.status || 'pending',
      scheduledDate: bookingData.booking_date ? formatDate(bookingData.booking_date) : 'Not scheduled',
      scheduledTime: bookingData.booking_time ? formatTime(bookingData.booking_time) : 'Not specified',
      notes: bookingData.notes || 'No special notes',
      price: bookingData.price || 0,
      paymentMethod: bookingData.payment_method || 'cash',
      deliveryOption: bookingData.delivery_option || 'pickup',
      deliveryDistance: bookingData.delivery_distance || 0,
      deliveryFee: bookingData.delivery_fee || 0,
      createdAt: formatDate(bookingData.created_at)
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
  { params }: { params: { id: string } }
) {
  try {
    // Properly await the params to avoid the NextJS warning
    const bookingId = await Promise.resolve(params.id);
    
    const requestBody = await request.json();
    const { status } = requestBody;
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    // Check which table structure is available
    const tablesCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('service_bookings', 'bookings')
    `;
    const tablesResult = await query(tablesCheckQuery) as any[];
    const tableNames = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    
    const hasServiceBookings = tableNames.includes('service_bookings');
    const hasBookings = tableNames.includes('bookings');
    
    let updated = false;
    
    // Try to update in service_bookings first
    if (hasServiceBookings) {
      const updateQuery = `UPDATE service_bookings SET status = ? WHERE id = ?`;
      const result = await query(updateQuery, [status, bookingId]) as any;
      
      if (result.affectedRows > 0) {
        updated = true;
      }
    }
    
    // If not updated and bookings table exists, try there
    if (!updated && hasBookings) {
      const updateQuery = `UPDATE bookings SET status = ? WHERE id = ?`;
      const result = await query(updateQuery, [status, bookingId]) as any;
      
      if (result.affectedRows > 0) {
        updated = true;
      }
    }
    
    if (!updated) {
      return NextResponse.json({ error: 'Booking not found or could not be updated' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Booking status updated successfully',
      status: status
    });
    
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 });
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeString: string): string {
  // Time string could be in different formats, handle accordingly
  if (timeString.includes(':')) {
    const [hours, minutes] = timeString.split(':');
    const parsedHours = parseInt(hours);
    const ampm = parsedHours >= 12 ? 'PM' : 'AM';
    const displayHours = parsedHours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }
  return timeString;
} 