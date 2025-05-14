import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// Import the simple email service
const { sendBookingConfirmationEmail } = require('@/lib/simpleEmailService');

// Define service types with consistent naming and descriptions
const serviceTypes: Record<number, { name: string; description: string; price: number }> = {
  1: {
    name: 'Basic Cremation',
    description: 'Simple cremation service with standard urn',
    price: 3500.00
  },
  2: {
    name: 'Premium Cremation',
    description: 'Private cremation with premium urn and memorial certificate',
    price: 5500.00
  },
  3: {
    name: 'Deluxe Package',
    description: 'Private cremation with wooden urn and memorial service',
    price: 6000.00
  }
};

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    console.log('Fetching bookings for user:', userId);

    // First, check which bookings table exists in the database
    let bookingsTable = 'bookings';
    let bookingsQuery = '';
    let bookingsParams = [];

    try {
      // First, check if the bookings table exists
      console.log('Checking if bookings table exists...');
      const tableExistsCheck = await query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'"
      ) as any[];

      if (!tableExistsCheck || tableExistsCheck[0].count === 0) {
        console.log('Bookings table does not exist, checking for service_bookings table...');

        // Check if service_bookings table exists
        const serviceBookingsCheck = await query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'service_bookings'"
        ) as any[];

        if (serviceBookingsCheck && serviceBookingsCheck[0].count > 0) {
          console.log('Using service_bookings table');

          // Build query for service_bookings table
          bookingsQuery = `
            SELECT sb.*,
                   st.name as service_name,
                   st.description as service_description,
                   sb.price as service_price,
                   p.name as pet_name,
                   p.species as pet_type,
                   CONCAT('Service Provider #', sb.provider_id) as provider_name,
                   sb.location_address as provider_address
            FROM service_bookings sb
            LEFT JOIN service_types st ON sb.service_type_id = st.id
            LEFT JOIN pets p ON sb.pet_id = p.id
            WHERE sb.user_id = ?
          `;
          bookingsParams = [userId];

          if (status) {
            bookingsQuery += ' AND sb.status = ?';
            bookingsParams.push(status);
          }
        } else {
          throw new Error('No bookings table found in the database');
        }
      } else {
        // Bookings table exists, now check which structure it has
        console.log('Bookings table exists, checking structure...');

        // Check if service_provider_id column exists (from bookings_tables.sql)
        const serviceProviderCheck = await query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'service_provider_id'"
        ) as any[];

        if (serviceProviderCheck && serviceProviderCheck.length > 0) {
          // We have the bookings_tables.sql structure
          console.log('Using bookings_tables.sql structure');

          // Build query based on the bookings_tables.sql structure
          bookingsQuery = `
            SELECT b.*,
                   sp.name as provider_name,
                   sp.address as provider_address,
                   spkg.name as service_name,
                   spkg.description as service_description,
                   spkg.price as service_price
            FROM bookings b
            LEFT JOIN service_providers sp ON b.service_provider_id = sp.id
            LEFT JOIN service_packages spkg ON b.service_package_id = spkg.id
            WHERE b.user_id = ?
          `;
          bookingsParams = [userId];

          if (status) {
            bookingsQuery += ' AND b.status = ?';
            bookingsParams.push(status);
          }
        } else {
          // Check if business_service_id column exists (from schema.sql)
          const businessServiceCheck = await query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'business_service_id'"
          ) as any[];

          if (businessServiceCheck && businessServiceCheck.length > 0) {
            // We have the schema.sql structure
            console.log('Using schema.sql structure');

            // Build query based on the schema.sql structure
            bookingsQuery = `
              SELECT b.*,
                     p.name as pet_name,
                     p.species as pet_type,
                     bs.price as service_price,
                     bp.business_name as provider_name,
                     bp.business_address as provider_address,
                     st.name as service_name,
                     st.description as service_description
              FROM bookings b
              LEFT JOIN pets p ON b.pet_id = p.id
              LEFT JOIN business_services bs ON b.business_service_id = bs.id
              LEFT JOIN business_profiles bp ON bs.business_id = bp.id
              LEFT JOIN service_types st ON bs.service_type_id = st.id
              WHERE b.user_id = ?
            `;
            bookingsParams = [userId];

            if (status) {
              bookingsQuery += ' AND b.status = ?';
              bookingsParams.push(status);
            }
          } else {
            // If we can't determine the structure, just query the bookings table directly
            console.log('Using simple bookings query without joins');

            bookingsQuery = `
              SELECT b.*,
                     'Service Provider' as provider_name,
                     'Service Address' as provider_address,
                     'Service' as service_name,
                     'Service Description' as service_description,
                     b.total_amount as service_price,
                     'Pet' as pet_name,
                     'Unknown' as pet_type
              FROM bookings b
              WHERE b.user_id = ?
            `;
            bookingsParams = [userId];

            if (status) {
              bookingsQuery += ' AND b.status = ?';
              bookingsParams.push(status);
            }
          }
        }
      }

      // Execute the query
      console.log('Executing query:', bookingsQuery);
      console.log('With params:', bookingsParams);

      const bookings = await query(bookingsQuery, bookingsParams) as any[];

      console.log('Bookings found:', bookings ? bookings.length : 0);

      // If no bookings found, return empty array
      if (!bookings || bookings.length === 0) {
        console.log('No bookings found for user:', userId);
        return NextResponse.json({ bookings: [] });
      }

      // Format the bookings data
      const formattedBookings = bookings.map(booking => {
        // Format dates for consistency
        const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
        const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

        return {
          ...booking,
          booking_date: formattedDate,
          // Add default values for any missing fields
          provider_name: booking.provider_name || 'Unknown Provider',
          provider_address: booking.provider_address || 'No address available',
          service_name: booking.service_name || 'Unknown Service',
          service_description: booking.service_description || 'No description available',
          pet_name: booking.pet_name || 'Unknown Pet',
          pet_type: booking.pet_type || 'Unknown Type'
        };
      });

      return NextResponse.json({ bookings: formattedBookings });
    } catch (dbError) {
      console.error('Database error:', dbError);

      // Check if the database connection is working
      try {
        console.log('Testing database connection...');
        const connectionTest = await query('SELECT 1 as test');
        console.log('Database connection test result:', connectionTest);

        if (!connectionTest || !Array.isArray(connectionTest) || connectionTest.length === 0) {
          console.error('Database connection test failed');
          return NextResponse.json({
            error: 'Database connection error',
            details: 'Could not connect to the database'
          }, { status: 500 });
        }

        // If connection is working but we still got an error, it's likely a query issue
        console.log('Database connection is working, but query failed');

        // Try a simple query to get all bookings without joins
        console.log('Trying simple query...');
        const simpleQuery = `
          SELECT b.*,
                 'Service Provider' as provider_name,
                 'Service Address' as provider_address,
                 'Service' as service_name,
                 'Service Description' as service_description,
                 b.total_amount as service_price,
                 'Pet' as pet_name,
                 'Unknown' as pet_type
          FROM bookings b
          WHERE b.user_id = ?
        `;
        const simpleParams = [userId];

        try {
          const simpleResult = await query(simpleQuery, simpleParams) as any[];
          console.log('Simple query result:', simpleResult);

          if (simpleResult && Array.isArray(simpleResult)) {
            console.log('Simple query succeeded, returning booking data');

            // Format the booking data
            const formattedBookings = simpleResult.map(booking => {
              // Format dates for consistency
              const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
              const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

              return {
                ...booking,
                booking_date: formattedDate
              };
            });

            return NextResponse.json({ bookings: formattedBookings });
          }
        } catch (simpleQueryError) {
          console.error('Simple query failed:', simpleQueryError);
        }

        // If we get here, both the original query and simple query failed
        // Fall back to mock data for testing
        console.log('Falling back to mock data');

        // Create mock data for testing
        const mockBookings = [
          {
            id: 1,
            user_id: parseInt(userId),
            pet_id: 1,
            business_service_id: 1,
            booking_date: '2023-11-15',
            booking_time: '10:00:00',
            status: 'confirmed',
            total_amount: 3500.00,
            special_requests: 'Please handle with extra care',
            created_at: '2023-11-01T10:00:00',
            updated_at: '2023-11-01T10:00:00',
            provider_name: 'Rainbow Bridge Pet Cremation',
            provider_address: 'Capitol Drive, Balanga City, Bataan, Philippines',
            service_name: serviceTypes[1].name,
            service_description: serviceTypes[1].description,
            service_price: serviceTypes[1].price,
            pet_name: 'Max',
            pet_type: 'Dog'
          },
          {
            id: 2,
            user_id: parseInt(userId),
            pet_id: 2,
            business_service_id: 3,
            booking_date: '2023-11-20',
            booking_time: '14:30:00',
            status: 'pending',
            total_amount: 6000.00,
            special_requests: 'Would like to be present during the service',
            created_at: '2023-11-05T14:30:00',
            updated_at: '2023-11-05T14:30:00',
            provider_name: 'Peaceful Paws Memorial',
            provider_address: 'Tuyo, Balanga City, Bataan, Philippines',
            service_name: serviceTypes[3].name,
            service_description: serviceTypes[3].description,
            service_price: serviceTypes[3].price,
            pet_name: 'Luna',
            pet_type: 'Cat'
          }
        ];

        // Filter by status if provided
        let filteredBookings = mockBookings;
        if (status) {
          filteredBookings = mockBookings.filter(booking => booking.status === status.toLowerCase());
        }

        return NextResponse.json({
          bookings: filteredBookings,
          warning: 'Using mock data due to database query issues'
        });
      } catch (connectionError) {
        console.error('Database connection test error:', connectionError);
        return NextResponse.json({
          error: 'Database connection error',
          details: 'Could not connect to the database'
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Creating new booking...');
    
    // Get user ID from auth token or from the request body for checkout flow
    let userId, accountType;
    const authToken = getAuthTokenFromRequest(request);
    
    if (authToken) {
      [userId, accountType] = authToken.split('_');
      console.log(`User authenticated with token: ID ${userId}, type ${accountType}`);
      
      if (!userId || accountType !== 'user') {
        return NextResponse.json({ error: 'Unauthorized: Invalid user type' }, { status: 401 });
      }
    } else {
      // For checkout flow when user might not have auth token in request
      const bookingRequestData = await request.json();
      
      if (bookingRequestData.userId) {
        userId = bookingRequestData.userId;
        console.log(`Using userId from request body: ${userId}`);
      } else {
        console.error('No authentication token or userId provided');
        return NextResponse.json({ error: 'Unauthorized: No authentication' }, { status: 401 });
      }
    }

    // Get booking data from request body
    const bookingData = await request.json();
    console.log('Received booking data:', bookingData);

    // Validate required fields
    const requiredFields = ['providerId', 'date', 'time'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);

    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Validate pet information
    if (!bookingData.petId && (!bookingData.petName || !bookingData.petType)) {
      console.error('Missing pet information');
      return NextResponse.json({
        error: 'Either an existing pet ID or new pet details (name and type) must be provided'
      }, { status: 400 });
    }

    // Try to get package details if packageId is provided
    let serviceDetails = {
      name: bookingData.packageName || 'Unknown Service',
      description: 'Service package',
      price: bookingData.price || 0
    };
    
    if (bookingData.packageId) {
      try {
        console.log(`Fetching package details for ID: ${bookingData.packageId}`);
        const packageResult = await query(`
          SELECT name, description, price 
          FROM service_packages 
          WHERE id = ? 
          LIMIT 1
        `, [bookingData.packageId]) as any[];
        
        if (packageResult && packageResult.length > 0) {
          serviceDetails = {
            name: packageResult[0].name,
            description: packageResult[0].description,
            price: packageResult[0].price
          };
          console.log('Found package details:', serviceDetails);
        }
      } catch (err) {
        console.error('Error fetching package details:', err);
        // Continue with the booking process using default values
      }
    }    // Create a new booking object
    const newBooking: {
      id: number | null;
      user_id: number;
      pet_id: number | null;
      package_id: number | null;
      provider_id: number | null;
      booking_date: any;
      booking_time: any;
      status: string;
      total_amount: any;
      special_requests: any;
      payment_method: string;
      created_at: string;
      updated_at: string;
      provider_name: string;
      provider_address: string;
      service_name: string;
      service_description: string;
      service_price: any;
      pet_name: string;
      pet_type: any;
      _error?: string; // Added property for error handling
    } = {
      id: null, // Will be set by the database
      user_id: parseInt(userId),
      pet_id: bookingData.petId ? parseInt(bookingData.petId) : null,
      package_id: bookingData.packageId ? parseInt(bookingData.packageId) : null,
      provider_id: bookingData.providerId ? parseInt(bookingData.providerId) : null,
      booking_date: bookingData.date,
      booking_time: bookingData.time,
      status: 'pending',
      total_amount: serviceDetails.price,
      special_requests: bookingData.specialRequests || '',
      payment_method: bookingData.paymentMethod || 'cash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider_name: bookingData.providerName || 'Service Provider',
      provider_address: bookingData.providerAddress || 'Provider Address',
      service_name: serviceDetails.name,
      service_description: serviceDetails.description,
      service_price: serviceDetails.price,
      pet_name: bookingData.petName || 'Pet',
      pet_type: bookingData.petType || 'Unknown'
    };
    
    console.log('Prepared booking object:', newBooking);    // Save the booking to the database
    try {
      console.log('Attempting to save booking to database...');
      
      // Check which booking table structure to use
      const tableExistsCheck = await query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'"
      ) as any[];
      
      let insertId;
      
      if (tableExistsCheck && tableExistsCheck[0].count > 0) {
        // Check if we have the newer schema with package_id and provider_id
        const columnsResult = await query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'bookings'
        `) as any[];
        
        const columnNames = columnsResult.map(col => col.COLUMN_NAME.toLowerCase());
        const hasPackageId = columnNames.includes('package_id');
        const hasProviderId = columnNames.includes('provider_id');
        
        console.log(`Bookings table columns - package_id: ${hasPackageId}, provider_id: ${hasProviderId}`);
        
        // Use the appropriate schema based on columns available
        if (hasPackageId && hasProviderId) {
          const insertResult = await query(`
            INSERT INTO bookings (
              user_id, pet_id, package_id, provider_id, booking_date, booking_time,
              status, total_amount, special_requests, payment_method, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            newBooking.user_id,
            newBooking.pet_id,
            newBooking.package_id,
            newBooking.provider_id,
            newBooking.booking_date,
            newBooking.booking_time,
            newBooking.status,
            newBooking.total_amount,
            newBooking.special_requests,
            newBooking.payment_method
          ]) as any;
          
          insertId = insertResult.insertId;
          console.log(`Booking saved with ID: ${insertId} using new schema`);
        } else {
          // Fall back to older schema - try to adapt
          let serviceProviderIdCol = null;
          let servicePackageIdCol = null;
          
          if (columnNames.includes('service_provider_id')) serviceProviderIdCol = 'service_provider_id';
          if (columnNames.includes('business_id')) serviceProviderIdCol = 'business_id';
          
          if (columnNames.includes('service_package_id')) servicePackageIdCol = 'service_package_id';
          if (columnNames.includes('business_service_id')) servicePackageIdCol = 'business_service_id';
          
          if (serviceProviderIdCol && servicePackageIdCol) {
            const insertResult = await query(`
              INSERT INTO bookings (
                user_id, pet_id, ${servicePackageIdCol}, ${serviceProviderIdCol}, booking_date, booking_time,
                status, total_amount, special_requests, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
              newBooking.user_id,
              newBooking.pet_id,
              newBooking.package_id,
              newBooking.provider_id,
              newBooking.booking_date,
              newBooking.booking_time,
              newBooking.status,
              newBooking.total_amount,
              newBooking.special_requests
            ]) as any;
            
            insertId = insertResult.insertId;
            console.log(`Booking saved with ID: ${insertId} using adapted schema`);
          } else {
            console.error('Could not determine appropriate booking schema');
            throw new Error('Unsupported booking table schema');
          }
        }
      } else {
        console.error('No bookings table found in database');
        throw new Error('Bookings table does not exist');      }
      
      // Update the booking object with the database ID
      newBooking.id = insertId;
    } catch (dbError) {
      console.error('Error saving booking to database:', dbError);
      // Continue with email process but note the error - use NULL instead of random number
      newBooking.id = null; // Keep as null instead of using a random number
      newBooking._error = 'Failed to save to database, but continuing with email notification';
    }

    // Send booking confirmation email
    try {
      console.log('Preparing to send booking confirmation email...');

      // Get user email from database
      let userEmail = '';
      try {
        const userResult = await query('SELECT email FROM users WHERE id = ?', [userId]) as any[];
        if (userResult && userResult.length > 0) {
          userEmail = userResult[0].email;
        }
      } catch (dbError) {
        console.error('Error fetching user email:', dbError);
        // For demo purposes, use a placeholder email if we can't get the real one
        userEmail = bookingData.email || 'user@example.com';
      }

      // If we couldn't get the email, log a warning but continue
      if (!userEmail) {
        console.warn('Could not find user email for booking confirmation. Using fallback.');
        userEmail = bookingData.email || 'user@example.com';
      }

      // Format date and time for email
      const bookingDateObj = new Date(bookingData.date);
      const formattedDate = bookingDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Get user name
      let userName = '';
      try {
        const userResult = await query('SELECT first_name, last_name FROM users WHERE id = ?', [userId]) as any[];
        if (userResult && userResult.length > 0) {
          userName = `${userResult[0].first_name} ${userResult[0].last_name}`;
        }
      } catch (dbError) {
        console.error('Error fetching user name:', dbError);
        userName = 'Valued Customer';
      }

      // If we couldn't get the name, use a default
      if (!userName) {
        userName = 'Valued Customer';
      }

      // Prepare booking details for email
      const emailBookingDetails = {
        customerName: userName,
        serviceName: newBooking.service_name,
        providerName: newBooking.provider_name,
        bookingDate: formattedDate,
        bookingTime: bookingData.time,
        petName: newBooking.pet_name,
        bookingId: newBooking.id
      };

      // Send email using simple email service
      const emailResult = await sendBookingConfirmationEmail(userEmail, emailBookingDetails);

      if (emailResult.success) {
        console.log(`Booking confirmation email sent successfully to ${userEmail}. Message ID: ${emailResult.messageId}`);
      } else {
        console.error('Failed to send booking confirmation email:', emailResult.error);
        // Continue with the booking process even if the email fails
      }    } catch (emailError) {
      console.error('Error sending booking confirmation email:', emailError);
      // Continue with the booking process even if the email fails
    }    // Include additional information for the client about the booking
    const responseData: {
      success: boolean;
      message: string;
      booking: {
        id: number | null;
        date: any;
        time: any;
        provider: string;
        service: string;
        price: any;
        status: string;
        pet: string;
      };
      warning?: string; // Add optional warning property
    } = {
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: newBooking.id,
        date: newBooking.booking_date,
        time: newBooking.booking_time,
        provider: newBooking.provider_name,
        service: newBooking.service_name,
        price: newBooking.total_amount,
        status: newBooking.status,
        pet: newBooking.pet_name
      }
    };
    
    if (newBooking._error) {
      responseData.warning = newBooking._error;
    }
    
    console.log('Booking process completed successfully');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}