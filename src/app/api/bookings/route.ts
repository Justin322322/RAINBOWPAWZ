import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// Import the consolidated email service

// Define service types with consistent naming and descriptions
const _serviceTypes: Record<number, { name: string; description: string; price: number }> = {
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

// Ensure pet date columns exist on bookings and pets tables (safe, best-effort)
async function ensurePetDateColumns() {
  try {
    const bcols = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
    `) as any[];
    const bset = new Set((bcols || []).map((r:any) => String(r.COLUMN_NAME).toLowerCase()));
    if (!bset.has('pet_dob')) { try { await query(`ALTER TABLE bookings ADD COLUMN pet_dob DATE NULL`); } catch {}
    }
    if (!bset.has('pet_date_of_death')) { try { await query(`ALTER TABLE bookings ADD COLUMN pet_date_of_death DATE NULL`); } catch {}
    }

    const pcols = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets'
    `) as any[];
    const pset = new Set((pcols || []).map((r:any) => String(r.COLUMN_NAME).toLowerCase()));
    if (!pset.has('date_of_birth')) { try { await query(`ALTER TABLE pets ADD COLUMN date_of_birth DATE NULL`); } catch {}
    }
    if (!pset.has('date_of_death')) { try { await query(`ALTER TABLE pets ADD COLUMN date_of_death DATE NULL`); } catch {}
    }
  } catch {}
}

