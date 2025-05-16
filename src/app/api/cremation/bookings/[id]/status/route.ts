import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: 'Could not parse JSON body' 
      }, { status: 400 });
    }
    
    const { status } = requestBody;
    console.log(`Attempting to update booking ${bookingId} status to ${status}`);

    if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status is required',
        details: 'Status must be one of: pending, confirmed, in_progress, completed, cancelled'
      }, { status: 400 });
    }

    // Check which table structure is available
    const tablesCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('service_bookings', 'bookings', 'successful_bookings')
    `;
    const tablesResult = await query(tablesCheckQuery) as any[];
    const tableNames = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    
    console.log('Available tables:', tableNames);
    
    const hasServiceBookings = tableNames.includes('service_bookings');
    const hasBookings = tableNames.includes('bookings');
    const hasSuccessfulBookings = tableNames.includes('successful_bookings');
    
    let updated = false;
    let bookingDetails: any = null;
    
    // Try to update in service_bookings first if available
    if (hasServiceBookings) {
      const updateQuery = `UPDATE service_bookings SET status = ? WHERE id = ?`;
      console.log('Executing service_bookings update query:', updateQuery);
      
      try {
        const result = await query(updateQuery, [status, bookingId]) as any;
        console.log('Service bookings update result:', result);
        
        if (result && result.affectedRows > 0) {
          updated = true;
          console.log('Successfully updated service_bookings table');
          
          // If status is completed or cancelled, get the booking details for successful_bookings table
          if (status === 'completed' || status === 'cancelled') {
            const getBookingQuery = `
              SELECT 
                sb.id, 
                sb.package_id as service_package_id, 
                sb.user_id, 
                sb.provider_id, 
                (sb.price + IFNULL(sb.delivery_fee, 0)) as transaction_amount
              FROM service_bookings sb
              WHERE sb.id = ?
            `;
            const bookingResult = await query(getBookingQuery, [bookingId]) as any[];
            if (bookingResult && bookingResult.length > 0) {
              bookingDetails = bookingResult[0];
            }
          }
        } else {
          console.log('No rows affected in service_bookings table');
        }
      } catch (error) {
        console.error('Error updating service_bookings:', error);
        // Continue to try the other table
      }
    }
    
    // If not updated and bookings table exists, try there
    if (!updated && hasBookings) {
      const updateQuery = `UPDATE bookings SET status = ? WHERE id = ?`;
      console.log('Executing bookings update query:', updateQuery);
      
      try {
        const result = await query(updateQuery, [status, bookingId]) as any;
        console.log('Bookings update result:', result);
        
        if (result && result.affectedRows > 0) {
          updated = true;
          console.log('Successfully updated bookings table');
          
          // If status is completed or cancelled, get the booking details for successful_bookings table
          if (status === 'completed' || status === 'cancelled') {
            const getBookingQuery = `
              SELECT 
                b.id, 
                b.business_service_id as service_package_id, 
                b.user_id,
                sp.service_provider_id as provider_id, 
                b.total_amount as transaction_amount
              FROM bookings b
              JOIN service_packages sp ON b.business_service_id = sp.id
              WHERE b.id = ?
            `;
            const bookingResult = await query(getBookingQuery, [bookingId]) as any[];
            if (bookingResult && bookingResult.length > 0) {
              bookingDetails = bookingResult[0];
            }
          }
        } else {
          console.log('No rows affected in bookings table');
        }
      } catch (error) {
        console.error('Error updating bookings:', error);
        if (!hasServiceBookings) {
          // Only throw if this is the only table available
          throw error;
        }
      }
    }
    
    if (!updated) {
      return NextResponse.json({ 
        error: 'Booking not found or could not be updated',
        details: 'The specified booking ID does not exist or could not be updated'
      }, { status: 404 });
    }
    
    // If status is completed or cancelled and we have the successful_bookings table, insert a record
    if ((status === 'completed' || status === 'cancelled') && hasSuccessfulBookings && bookingDetails) {
      try {
        console.log(`Inserting ${status} booking into successful_bookings table:`, bookingDetails);
        
        const insertQuery = `
          INSERT INTO successful_bookings (
            booking_id, 
            service_package_id, 
            user_id, 
            provider_id, 
            transaction_amount, 
            payment_date, 
            payment_status
          ) VALUES (?, ?, ?, ?, ?, NOW(), ?)
        `;
        
        const paymentStatus = status === 'cancelled' ? 'cancelled' : 'completed';
        
        const insertResult = await query(insertQuery, [
          bookingDetails.id,
          bookingDetails.service_package_id,
          bookingDetails.user_id,
          bookingDetails.provider_id,
          bookingDetails.transaction_amount,
          paymentStatus
        ]) as any;
        
        console.log('Successfully inserted into successful_bookings table, ID:', insertResult.insertId);
      } catch (error) {
        console.error('Error inserting into successful_bookings:', error);
        // Don't fail the entire request if this part fails
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Booking status updated successfully',
      status: status
    });
    
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ 
      error: 'Failed to update booking status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 