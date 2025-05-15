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
                   sb.pet_name as pet_name,
                   sb.pet_type as pet_type,
                   CONCAT('Service Provider #', sb.provider_id) as provider_name,
                   sb.location_address as provider_address
            FROM service_bookings sb
            LEFT JOIN service_types st ON sb.service_type_id = st.id
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

            // Check if the pets table exists
            const petsTableCheck = await query(
              "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pets'"
            ) as any[];
            
            const petsTableExists = petsTableCheck && petsTableCheck[0].count > 0;
            console.log(`Pets table exists: ${petsTableExists}`);
            
            // Check if bookings table has pet_name and pet_type columns
            const petColumnsCheck = await query(`
              SELECT COLUMN_NAME 
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'bookings' 
              AND COLUMN_NAME IN ('pet_name', 'pet_type')
            `) as any[];
            
            const hasPetNameColumn = petColumnsCheck.some((col: any) => col.COLUMN_NAME === 'pet_name');
            const hasPetTypeColumn = petColumnsCheck.some((col: any) => col.COLUMN_NAME === 'pet_type');
            
            // Check if business_services table exists
            const businessServicesCheck = await query(
              "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'business_services'"
            ) as any[];
            
            const businessServicesExists = businessServicesCheck && businessServicesCheck[0].count > 0;
            console.log(`business_services table exists: ${businessServicesExists}`);
            
            // Build query based on the structure we have
            if (petsTableExists) {
              // Original query with pets table join
              bookingsQuery = `
                SELECT b.*,
                       'N/A' as pet_name,
                       'N/A' as pet_type,
                       bs.price as service_price,
                       bp.business_name as provider_name,
                       bp.business_address as provider_address,
                       st.name as service_name,
                       st.description as service_description
                FROM bookings b
                LEFT JOIN business_services bs ON b.business_service_id = bs.id
                LEFT JOIN business_profiles bp ON bs.business_id = bp.id
                LEFT JOIN service_types st ON bs.service_type_id = st.id
                WHERE b.user_id = ?
              `;
            } else if (hasPetNameColumn && hasPetTypeColumn) {
              // Use pet_name and pet_type columns from bookings table
              bookingsQuery = `
                SELECT b.*,
                       b.pet_name as pet_name,
                       b.pet_type as pet_type,
                       bs.price as service_price,
                       bp.business_name as provider_name,
                       bp.business_address as provider_address,
                       st.name as service_name,
                       st.description as service_description
                FROM bookings b
                LEFT JOIN business_services bs ON b.business_service_id = bs.id
                LEFT JOIN business_profiles bp ON bs.business_id = bp.id
                LEFT JOIN service_types st ON bs.service_type_id = st.id
                WHERE b.user_id = ?
              `;
            } else {
              // Fallback query without pet information
              bookingsQuery = `
                SELECT b.*,
                       'N/A' as pet_name,
                       'N/A' as pet_type,
                       bs.price as service_price,
                       bp.business_name as provider_name,
                       bp.business_address as provider_address,
                       st.name as service_name,
                       st.description as service_description
                FROM bookings b
                LEFT JOIN business_services bs ON b.business_service_id = bs.id
                LEFT JOIN business_profiles bp ON bs.business_id = bp.id
                LEFT JOIN service_types st ON bs.service_type_id = st.id
                WHERE b.user_id = ?
              `;
            }
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
                     b.pet_name as pet_name,
                     b.pet_type as pet_type
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
        
        // Check service_bookings table as a fallback
        try {
          const serviceBookingsQuery = `
            SELECT * FROM service_bookings WHERE user_id = ?
          `;
          console.log('Checking service_bookings table...');
          const serviceBookings = await query(serviceBookingsQuery, [userId]) as any[];
          
          if (serviceBookings && serviceBookings.length > 0) {
            console.log(`Found ${serviceBookings.length} bookings in service_bookings table`);
            
            // Format the bookings data
            const formattedBookings = serviceBookings.map(booking => {
              // Format dates for consistency
              const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
              const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

              return {
                ...booking,
                booking_date: formattedDate,
                provider_name: booking.provider_name || 'Service Provider',
                provider_address: booking.location_address || 'No address available',
                service_name: booking.service_name || 'Cremation Service',
                service_description: booking.description || 'No description available',
                pet_name: booking.pet_name || 'Unknown Pet',
                pet_type: booking.pet_type || 'Unknown Type'
              };
            });
            
            return NextResponse.json({ bookings: formattedBookings });
          }
        } catch (fallbackError) {
          console.error('Error checking service_bookings table:', fallbackError);
        }
        
        // If we reach here, no bookings were found in either table
        console.log('Debug info - database tables:');
        
        try {
          const tables = await query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
          ) as any[];
          console.log('Available tables:', tables.map((t: any) => t.table_name));
          
          // Check bookings table structure
          const bookingsColumns = await query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bookings'"
          ) as any[];
          console.log('Bookings table columns:', bookingsColumns.map((c: any) => c.column_name));
          
          // Try a direct simple count
          const bookingsCount = await query(
            "SELECT COUNT(*) as count FROM bookings"
          ) as any[];
          console.log('Total bookings count:', bookingsCount[0].count);
          
        } catch (debugError) {
          console.error('Error getting debug info:', debugError);
        }
        
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
                 'Unknown' as pet_name,
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
          
          // Try the absolute simplest query possible
          try {
            console.log('Trying absolute simplest query');
            const basicQuery = 'SELECT * FROM bookings WHERE user_id = ?';
            const basicResult = await query(basicQuery, [userId]) as any[];
            
            if (basicResult && basicResult.length > 0) {
              console.log('Found bookings with simplest query:', basicResult.length);
              
              // Format with minimal fields
              const formattedBookings = basicResult.map(booking => ({
                ...booking,
                booking_date: booking.booking_date ? 
                  new Date(booking.booking_date).toISOString().split('T')[0] : null,
                provider_name: 'Service Provider',
                provider_address: 'Service Address',
                service_name: 'Cremation Service', 
                service_description: 'Pet cremation service',
                service_price: booking.total_amount,
                pet_name: 'Unknown',
                pet_type: 'Unknown'
              }));
              
              return NextResponse.json({ bookings: formattedBookings });
            }
          } catch (basicQueryError) {
            console.error('Basic query failed:', basicQueryError);
          }
        }

        // Get actual bookings directly from database for debugging
        try {
          console.log('Getting raw bookings data for debugging');
          const rawBookings = await query('SELECT * FROM bookings') as any[];
          console.log('All bookings in database:', rawBookings.length);
          if (rawBookings.length > 0) {
            console.log('Sample booking:', rawBookings[0]);
          }
        } catch (debugError) {
          console.error('Debug query failed:', debugError);
        }

        // No fallback to mock data - if we get here, return empty array
        console.log('No bookings found or could be retrieved');
        return NextResponse.json({ bookings: [] });
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
    const requiredFields = ['date', 'time'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);

    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Calculate the total amount
    let totalAmount = bookingData.price || 0;
    if (bookingData.deliveryFee) {
      totalAmount += bookingData.deliveryFee;
    }

    try {
      console.log('Creating booking record with exact column mapping...');
      
      // Based on the database structure, create a precise insert query
      const insertSQL = `
        INSERT INTO bookings (
          user_id, 
          business_service_id,
          booking_date, 
          booking_time, 
          status, 
          total_amount, 
          special_requests,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const insertParams = [
        userId,
        bookingData.packageId || null,
        bookingData.date,
        bookingData.time,
        'pending',
        totalAmount,
        bookingData.specialRequests || ''
      ];
      
      console.log('Insert SQL:', insertSQL);
      console.log('With parameters:', insertParams);
      
      const insertResult = await query(insertSQL, insertParams) as any;
      
      console.log('Insert result:', insertResult);
      const insertId = insertResult.insertId;
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        booking: {
          id: insertId,
          date: bookingData.date,
          time: bookingData.time,
          provider: bookingData.providerName || 'Service Provider',
          service: bookingData.packageName || 'Cremation Service',
          price: totalAmount,
          status: 'pending',
          pet: bookingData.petName || 'Unknown pet'
        }
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Database error', 
        message: 'Could not create booking record',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}