export async function GET(request: NextRequest) {
  try {
    // First, check if the database is available
    try {
      // Simple connection test
      await query('SELECT 1 as connection_test');
    } catch {
      // If database is unavailable, return empty bookings array instead of error
      // This prevents the UI from showing an error message
      return NextResponse.json({
        bookings: [],
        warning: 'Database connection unavailable'
      });
    }

    // Best-effort ensure columns exist so responses can include pet dates
    await ensurePetDateColumns();

    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    let accountType: string;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { verifyToken } = await import('@/lib/jwt');
      const payload = verifyToken(authToken);

      if (!payload || !payload.userId || !payload.accountType) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      userId = payload.userId;
      accountType = payload.accountType;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length !== 2) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
      }

      userId = parts[0];
      accountType = parts[1];
    }

    // Allow admin users to access bookings (for testing/management purposes)
    // Allow regular users and fur_parents to access their own bookings
    if (!userId || !['user', 'fur_parent', 'admin'].includes(accountType)) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: `Invalid account type: ${accountType}. Expected 'user', 'fur_parent', or 'admin'`
      }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // First, try a direct query to bookings table
    try {
      // Try both string and number versions of the user ID
      const userIdNumber = Number(userId);

      // Query with both string and number versions of the user ID
      const directQuery = `
        SELECT * FROM bookings
        WHERE user_id = ? OR user_id = ?
      `;
      const directResult = await query(directQuery, [userIdNumber, userId.toString()]) as any[];

      if (directResult && directResult.length > 0) {

        // Format the bookings data
        const formattedBookings = await Promise.all(directResult.map(async (booking) => {
          // Get refund information for this booking
          let refundData = null;
          try {
            const refundQuery = `
              SELECT id, amount, status, refund_type, initiated_at, completed_at, reason
              FROM refunds 
              WHERE booking_id = ? 
              ORDER BY initiated_at DESC 
              LIMIT 1
            `;
            const refundResult = await query(refundQuery, [booking.id]) as any[];
            if (refundResult && refundResult.length > 0) {
              refundData = refundResult[0];
            }
          } catch (error) {
            console.error('Error fetching refund data for booking:', booking.id, error);
          }

          // Format dates for consistency
          let formattedDate = null;

          if (booking.booking_date) {
            try {
              // Log the original date for debugging

              // Helper function to format date consistently
              const formatDateToString = (date: Date | string): string => {
                let d: Date;

                if (typeof date === 'string') {
                  // If it's already a string with YYYY-MM-DD format, just return it
                  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    return date;
                  }

                  // Try to parse the string into a Date object
                  d = new Date(date);

                  // If parsing fails, try to extract date components manually
                  if (isNaN(d.getTime()) && date.includes('-')) {
                    const [year, month, day] = date.split('-').map(Number);
                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                      d = new Date(year, month - 1, day);
                    }
                  }
                } else {
                  d = date;
                }

                // Check if we have a valid date
                if (isNaN(d.getTime())) {
                  throw new Error('Invalid date');
                }

                // Format as YYYY-MM-DD to ensure consistency
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');

                return `${year}-${month}-${day}`;
              };

              // Try to format the date
              formattedDate = formatDateToString(booking.booking_date);

              // Log the formatted date for debugging
            } catch (dateError) {
              console.error('Error parsing booking date:', dateError);

              // Use the original date string as fallback
              // If it's already in YYYY-MM-DD format, use it directly
              const dateStr = booking.booking_date.toString();
              if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                formattedDate = dateStr;
              } else {
                // Try to extract date components if it contains dashes
                if (dateStr.includes('-')) {
                  const parts = dateStr.split('-');
                  if (parts.length === 3) {
                    formattedDate = dateStr;
                  }
                }

                // If all else fails, use the original string
                if (!formattedDate) {
                  formattedDate = dateStr;
                }
              }
            }
          }

          // Format time if available
          const timeString = booking.booking_time ?
            booking.booking_time.toString().padStart(8, '0') : null;

          // Get provider information if available
          let providerName = 'Service Provider';
          let providerAddress = 'Provider Address';

          // If provider_id exists, try to get the actual provider name
          if (booking.provider_id) {
            try {
              const providerResult = await query(`
                SELECT name, address
                FROM service_providers
                WHERE provider_id = ?
                LIMIT 1
              `, [booking.provider_id]) as any[];

              if (providerResult && providerResult.length > 0) {
                providerName = providerResult[0].name;
                providerAddress = providerResult[0].address || 'Provider Address';
              }
            } catch (providerError) {
              // If provider query fails, use default values
              console.error('Provider fetch error:', providerError);
            }
          }

          return {
            ...booking,
            booking_date: formattedDate,
            booking_time: timeString,
            provider_name: providerName,
            provider_address: providerAddress,
            service_name: 'Cremation Service',
            service_description: 'Pet cremation service',
            service_price: booking.base_price || booking.total_price || booking.price || 0,
            total_amount: booking.total_price || booking.base_price || booking.price || 0,
            price: booking.base_price || booking.total_price || booking.price || 0,
            pet_name: booking.pet_name || 'Unknown Pet',
            pet_type: booking.pet_type || 'Unknown Type',
            pet_dob: booking.pet_dob || null,
            pet_date_of_death: booking.pet_date_of_death || null,
            refund: refundData
          };
        }));

        return NextResponse.json({ bookings: formattedBookings });
      }
    } catch {
      // Continue with the regular flow if direct query fails
    }

    // If direct query didn't work, proceed with the regular flow
    let bookingsQuery = '';
    let bookingsParams = [];

    try {
      // First, check if the bookings table exists
      const tableExistsCheck = await query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'"
      ) as any[];

      if (!tableExistsCheck || tableExistsCheck[0].count === 0) {

        // Check if bookings table exists
        const bookingsCheck = await query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'"
        ) as any[];

        if (bookingsCheck && bookingsCheck[0].count > 0) {

          // Build query for bookings table
          bookingsQuery = `
            SELECT sb.*,
                   st.name as service_name,
                   st.description as service_description,
                   sb.total_price as service_price,
                   sb.pet_name as pet_name,
                   sb.pet_type as pet_type,
                   CONCAT('Service Provider #', sb.provider_id) as provider_name,
                   sb.location_address as provider_address
            FROM bookings sb
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

        // Check if service_provider_id column exists (from bookings_tables.sql)
        const serviceProviderCheck = await query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'service_provider_id'"
        ) as any[];

        if (serviceProviderCheck && serviceProviderCheck.length > 0) {
          // We have the bookings_tables.sql structure

          // Build query based on the bookings_tables.sql structure
          bookingsQuery = `
            SELECT b.*,
                   sp.name as provider_name,
                   sp.address as provider_address,
                   spkg.name as service_name,
                   spkg.description as service_description,
                   spkg.price as service_price
            FROM bookings b
            LEFT JOIN service_providers sp ON b.service_provider_id = sp.provider_id
            LEFT JOIN service_packages spkg ON b.service_package_id = spkg.package_id
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

            // Check if the pets table exists
            const petsTableCheck = await query(
              "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pets'"
            ) as any[];

            const petsTableExists = petsTableCheck && petsTableCheck[0].count > 0;

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

            const _businessServicesExists = businessServicesCheck && businessServicesCheck[0].count > 0;

            // Build query based on the structure we have
            if (petsTableExists) {
              // Original query with pets table join
              bookingsQuery = `
                SELECT b.*,
                       'N/A' as pet_name,
                       'N/A' as pet_type,
                       sp.price as service_price,
                       spr.name as provider_name,
                       spr.address as provider_address,
                       sp.name as service_name,
                       sp.description as service_description
                FROM bookings b
                LEFT JOIN service_packages sp ON b.package_id = sp.package_id
                LEFT JOIN service_providers spr ON sp.provider_id = spr.provider_id
                WHERE b.user_id = ?
              `;
            } else if (hasPetNameColumn && hasPetTypeColumn) {
              // Use pet_name and pet_type columns from bookings table
              bookingsQuery = `
                SELECT b.*,
                       b.pet_name as pet_name,
                       b.pet_type as pet_type,
                       sp.price as service_price,
                       spr.name as provider_name,
                       spr.address as provider_address,
                       sp.name as service_name,
                       sp.description as service_description
                FROM bookings b
                LEFT JOIN service_packages sp ON b.package_id = sp.package_id
                LEFT JOIN service_providers spr ON sp.provider_id = spr.provider_id
                WHERE b.user_id = ?
              `;
            } else {
              // Fallback query without pet information
              bookingsQuery = `
                SELECT b.*,
                       'N/A' as pet_name,
                       'N/A' as pet_type,
                       sp.price as service_price,
                       spr.name as provider_name,
                       spr.address as provider_address,
                       sp.name as service_name,
                       sp.description as service_description
                FROM bookings b
                LEFT JOIN service_packages sp ON b.package_id = sp.package_id
                LEFT JOIN service_providers spr ON sp.provider_id = spr.provider_id
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

            bookingsQuery = `
              SELECT b.*,
                     'Service Provider' as provider_name,
                     'Service Address' as provider_address,
                     'Service' as service_name,
                     'Service Description' as service_description,
                     b.total_price as service_price,
                     'Unknown Pet' as pet_name,
                     'Unknown Type' as pet_type
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
      const bookings = await query(bookingsQuery, bookingsParams) as any[];

      // If no bookings found, return empty array
      if (!bookings || bookings.length === 0) {

        // Check bookings table as a fallback
        try {
          // Use a more detailed query to get bookings with package information
          const bookingsQuery = `
            SELECT sb.*,
                   sp.name as package_name,
                   sp.description as package_description,
                   sp.business_name as provider_name,
                   sp.business_address as provider_address
            FROM bookings sb
            LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
            LEFT JOIN service_providers bp ON sb.provider_id = sp.id
            WHERE sb.user_id = ?
          `;
          const bookings = await query(bookingsQuery, [userId]) as any[];

          if (bookings && bookings.length > 0) {

            // Format the bookings data
            const formattedBookings = bookings.map(booking => {
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
                service_price: booking.base_price || booking.total_price || booking.price || 0,
                total_amount: booking.total_price || booking.base_price || booking.price || 0,
                price: booking.base_price || booking.total_price || booking.price || 0,
                pet_name: booking.pet_name || 'Unknown Pet',
                pet_type: booking.pet_type || 'Unknown Type'
              };
            });

            return NextResponse.json({ bookings: formattedBookings });
          }

          // If the join query fails, try a simpler query
          if (!bookings || bookings.length === 0) {
            const simpleServiceBookingsQuery = `
              SELECT * FROM bookings WHERE user_id = ?
            `;
            const simpleServiceBookings = await query(simpleServiceBookingsQuery, [userId]) as any[];

            if (simpleServiceBookings && simpleServiceBookings.length > 0) {

              // Format the bookings data
              const formattedBookings = await Promise.all(simpleServiceBookings.map(async (booking) => {
                // Format dates for consistency
                let formattedDate = null;

                if (booking.booking_date) {
                  try {
                    // Log the original date for debugging

                    // Helper function to format date consistently
                    const formatDateToString = (date: Date | string): string => {
                      let d: Date;

                      if (typeof date === 'string') {
                        // If it's already a string with YYYY-MM-DD format, just return it
                        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          return date;
                        }

                        // Try to parse the string into a Date object
                        d = new Date(date);

                        // If parsing fails, try to extract date components manually
                        if (isNaN(d.getTime()) && date.includes('-')) {
                          const [year, month, day] = date.split('-').map(Number);
                          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                            d = new Date(year, month - 1, day);
                          }
                        }
                      } else {
                        d = date;
                      }

                      // Check if we have a valid date
                      if (isNaN(d.getTime())) {
                        throw new Error('Invalid date');
                      }

                      // Format as YYYY-MM-DD to ensure consistency
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');

                      return `${year}-${month}-${day}`;
                    };

                    // Try to format the date
                    formattedDate = formatDateToString(booking.booking_date);

                    // Log the formatted date for debugging
                  } catch (dateError) {
                    console.error('Error parsing booking date:', dateError);

                    // Use the original date string as fallback
                    // If it's already in YYYY-MM-DD format, use it directly
                    const dateStr = booking.booking_date.toString();
                    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      formattedDate = dateStr;
                    } else {
                      // Try to extract date components if it contains dashes
                      if (dateStr.includes('-')) {
                        const parts = dateStr.split('-');
                        if (parts.length === 3) {
                          formattedDate = dateStr;
                        }
                      }

                      // If all else fails, use the original string
                      if (!formattedDate) {
                        formattedDate = dateStr;
                      }
                    }
                  }
                }

                // Format time if available
                const timeString = booking.booking_time ?
                  booking.booking_time.toString().padStart(8, '0') : null;

                // Get provider information if available
                let providerName = 'Service Provider';
                let providerAddress = 'Provider Address';

                // If provider_id exists, try to get the actual provider name
                if (booking.provider_id) {
                  try {
                    const providerResult = await query(`
                      SELECT name, address
                      FROM service_providers
                      WHERE provider_id = ?
                      LIMIT 1
                    `, [booking.provider_id]) as any[];

                    if (providerResult && providerResult.length > 0) {
                      providerName = providerResult[0].name;
                      providerAddress = providerResult[0].address || 'Provider Address';
                    }
                  } catch (providerError) {
                    // If provider query fails, use default values
                    console.error('Provider fetch error:', providerError);
                  }
                }

                return {
                  ...booking,
                  booking_date: formattedDate,
                  booking_time: timeString,
                  provider_name: providerName,
                  provider_address: providerAddress,
                  service_name: 'Cremation Service',
                  service_description: 'Pet cremation service',
                  service_price: booking.base_price || booking.total_price || booking.price || 0,
                  total_amount: booking.total_price || booking.base_price || booking.price || 0,
                  price: booking.base_price || booking.total_price || booking.price || 0,
                  pet_name: booking.pet_name || 'Unknown Pet',
                pet_type: booking.pet_type || 'Unknown Type',
                pet_dob: booking.pet_dob || null,
                pet_date_of_death: booking.pet_date_of_death || null
                };
              }));

              return NextResponse.json({ bookings: formattedBookings });
            }
          }
        } catch {
          // Fallback error handling
        }

        return NextResponse.json({ bookings: [] });
      }

      // Format the bookings data
      const formattedBookings = await Promise.all(bookings.map(async booking => {
        // Format dates for consistency
        let formattedDate = null;

        if (booking.booking_date) {
          try {
            // Log the original date for debugging

            // Helper function to format date consistently
            const formatDateToString = (date: Date | string): string => {
              let d: Date;

              if (typeof date === 'string') {
                // If it's already a string with YYYY-MM-DD format, just return it
                if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  return date;
                }

                // Try to parse the string into a Date object
                d = new Date(date);

                // If parsing fails, try to extract date components manually
                if (isNaN(d.getTime()) && date.includes('-')) {
                  const [year, month, day] = date.split('-').map(Number);
                  if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    d = new Date(year, month - 1, day);
                  }
                }
              } else {
                d = date;
              }

              // Check if we have a valid date
              if (isNaN(d.getTime())) {
                throw new Error('Invalid date');
              }

              // Format as YYYY-MM-DD to ensure consistency
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');

              return `${year}-${month}-${day}`;
            };

            // Try to format the date
            formattedDate = formatDateToString(booking.booking_date);

            // Log the formatted date for debugging
          } catch (dateError) {
            console.error('Error parsing booking date:', dateError);

            // Use the original date string as fallback
            // If it's already in YYYY-MM-DD format, use it directly
            const dateStr = booking.booking_date.toString();
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              formattedDate = dateStr;
            } else {
              // Try to extract date components if it contains dashes
              if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                  formattedDate = dateStr;
                }
              }

              // If all else fails, use the original string
              if (!formattedDate) {
                formattedDate = dateStr;
              }
            }
          }
        }

        // Get provider information if available
        let providerName = booking.provider_name || 'Unknown Provider';
        let providerAddress = booking.provider_address || 'No address available';

        // If provider_id exists and provider_name is not set, try to get the actual provider name
        if (booking.provider_id && (!booking.provider_name || booking.provider_name === 'Service Provider')) {
          try {
            const providerResult = await query(`
              SELECT name, address
              FROM service_providers
              WHERE provider_id = ?
              LIMIT 1
            `, [booking.provider_id]) as any[];

            if (providerResult && providerResult.length > 0) {
              providerName = providerResult[0].name;
              providerAddress = providerResult[0].address || 'Provider Address';
            }
          } catch (providerError) {
            // If provider query fails, use default values
            console.error('Provider fetch error:', providerError);
          }
        }

        return {
          ...booking,
          booking_date: formattedDate,
          // Add default values for any missing fields
          provider_name: providerName,
          provider_address: providerAddress,
          service_name: booking.service_name || 'Unknown Service',
          service_description: booking.service_description || 'No description available',
          pet_name: booking.pet_name || 'Unknown Pet',
          pet_type: booking.pet_type || 'Unknown Type'
        };
      }));

      return NextResponse.json({ bookings: formattedBookings });
    } catch {
      // Check if the database connection is working
      try {
        const connectionTest = await query('SELECT 1 as test');

        if (!connectionTest || !Array.isArray(connectionTest) || connectionTest.length === 0) {
          // Return empty bookings array instead of error
          return NextResponse.json({
            bookings: [],
            warning: 'Database connection issue'
          });
        }

        // If connection is working but we still got an error, it's likely a query issue

        // First check if bookings table has pet_id column for proper join
        const petIdCheck = await query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'pet_id'
        `) as any[];

        const _hasPetIdColumn = petIdCheck.length > 0;

        // Get bookings first
        const bookingsQuery = `
          SELECT b.*,
                 spkg.name as service_name,
                 spkg.description as service_description,
                 spkg.price as service_price,
                 sp.name as provider_name,
                 sp.address as provider_address
          FROM bookings b
          LEFT JOIN service_packages spkg ON b.package_id = spkg.package_id
          LEFT JOIN service_providers sp ON spkg.provider_id = sp.provider_id
          WHERE b.user_id = ?
        `;

        // Execute query to get bookings
        const bookingsResult = await query(bookingsQuery, [userId]) as any[];

        if (bookingsResult && bookingsResult.length > 0) {
          // Since we have bookings, fetch pets separately
          const petsQuery = `
            SELECT *
            FROM pets
            WHERE user_id = ?
            ORDER BY created_at DESC
          `;

          const petsResult = await query(petsQuery, [userId]) as any[];

          // Map bookings with pet info
          const formattedBookings = await Promise.all(bookingsResult.map(async (booking) => {
            // Get refund information for this booking
            let refundData = null;
            try {
              const refundQuery = `
                SELECT id, amount, status, refund_type, initiated_at, completed_at, reason
                FROM refunds 
                WHERE booking_id = ? 
                ORDER BY initiated_at DESC 
                LIMIT 1
              `;
              const refundResult = await query(refundQuery, [booking.id]) as any[];
              if (refundResult && refundResult.length > 0) {
                refundData = refundResult[0];
              }
            } catch (error) {
              console.error('Error fetching refund data for booking:', booking.id, error);
            }

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
              service_description: booking.service_description || 'Pet cremation service',
              refund: refundData
            };
          }));

          return NextResponse.json({ bookings: formattedBookings });
        }

        // Fallback to simple query if no bookings found

        // First check if bookings table has pet_id column for proper join
        const fallbackPetIdCheck = await query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'pet_id'
        `) as any[];

        const fallbackHasPetIdColumn = fallbackPetIdCheck.length > 0;

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
            LEFT JOIN pets p ON b.pet_id = p.pet_id
            LEFT JOIN service_packages spkg ON b.package_id = spkg.package_id
            LEFT JOIN service_providers sp ON spkg.provider_id = sp.provider_id
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
            LEFT JOIN service_packages spkg ON b.package_id = spkg.package_id
            LEFT JOIN service_providers sp ON spkg.provider_id = sp.provider_id
            WHERE b.user_id = ?
          `;
        }

        const simpleParams = [userId];

        try {
          const simpleResult = await query(simpleQuery, simpleParams) as any[];

          if (simpleResult && Array.isArray(simpleResult)) {

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
                service_price: booking.base_price || booking.total_price || booking.service_price || booking.price || 0,
                total_amount: booking.total_price || booking.base_price || booking.price || 0,
                price: booking.base_price || booking.total_price || booking.price || 0,
                pet_name: booking.pet_name || 'Pet',
                pet_type: booking.pet_type || 'Unknown',
                pet_dob: booking.pet_dob || null,
                pet_date_of_death: booking.pet_date_of_death || null
              };
            });

            return NextResponse.json({ bookings: formattedBookings });
          }
        } catch {
          // Try to join with just the pets table
          try {

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
                       b.total_price as service_price
                FROM bookings b
                LEFT JOIN pets p ON b.pet_id = p.pet_id
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
                       b.total_price as service_price
                FROM bookings b
                WHERE b.user_id = ?
              `;
            }

            const petsResult = await query(petsQuery, [userId]) as any[];

            if (petsResult && petsResult.length > 0) {

              // Format with data from pets table
              const formattedBookings = petsResult.map(booking => ({
                ...booking,
                booking_date: booking.booking_date ?
                  new Date(booking.booking_date).toISOString().split('T')[0] : null,
                provider_name: 'Service Provider',
                provider_address: 'Provider Address',
                service_name: 'Cremation Service',
                service_description: 'Pet cremation service',
                service_price: booking.base_price || booking.total_price || booking.price || 0,
                total_amount: booking.total_price || booking.base_price || booking.price || 0,
                price: booking.base_price || booking.total_price || booking.price || 0,
                pet_name: booking.pet_name || 'Pet',
              pet_type: booking.pet_type || 'Unknown',
              pet_dob: booking.pet_dob || null,
              pet_date_of_death: booking.pet_date_of_death || null
              }));

              return NextResponse.json({ bookings: formattedBookings });
            }
          } catch {
            // Pets query failed
          }
        }

        // No fallback to mock data - if we get here, return empty array
        return NextResponse.json({ bookings: [] });
      } catch {
        // Return empty bookings array instead of error
        return NextResponse.json({
          bookings: [],
          warning: 'Database connection unavailable'
        });
      }
    }
  } catch {
    // Return empty bookings array instead of error
    return NextResponse.json({
      bookings: [],
      warning: 'Could not retrieve bookings'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure pet date columns exist before insertion
    await ensurePetDateColumns();

    // Get user ID from auth token or from the request body for checkout flow
    let userId, accountType;
    const authToken = getAuthTokenFromRequest(request);

    if (authToken) {
      [userId, accountType] = authToken.split('_');

      if (!userId || accountType !== 'user') {
        return NextResponse.json({ error: 'Unauthorized: Invalid user type' }, { status: 401 });
      }
    } else {
      // For checkout flow when user might not have auth token in request
      const bookingRequestData = await request.json();

      if (bookingRequestData.userId) {
        userId = bookingRequestData.userId;
      } else {
        return NextResponse.json({ error: 'Unauthorized: No authentication' }, { status: 401 });
      }
    }

    // Get booking data from request body
    const bookingData = await request.json();

    // Validate required fields
    const requiredFields = ['date', 'time', 'petName', 'petType'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);

    if (missingFields.length > 0) {
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
      } else {
        // Create pet record (include date fields if available)
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
            date_of_birth,
            date_of_death,
            special_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          bookingData.petName,
          bookingData.petType,
          bookingData.petBreed || null,
          bookingData.petGender || null,
          bookingData.petAge || null,
          bookingData.petWeight || null,
          bookingData.petImageUrl || null,
          bookingData.petDob || bookingData.pet_dob || null,
          bookingData.petDateOfDeath || bookingData.pet_date_of_death || null,
          bookingData.petSpecialNotes || null
        ]) as any;

        petId = petResult.insertId;
      }

      // Try to get column information from the bookings table
      const columnsQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
      `;
      const columnsResult = await query(columnsQuery) as any[];
      const columnNames = columnsResult.map((row: any) => row.COLUMN_NAME.toLowerCase());

      // Build dynamic SQL based on available columns
      let insertColumns = ['user_id', 'booking_date', 'booking_time', 'status', 'total_price', 'special_requests'];
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

      // Add pet date fields to bookings if columns exist
      if (columnNames.includes('pet_dob')) {
        insertColumns.push('pet_dob');
        insertValues.push(bookingData.petDob || bookingData.pet_dob || null);
      }
      if (columnNames.includes('pet_date_of_death')) {
        insertColumns.push('pet_date_of_death');
        insertValues.push(bookingData.petDateOfDeath || bookingData.pet_date_of_death || null);
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

      // Add size-based pricing fields if available
      if (columnNames.includes('selected_size_category')) {
        insertColumns.push('selected_size_category');
        insertValues.push(bookingData.selectedSizeCategory || null);
      }

      if (columnNames.includes('selected_size_price')) {
        insertColumns.push('selected_size_price');
        insertValues.push(bookingData.selectedSizePrice || null);
      }

      if (columnNames.includes('has_size_pricing')) {
        insertColumns.push('has_size_pricing');
        insertValues.push(bookingData.hasSizePricing || false);
      }

      if (columnNames.includes('pet_weight')) {
        insertColumns.push('pet_weight');
        insertValues.push(bookingData.petWeight || null);
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

      // SECURITY FIX: Create final SQL with placeholders and safe column joining
      const placeholders = insertValues.map(() => '?').join(', ');
      const columnsStr = insertColumns.join(', ');
      const insertSQL = `
        INSERT INTO bookings (${columnsStr})
        VALUES (${placeholders})
      `;

      // Replace NOW() with the function call since it can't be parameterized
      const finalValues = insertValues.map(val => val === 'NOW()' ? new Date() : val);

      const insertResult = await query(insertSQL, finalValues) as any;
      const insertId = insertResult.insertId;

      // Remove the booked time slot from availability to prevent double booking
      try {
        if (bookingData.providerId && bookingData.date && bookingData.time) {
          // Format booking time to match the time_slot format (HH:MM)
          const formattedBookingTime = bookingData.time.substring(0, 5);
          
          // Find the time slot that matches this booking
          const findTimeSlotQuery = `
            SELECT id 
            FROM service_providers 
            WHERE provider_id = ? 
            AND date = ? 
            AND start_time = ?
          `;
          
          const timeSlots = await query(findTimeSlotQuery, [
            bookingData.providerId, 
            bookingData.date,
            formattedBookingTime
          ]) as any[];
          
          if (timeSlots && timeSlots.length > 0) {
            // Delete the time slot to prevent it from being booked again
            const timeSlotId = timeSlots[0].id;
            await query('DELETE FROM service_providers WHERE id = ?', [timeSlotId]);
          } else {
          }
        }
      } catch (timeSlotError) {
        // Log the error but don't fail the booking creation
        console.error('Error removing time slot after booking creation:', timeSlotError);
      }

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

      return true;
    }

    return true;
  } catch {
    return false;
  }
}
