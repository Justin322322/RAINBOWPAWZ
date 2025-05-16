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
      console.log('Missing booking ID in request');
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    console.log(`Fetching booking with ID: ${bookingId}`);

    // Test database connection first
    try {
      await query('SELECT 1 as connection_test');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

    // Check which table structure is available
    let tablesResult;
    try {
      const tablesCheckQuery = `
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('service_bookings', 'bookings')
      `;
      tablesResult = await query(tablesCheckQuery) as any[];
    } catch (tableError) {
      console.error('Error checking available tables:', tableError);
      return NextResponse.json({
        error: 'Failed to check database tables',
        details: tableError instanceof Error ? tableError.message : String(tableError)
      }, { status: 500 });
    }

    const tableNames = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    const hasServiceBookings = tableNames.includes('service_bookings');
    const hasBookings = tableNames.includes('bookings');

    console.log(`Available tables - service_bookings: ${hasServiceBookings}, bookings: ${hasBookings}`);

    if (!hasServiceBookings && !hasBookings) {
      console.error('Required tables not found in database');
      return NextResponse.json({
        error: 'Database schema error',
        details: 'Required booking tables not found in database'
      }, { status: 500 });
    }

    let bookingData = null;
    let serviceBookingError = null;
    let bookingsError = null;

    // First try service_bookings if available
    if (hasServiceBookings) {
      try {
        // First, let's check if booking #17 exists with a direct query and log all columns
        console.log(`Checking if booking ${bookingId} exists with direct query...`);
        const checkQuery = `DESCRIBE service_bookings`;
        const columnsResult = await query(checkQuery) as any[];
        console.log(`Service bookings table columns:`, columnsResult.map(col => col.Field));

        // Now check if the booking exists
        const existsQuery = `SELECT * FROM service_bookings WHERE id = ?`;
        const existsResult = await query(existsQuery, [bookingId]) as any[];

        if (existsResult && existsResult.length > 0) {
          console.log(`Booking #${bookingId} exists in service_bookings table with data:`, existsResult[0]);

          // Check for null or invalid foreign keys that might cause JOIN issues
          const userIdValid = existsResult[0].user_id ? true : false;
          const packageIdValid = existsResult[0].package_id ? true : false;
          console.log(`Foreign keys - user_id valid: ${userIdValid}, package_id valid: ${packageIdValid}`);

          // Try to get the booking with a very simple query first
          bookingData = existsResult[0];

          // Now try to get user data separately if needed
          if (bookingData.user_id) {
            try {
              const userQuery = `SELECT id, first_name, last_name, email, phone_number as phone FROM users WHERE id = ?`;
              const userResult = await query(userQuery, [bookingData.user_id]) as any[];

              if (userResult && userResult.length > 0) {
                // Merge user data into booking data
                bookingData = { ...bookingData, ...userResult[0] };
                console.log(`Added user data to booking from user ID: ${bookingData.user_id}`);
              } else {
                console.log(`User with ID ${bookingData.user_id} not found`);
                // Add placeholder user data to prevent formatting errors
                bookingData = {
                  ...bookingData,
                  first_name: 'Unknown',
                  last_name: 'User',
                  email: 'not.available@example.com',
                  phone: 'Not available'
                };
              }
            } catch (userError) {
              console.error(`Error fetching user data:`, userError);
              // Add placeholder user data
              bookingData = {
                ...bookingData,
                first_name: 'Unknown',
                last_name: 'User',
                email: 'not.available@example.com',
                phone: 'Not available'
              };
            }
          } else {
            // No user_id, add placeholder user data
            bookingData = {
              ...bookingData,
              first_name: 'Unknown',
              last_name: 'User',
              email: 'not.available@example.com',
              phone: 'Not available'
            };
          }

          // Try to get package data separately if needed
          if (bookingData.package_id) {
            try {
              const packageQuery = `SELECT id as package_id, name as service_name, processing_time FROM service_packages WHERE id = ?`;
              const packageResult = await query(packageQuery, [bookingData.package_id]) as any[];

              if (packageResult && packageResult.length > 0) {
                // Merge package data into booking data
                bookingData = { ...bookingData, ...packageResult[0] };
                console.log(`Added package data to booking from package ID: ${bookingData.package_id}`);
              } else {
                console.log(`Package with ID ${bookingData.package_id} not found`);
                // Add placeholder package data
                bookingData = {
                  ...bookingData,
                  service_name: 'Unknown Service',
                  processing_time: 'Not specified'
                };
              }
            } catch (packageError) {
              console.error(`Error fetching package data:`, packageError);
              // Add placeholder package data
              bookingData = {
                ...bookingData,
                service_name: 'Unknown Service',
                processing_time: 'Not specified'
              };
            }
          } else {
            // No package_id, add placeholder package data
            bookingData = {
              ...bookingData,
              service_name: 'Unknown Service',
              processing_time: 'Not specified'
            };
          }

          console.log(`Successfully built booking data for ID ${bookingId} with fallback approach`);
        } else {
          console.log(`Booking #${bookingId} not found in service_bookings table with direct query`);

          // Try the original query as a fallback
          const serviceBookingQuery = `
            SELECT sb.id, sb.status, sb.booking_date, sb.booking_time, sb.special_requests as notes,
                  sb.created_at, sb.pet_name, sb.pet_type, sb.cause_of_death,
                  sb.pet_image_url, sb.payment_method, sb.payment_status, sb.delivery_option, sb.delivery_distance,
                  sb.delivery_fee, sb.price,
                  u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
                  p.id as package_id, p.name as service_name, p.processing_time
            FROM service_bookings sb
            LEFT JOIN users u ON sb.user_id = u.id
            LEFT JOIN service_packages p ON sb.package_id = p.id
            WHERE sb.id = ?
          `;
          const serviceBookingResult = await query(serviceBookingQuery, [bookingId]) as any[];

          if (serviceBookingResult && serviceBookingResult.length > 0) {
            bookingData = serviceBookingResult[0];
            console.log(`Found booking in service_bookings table with JOIN query: ${bookingData.id}`);
          }
        }
      } catch (queryError) {
        serviceBookingError = queryError;
        console.error('Error querying service_bookings table:', queryError);
        // Continue to try the other table instead of failing immediately
      }
    }

    // If not found in service_bookings, try bookings table
    if (!bookingData && hasBookings) {
      try {
        // First try a direct query to check if the booking exists
        const directQuery = `SELECT id, status FROM bookings WHERE id = ?`;
        const directResult = await query(directQuery, [bookingId]) as any[];

        if (directResult && directResult.length > 0) {
          console.log(`Found booking in bookings table with direct query: ${directResult[0].id}`);

          // Using traditional bookings table with a more permissive query
          const bookingsQuery = `
            SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests as notes,
                  b.created_at, b.total_amount as price,
                  u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
                  sp.id as package_id, sp.name as service_name, sp.processing_time,
                  p.name as pet_name, p.species as pet_type, p.breed as pet_breed, p.image_url as pet_image_url
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN service_packages sp ON b.business_service_id = sp.id
            LEFT JOIN pets p ON p.user_id = u.id
            WHERE b.id = ?
            LIMIT 1
          `;
          const bookingsResult = await query(bookingsQuery, [bookingId]) as any[];

          if (bookingsResult && bookingsResult.length > 0) {
            bookingData = bookingsResult[0];
            console.log(`Found booking in bookings table with full query: ${bookingData.id}`);
          } else {
            // Try a fallback query without JOINs
            const fallbackQuery = `SELECT * FROM bookings WHERE id = ?`;
            const fallbackResult = await query(fallbackQuery, [bookingId]) as any[];

            if (fallbackResult && fallbackResult.length > 0) {
              bookingData = fallbackResult[0];
              console.log(`Retrieved booking with fallback query: ${bookingData.id}`);

              // Try to get user data separately
              if (bookingData.user_id) {
                const userQuery = `SELECT id, first_name, last_name, email, phone_number as phone FROM users WHERE id = ?`;
                const userResult = await query(userQuery, [bookingData.user_id]) as any[];

                if (userResult && userResult.length > 0) {
                  // Merge user data into booking data
                  bookingData = { ...bookingData, ...userResult[0] };
                  console.log(`Added user data to booking`);
                }
              }
            }
          }
        } else {
          console.log(`Booking not found in bookings table with direct query, id: ${bookingId}`);
        }
      } catch (queryError) {
        bookingsError = queryError;
        console.error('Error querying bookings table:', queryError);
        // If both queries failed, we'll handle it below
      }
    }

    // If booking is still not found in either table
    if (!bookingData) {
      console.log(`Booking not found in any available tables, id: ${bookingId}`);

      // Provide detailed error information
      return NextResponse.json({
        error: 'Booking not found',
        details: `No booking found with ID: ${bookingId}`,
        debug: {
          tablesAvailable: tableNames,
          serviceBookingsError: serviceBookingError ? (serviceBookingError instanceof Error ? serviceBookingError.message : String(serviceBookingError)) : null,
          bookingsError: bookingsError ? (bookingsError instanceof Error ? bookingsError.message : String(bookingsError)) : null
        }
      }, { status: 404 });
    }

    // Validate booking data before formatting - be more lenient
    if (!bookingData || typeof bookingData !== 'object') {
      console.error('No booking data retrieved or invalid data type:', bookingData);
      return NextResponse.json({
        error: 'Invalid booking data',
        details: 'Retrieved booking data is missing or has an invalid format'
      }, { status: 500 });
    }

    // Even if id is missing, we'll try to format with the data we have
    if (!bookingData.id) {
      console.warn('Booking data missing ID, will attempt to format anyway:', bookingData);
      // Assign the ID from the URL parameter
      bookingData.id = parseInt(bookingId);
    }

    // Format the booking data for response
    try {
      console.log('Formatting booking data with keys:', Object.keys(bookingData));

      // Ensure all required fields exist with fallbacks
      const safeBookingData = {
        id: bookingData.id || 0,
        pet_name: bookingData.pet_name || 'Unknown Pet',
        pet_type: bookingData.pet_type || 'Unknown',
        pet_breed: bookingData.pet_breed || 'Not specified',
        cause_of_death: bookingData.cause_of_death || 'Not specified',
        pet_image_url: bookingData.pet_image_url || null,
        first_name: bookingData.first_name || 'Unknown',
        last_name: bookingData.last_name || 'User',
        email: bookingData.email || 'not.provided@example.com',
        phone: bookingData.phone || 'Not provided',
        service_name: bookingData.service_name || 'Unknown Service',
        status: bookingData.status || 'pending',
        booking_date: bookingData.booking_date || null,
        booking_time: bookingData.booking_time || null,
        notes: bookingData.notes || bookingData.special_requests || 'No special notes',
        price: bookingData.price || bookingData.total_amount || 0,
        payment_method: bookingData.payment_method || 'cash',
        payment_status: bookingData.payment_status || 'not_paid',
        delivery_option: bookingData.delivery_option || 'pickup',
        delivery_distance: bookingData.delivery_distance || 0,
        delivery_fee: bookingData.delivery_fee || 0,
        created_at: bookingData.created_at || new Date().toISOString(),
        processing_time: bookingData.processing_time || 'Not specified'
      };

      // Format dates safely
      const formatDateSafely = (dateString: string | null) => {
        if (!dateString) return 'Not scheduled';
        try {
          return formatDate(dateString);
        } catch (e) {
          console.error('Error formatting date:', e);
          return 'Invalid date';
        }
      };

      // Format times safely
      const formatTimeSafely = (timeString: string | null) => {
        if (!timeString) return 'Not specified';
        try {
          return formatTime(timeString);
        } catch (e) {
          console.error('Error formatting time:', e);
          return 'Invalid time';
        }
      };

      const formattedBooking = {
        id: safeBookingData.id,
        petName: safeBookingData.pet_name,
        petType: safeBookingData.pet_type,
        petBreed: safeBookingData.pet_breed,
        causeOfDeath: safeBookingData.cause_of_death,
        petImageUrl: safeBookingData.pet_image_url,
        owner: {
          name: `${safeBookingData.first_name} ${safeBookingData.last_name}`.trim(),
          email: safeBookingData.email,
          phone: safeBookingData.phone
        },
        service: safeBookingData.service_name,
        package: safeBookingData.service_name,
        status: safeBookingData.status,
        scheduledDate: formatDateSafely(safeBookingData.booking_date),
        scheduledTime: formatTimeSafely(safeBookingData.booking_time),
        notes: safeBookingData.notes,
        price: parseFloat(String(safeBookingData.price)),
        paymentMethod: safeBookingData.payment_method,
        paymentStatus: safeBookingData.payment_status,
        deliveryOption: safeBookingData.delivery_option,
        deliveryDistance: parseFloat(String(safeBookingData.delivery_distance)),
        deliveryFee: parseFloat(String(safeBookingData.delivery_fee)),
        createdAt: formatDateSafely(safeBookingData.created_at),
        processingTime: safeBookingData.processing_time
      };

      console.log('Successfully formatted booking data');
      console.log('Pet image URL:', safeBookingData.pet_image_url);
      return NextResponse.json(formattedBooking);
    } catch (formatError) {
      console.error('Error formatting booking data:', formatError);

      // Create a minimal valid response as a last resort
      try {
        const minimalBooking = {
          id: bookingData.id || 0,
          petName: 'Data Unavailable',
          petType: 'Unknown',
          petBreed: 'Not specified',
          causeOfDeath: 'Not specified',
          petImageUrl: null,
          owner: {
            name: 'Unknown User',
            email: 'not.available@example.com',
            phone: 'Not available'
          },
          service: 'Unknown Service',
          package: 'Unknown Package',
          status: bookingData.status || 'pending',
          scheduledDate: 'Not scheduled',
          scheduledTime: 'Not specified',
          notes: 'No special notes',
          price: 0,
          paymentMethod: 'cash',
          paymentStatus: 'not_paid',
          deliveryOption: 'pickup',
          deliveryDistance: 0,
          deliveryFee: 0,
          createdAt: 'Unknown date'
        };

        console.log('Returning minimal booking data as fallback');
        return NextResponse.json(minimalBooking);
      } catch (fallbackError) {
        // If even the minimal response fails, return an error
        return NextResponse.json({
          error: 'Error formatting booking data',
          details: formatError instanceof Error ? formatError.message : String(formatError),
          rawData: process.env.NODE_ENV === 'development' ? bookingData : undefined
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json({
      error: 'Failed to fetch booking details',
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack trace') : undefined
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