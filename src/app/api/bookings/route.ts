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
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    console.log('User ID from token:', userId);
    console.log('Account type from token:', accountType);

    if (!userId || (accountType !== 'user' && accountType !== 'fur_parent')) {
      console.log('Unauthorized: Invalid user ID or account type');
      return NextResponse.json({
        error: 'Unauthorized',
        details: `Invalid account type: ${accountType}. Expected 'user' or 'fur_parent'`
      }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    console.log('Fetching bookings for user:', userId);

    // First, try a direct query to service_bookings table
    try {
      console.log('Trying direct query to service_bookings table first...');

      // Try both string and number versions of the user ID
      const userIdNumber = Number(userId);
      console.log('User ID as number:', userIdNumber, 'isNaN:', isNaN(userIdNumber));

      // Query with both string and number versions of the user ID
      const directQuery = `
        SELECT * FROM service_bookings
        WHERE user_id = ? OR user_id = ?
      `;
      const directResult = await query(directQuery, [userIdNumber, userId.toString()]) as any[];
      console.log('Direct service_bookings query result count:', directResult?.length || 0);

      if (directResult && directResult.length > 0) {
        console.log('Found bookings in service_bookings table directly');
        console.log('Sample booking:', directResult[0]);

        // Format the bookings data
        const formattedBookings = directResult.map(booking => {
          // Format dates for consistency
          const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
          const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

          // Format time if available
          const timeString = booking.booking_time ?
            booking.booking_time.toString().padStart(8, '0') : null;

          return {
            ...booking,
            booking_date: formattedDate,
            booking_time: timeString,
            provider_name: 'Service Provider',
            provider_address: 'Provider Address',
            service_name: 'Cremation Service',
            service_description: 'Pet cremation service',
            service_price: booking.price || 0,
            pet_name: booking.pet_name || 'Unknown Pet',
            pet_type: booking.pet_type || 'Unknown Type'
          };
        });

        return NextResponse.json({ bookings: formattedBookings });
      }
    } catch (directError) {
      console.error('Error with direct service_bookings query:', directError);
    }

    // If direct query didn't work, proceed with the regular flow
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
          // Use a more detailed query to get service_bookings with package information
          const serviceBookingsQuery = `
            SELECT sb.*,
                   sp.name as package_name,
                   sp.description as package_description,
                   bp.business_name as provider_name,
                   bp.business_address as provider_address
            FROM service_bookings sb
            LEFT JOIN service_packages sp ON sb.package_id = sp.id
            LEFT JOIN business_profiles bp ON sb.provider_id = bp.id
            WHERE sb.user_id = ?
          `;
          console.log('Checking service_bookings table with joins...');
          const serviceBookings = await query(serviceBookingsQuery, [userId]) as any[];

          if (serviceBookings && serviceBookings.length > 0) {
            console.log(`Found ${serviceBookings.length} bookings in service_bookings table`);

            // Format the bookings data
            const formattedBookings = serviceBookings.map(booking => {
              // Format dates for consistency
              const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
              const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

              // Format time if available
              const timeString = booking.booking_time ?
                booking.booking_time.toString().padStart(8, '0') : null;

              return {
                ...booking,
                booking_date: formattedDate,
                booking_time: timeString,
                provider_name: booking.provider_name || 'Service Provider',
                provider_address: booking.provider_address || 'No address available',
                service_name: booking.package_name || 'Cremation Service',
                service_description: booking.package_description || 'Pet cremation service',
                service_price: booking.price || 0,
                pet_name: booking.pet_name || 'Unknown Pet',
                pet_type: booking.pet_type || 'Unknown Type'
              };
            });

            return NextResponse.json({ bookings: formattedBookings });
          }

          // If the join query fails, try a simpler query
          if (!serviceBookings || serviceBookings.length === 0) {
            console.log('Trying simple service_bookings query without joins...');
            const simpleServiceBookingsQuery = `
              SELECT * FROM service_bookings WHERE user_id = ?
            `;
            const simpleServiceBookings = await query(simpleServiceBookingsQuery, [userId]) as any[];

            if (simpleServiceBookings && simpleServiceBookings.length > 0) {
              console.log(`Found ${simpleServiceBookings.length} bookings in service_bookings table (simple query)`);

              // Format the bookings data
              const formattedBookings = simpleServiceBookings.map(booking => {
                // Format dates for consistency
                const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
                const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

                // Format time if available
                const timeString = booking.booking_time ?
                  booking.booking_time.toString().padStart(8, '0') : null;

                return {
                  ...booking,
                  booking_date: formattedDate,
                  booking_time: timeString,
                  provider_name: 'Service Provider',
                  provider_address: 'Provider Address',
                  service_name: 'Cremation Service',
                  service_description: 'Pet cremation service',
                  service_price: booking.price || 0,
                  pet_name: booking.pet_name || 'Unknown Pet',
                  pet_type: booking.pet_type || 'Unknown Type'
                };
              });

              return NextResponse.json({ bookings: formattedBookings });
            }
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

        // First check if bookings table has pet_id column for proper join
        const petIdCheck = await query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'pet_id'
        `) as any[];

        const hasPetIdColumn = petIdCheck.length > 0;
        console.log('Bookings table has pet_id column:', hasPetIdColumn);

        // Get bookings first
        const bookingsQuery = `
          SELECT b.*,
                 spkg.name as service_name,
                 spkg.description as service_description,
                 spkg.price as service_price,
                 sp.name as provider_name,
                 sp.address as provider_address
          FROM bookings b
          LEFT JOIN service_packages spkg ON b.business_service_id = spkg.id
          LEFT JOIN service_providers sp ON spkg.service_provider_id = sp.id
          WHERE b.user_id = ?
        `;

        // Execute query to get bookings
        const bookingsResult = await query(bookingsQuery, [userId]) as any[];

        if (bookingsResult && bookingsResult.length > 0) {
          console.log('Found bookings:', bookingsResult.length);

          // Since we have bookings, fetch pets separately
          const petsQuery = `
            SELECT *
            FROM pets
            WHERE user_id = ?
            ORDER BY created_at DESC
          `;

          const petsResult = await query(petsQuery, [userId]) as any[];
          console.log('Found pets for user:', petsResult?.length || 0);

          // Map bookings with pet info
          const formattedBookings = bookingsResult.map(booking => {
            // Find the most recent pet that was created before or at the same time as the booking
            // This likely matches the pet associated with the booking
            const matchingPet = petsResult?.find(pet =>
              new Date(pet.created_at).getTime() <= new Date(booking.created_at).getTime() + 5000
            );

            // Format dates for consistency
            const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
            const formattedDate = bookingDate ? bookingDate.toISOString().split('T')[0] : null;

            return {
              ...booking,
              booking_date: formattedDate,
              // Use pet information if available
              pet_name: matchingPet?.name || 'Pet',
              pet_type: matchingPet?.species || 'Unknown',
              pet_breed: matchingPet?.breed || '',
              // Ensure we don't have null values for display
              provider_name: booking.provider_name || 'Service Provider',
              provider_address: booking.provider_address || 'Provider Address',
              service_name: booking.service_name || 'Cremation Service',
              service_description: booking.service_description || 'Pet cremation service'
            };
          });

          return NextResponse.json({ bookings: formattedBookings });
        }

        // Fallback to simple query if no bookings found
        console.log('Trying simple query...');

        // First check if bookings table has pet_id column for proper join
        const fallbackPetIdCheck = await query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'pet_id'
        `) as any[];

        const fallbackHasPetIdColumn = fallbackPetIdCheck.length > 0;
        console.log('Bookings table has pet_id column:', fallbackHasPetIdColumn);

        // Construct query based on available columns
        let simpleQuery = '';
        if (fallbackHasPetIdColumn) {
          simpleQuery = `
            SELECT b.*,
                   p.name as pet_name,
                   p.species as pet_type,
                   p.breed as pet_breed,
                   sp.name as provider_name,
                   sp.address as provider_address,
                   spkg.name as service_name,
                   spkg.description as service_description,
                   spkg.price as service_price
            FROM bookings b
            LEFT JOIN pets p ON b.pet_id = p.id
            LEFT JOIN service_packages spkg ON b.business_service_id = spkg.id
            LEFT JOIN service_providers sp ON spkg.service_provider_id = sp.id
            WHERE b.user_id = ?
          `;
        } else {
          // If no pet_id column, we can't join with pets table
          simpleQuery = `
            SELECT b.*,
                   'Pet' as pet_name,
                   'Unknown' as pet_type,
                   '' as pet_breed,
                   sp.name as provider_name,
                   sp.address as provider_address,
                   spkg.name as service_name,
                   spkg.description as service_description,
                   spkg.price as service_price
            FROM bookings b
            LEFT JOIN service_packages spkg ON b.business_service_id = spkg.id
            LEFT JOIN service_providers sp ON spkg.service_provider_id = sp.id
            WHERE b.user_id = ?
          `;
        }

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
                booking_date: formattedDate,
                // Ensure we don't have null values for display
                provider_name: booking.provider_name || 'Service Provider',
                provider_address: booking.provider_address || 'Provider Address',
                service_name: booking.service_name || 'Cremation Service',
                service_description: booking.service_description || 'Pet cremation service',
                pet_name: booking.pet_name || 'Pet',
                pet_type: booking.pet_type || 'Unknown'
              };
            });

            return NextResponse.json({ bookings: formattedBookings });
          }
        } catch (simpleQueryError) {
          console.error('Simple query failed:', simpleQueryError);

          // Try to join with just the pets table
          try {
            console.log('Trying query with just pets table');

            let petsQuery = '';
            if (fallbackHasPetIdColumn) {
              petsQuery = `
                SELECT b.*,
                       p.name as pet_name,
                       p.species as pet_type,
                       p.breed as pet_breed,
                       'Service Provider' as provider_name,
                       'Provider Address' as provider_address,
                       'Cremation Service' as service_name,
                       'Pet cremation service' as service_description,
                       b.total_amount as service_price
                FROM bookings b
                LEFT JOIN pets p ON b.pet_id = p.id
                WHERE b.user_id = ?
              `;
            } else {
              // If no pet_id column, use basic query
              petsQuery = `
                SELECT b.*,
                       'Pet' as pet_name,
                       'Unknown' as pet_type,
                       '' as pet_breed,
                       'Service Provider' as provider_name,
                       'Provider Address' as provider_address,
                       'Cremation Service' as service_name,
                       'Pet cremation service' as service_description,
                       b.total_amount as service_price
                FROM bookings b
                WHERE b.user_id = ?
              `;
            }

            const petsResult = await query(petsQuery, [userId]) as any[];

            if (petsResult && petsResult.length > 0) {
              console.log('Found bookings with pets join:', petsResult.length);

              // Format with data from pets table
              const formattedBookings = petsResult.map(booking => ({
                ...booking,
                booking_date: booking.booking_date ?
                  new Date(booking.booking_date).toISOString().split('T')[0] : null,
                provider_name: 'Service Provider',
                provider_address: 'Provider Address',
                service_name: 'Cremation Service',
                service_description: 'Pet cremation service',
                service_price: booking.total_amount,
                pet_name: booking.pet_name || 'Pet',
                pet_type: booking.pet_type || 'Unknown'
              }));

              return NextResponse.json({ bookings: formattedBookings });
            }
          } catch (petsQueryError) {
            console.error('Pets query failed:', petsQueryError);
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

          // Also check service_bookings table
          console.log('Getting raw service_bookings data for debugging');
          const rawServiceBookings = await query('SELECT * FROM service_bookings') as any[];
          console.log('All service_bookings in database:', rawServiceBookings.length);
          if (rawServiceBookings.length > 0) {
            console.log('Sample service_booking:', rawServiceBookings[0]);
            console.log('User ID in sample service_booking:', rawServiceBookings[0].user_id);
            console.log('Current user ID:', userId);

            // Check if there are any bookings for this user
            const userServiceBookings = rawServiceBookings.filter(booking =>
              booking.user_id.toString() === userId.toString()
            );
            console.log(`Service bookings for user ${userId}:`, userServiceBookings.length);
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
    const requiredFields = ['date', 'time', 'petName', 'petType'];
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
      totalAmount = Number(totalAmount) + Number(bookingData.deliveryFee);
    }

    try {
      // Ensure pets table exists
      await ensurePetsTableExists();

      // Check if pet ID is provided from cart
      let petId;
      if (bookingData.petId) {
        // Use existing pet ID from cart
        petId = bookingData.petId;
        console.log(`Using existing pet ID from cart: ${petId}`);
      } else {
        // Create pet record
        console.log('Creating pet record...');
        const petResult = await query(`
          INSERT INTO pets (
            user_id,
            name,
            species,
            breed,
            gender,
            age,
            weight,
            photo_path,
            special_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          bookingData.petName,
          bookingData.petType,
          bookingData.petBreed || null,
          bookingData.petGender || null,
          bookingData.petAge || null,
          bookingData.petWeight || null,
          bookingData.petImageUrl || null,
          bookingData.petSpecialNotes || null
        ]) as any;

        petId = petResult.insertId;
        console.log(`Pet record created with ID: ${petId}`);
      }

      console.log('Creating booking record with exact column mapping...');

      // Try to get column information from the bookings table
      const columnsQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
      `;
      const columnsResult = await query(columnsQuery) as any[];
      const columnNames = columnsResult.map((row: any) => row.COLUMN_NAME.toLowerCase());
      console.log('Available columns in bookings table:', columnNames);

      // Build dynamic SQL based on available columns
      let insertColumns = ['user_id', 'booking_date', 'booking_time', 'status', 'total_amount', 'special_requests'];
      let insertValues = [userId, bookingData.date, bookingData.time, 'pending', totalAmount, bookingData.specialRequests || ''];

      // Add pet_id only if the column exists in the table
      if (columnNames.includes('pet_id')) {
        insertColumns.push('pet_id');
        insertValues.push(petId);
      }

      // Add business_service_id if available
      if (columnNames.includes('business_service_id')) {
        insertColumns.push('business_service_id');
        insertValues.push(bookingData.packageId || null);
      } else if (columnNames.includes('package_id')) {
        insertColumns.push('package_id');
        insertValues.push(bookingData.packageId || null);
      }

      // Add provider_id if available
      if (columnNames.includes('provider_id')) {
        insertColumns.push('provider_id');
        insertValues.push(bookingData.providerId || null);
      }

      // Add customer details if available
      if (columnNames.includes('pet_name')) {
        insertColumns.push('pet_name');
        insertValues.push(bookingData.petName);
      }

      if (columnNames.includes('pet_type')) {
        insertColumns.push('pet_type');
        insertValues.push(bookingData.petType);
      }

      if (columnNames.includes('provider_name')) {
        insertColumns.push('provider_name');
        insertValues.push(bookingData.providerName || 'Service Provider');
      }

      if (columnNames.includes('package_name')) {
        insertColumns.push('package_name');
        insertValues.push(bookingData.packageName || 'Cremation Service');
      }

      if (columnNames.includes('payment_method')) {
        insertColumns.push('payment_method');
        insertValues.push(bookingData.paymentMethod || 'cash');
      }

      if (columnNames.includes('cause_of_death')) {
        insertColumns.push('cause_of_death');
        insertValues.push(bookingData.causeOfDeath || null);
      }

      // Add timestamps if available
      if (columnNames.includes('created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
      }

      if (columnNames.includes('updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
      }

      // Create final SQL with placeholders
      const placeholders = insertValues.map(() => '?').join(', ');
      const insertSQL = `
        INSERT INTO bookings (${insertColumns.join(', ')})
        VALUES (${placeholders})
      `;

      // Replace NOW() with the function call since it can't be parameterized
      const finalValues = insertValues.map(val => val === 'NOW()' ? new Date() : val);

      console.log('Insert SQL:', insertSQL);
      console.log('With parameters:', finalValues);

      const insertResult = await query(insertSQL, finalValues) as any;

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
          pet: {
            id: petId,
            name: bookingData.petName,
            type: bookingData.petType,
            breed: bookingData.petBreed || null,
            gender: bookingData.petGender || null,
            age: bookingData.petAge || null,
            weight: bookingData.petWeight || null,
            photo: bookingData.petImageUrl || null
          }
        }
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: 'Could not create booking record',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        sqlMessage: (error as any)?.sqlMessage
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'The booking could not be completed due to a server error.'
    }, { status: 500 });
  }
}

// Function to check if pets table exists and create it if not
async function ensurePetsTableExists() {
  try {
    // Check if the table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'rainbow_paws' AND table_name = 'pets'
    `);

    if (tableExists[0].count === 0) {
      console.log('Creating pets table as it does not exist...');

      // Create the pets table
      await query(`
        CREATE TABLE pets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          species VARCHAR(100) NOT NULL,
          breed VARCHAR(255),
          gender VARCHAR(50),
          age VARCHAR(50),
          weight DECIMAL(8,2),
          photo_path VARCHAR(255),
          special_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      console.log('Pets table created successfully');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error ensuring pets table exists:', error);
    return false;
  }
}