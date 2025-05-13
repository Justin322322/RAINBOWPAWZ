import { NextRequest, NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Helper function to check if the database is properly set up
async function checkDatabaseSetup() {
  try {
    // First check connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Database connection test failed');
      return false;
    }

    // Check if required tables exist
    const tables = await query(`
      SELECT
        table_name
      FROM
        information_schema.tables
      WHERE
        table_schema = ?
    `, [process.env.DB_NAME || 'rainbow_paws']);

    if (!Array.isArray(tables)) {
      console.error('Could not retrieve table list');
      return false;
    }

    // Log all available tables for debugging
    console.log('Available tables:', tables.map((row: any) => row.table_name || row.TABLE_NAME));

    // Get table names, handling different case formats
    const tableNames = tables.map((row: any) => {
      const name = row.table_name || row.TABLE_NAME;
      return name ? name.toLowerCase() : null;
    }).filter(Boolean);

    console.log('Normalized table names:', tableNames);

    // Check for required tables with more flexible matching
    // Only require the businesses table for basic functionality
    // Other tables are optional and will be handled gracefully if missing
    const criticalTables = ['business_profiles'];
    const warningTables = ['business_services', 'bookings'];

    const missingCriticalTables = [];
    const missingWarningTables = [];

    // Check critical tables (required for basic functionality)
    for (const table of criticalTables) {
      if (!tableNames.includes(table)) {
        console.error(`Critical table '${table}' is missing`);
        missingCriticalTables.push(table);
      }
    }

    // Check warning tables (not critical but may affect some features)
    for (const table of warningTables) {
      if (!tableNames.includes(table)) {
        console.warn(`Warning: Table '${table}' is missing - some features may not work`);
        missingWarningTables.push(table);
      }
    }

    // Log all missing tables
    if (missingCriticalTables.length > 0 || missingWarningTables.length > 0) {
      console.error('Missing tables summary:');
      if (missingCriticalTables.length > 0) {
        console.error('- Critical (blocking):', missingCriticalTables);
      }
      if (missingWarningTables.length > 0) {
        console.warn('- Warning (non-blocking):', missingWarningTables);
      }
    }

    // Only return false if critical tables are missing
    if (missingCriticalTables.length > 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking database setup:', error);
    return false;
  }
}

// Get all cremation businesses for admin panel
export async function GET(request: NextRequest) {
  console.log('Starting cremation businesses API request');

  try {
    // First verify the database connection is working
    console.log('Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Database connection failed - MySQL might not be running');
      return NextResponse.json({
        error: 'Database connection failed',
        details: 'Could not connect to MySQL server. Please ensure MySQL is running.',
        success: false
      }, { status: 500 });
    }

    // Check if database is properly set up
    const dbReady = await checkDatabaseSetup();
    if (!dbReady) {
      try {
        console.log('Database not ready, attempting to initialize it...');
        // Call our init-db endpoint
        const initResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/init-db`);

        if (!initResponse.ok) {
          console.error('Failed to initialize database:', initResponse.status, initResponse.statusText);
          return NextResponse.json({
            error: 'Database initialization failed',
            details: 'Could not auto-initialize the database. Please run database setup manually.',
            success: false
          }, { status: 500 });
        }

        const initResult = await initResponse.json();
        console.log('Database initialized:', initResult);
      } catch (initError) {
        console.error('Database initialization error:', initError);
        return NextResponse.json({
          error: 'Database initialization failed',
          details: 'Failed to initialize database automatically. You may need to run the database setup manually.',
          success: false
        }, { status: 500 });
      }
    }

    // Verify admin authentication
    let isAuthenticated = false;
    let userId = 'system';
    let accountType = 'admin';

    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        userId = tokenParts[0];
        accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // First check if the businesses table exists and has the right structure
    try {
      console.log('Testing basic query to business_profiles table');
      const tableCheck = await query(`SELECT COUNT(*) as count FROM business_profiles`);
      console.log('Business profiles table check result:', tableCheck);
    } catch (tableError) {
      console.error('Error checking businesses table:', tableError);
      return NextResponse.json({
        error: 'Database schema issue',
        details: tableError instanceof Error ? tableError.message : 'Unknown error',
        success: false
      }, { status: 500 });
    }

    // First check if the business_profiles table exists and has the right structure
    console.log('Checking business_profiles table structure...');
    try {
      // Check if the business_profiles table has the business_type column
      const tableStructure = await query(`
        SHOW COLUMNS FROM business_profiles WHERE Field = 'business_type'
      `);

      if (!Array.isArray(tableStructure) || tableStructure.length === 0) {
        console.error('business_profiles table is missing the business_type column');
        return NextResponse.json({
          error: 'Database schema issue',
          details: 'The business_profiles table is missing the business_type column. Database schema may need to be updated.',
          success: false
        }, { status: 500 });
      }

      console.log('business_profiles table structure check passed');
    } catch (structureError) {
      console.error('Error checking business_profiles table structure:', structureError);
      return NextResponse.json({
        error: 'Database schema issue',
        details: 'Could not verify the business_profiles table structure. ' +
                (structureError instanceof Error ? structureError.message : 'Unknown error'),
        success: false
      }, { status: 500 });
    }

    // Use a simplified query first to avoid complex joins that might cause issues
    console.log('Executing simplified query for cremation businesses');
    let businesses;
    try {
      // Use a more defensive query that handles potential missing columns
      businesses = await query(`
        SELECT
          bp.id,
          bp.business_name,
          u.email,
          bp.contact_first_name,
          bp.contact_last_name,
          bp.business_phone,
          bp.business_address,
          bp.province,
          bp.city,
          bp.business_hours,
          bp.service_description,
          bp.verification_status,
          CASE WHEN bp.verification_status = 'verified' THEN 1 ELSE 0 END as is_verified,
          bp.business_permit_path as document_path,
          bp.business_permit_number as bp_permit_number,
          bp.tax_id_number,
          bp.created_at,
          bp.updated_at
        FROM business_profiles bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.business_type = 'cremation'
      `);
    } catch (queryError) {
      console.error('Error querying business_profiles table:', queryError);

      // Try a more basic query if the first one fails
      try {
        console.log('Attempting fallback query with fewer columns...');
        businesses = await query(`
          SELECT
            bp.id,
            bp.business_name,
            u.email,
            bp.contact_first_name,
            bp.contact_last_name,
            bp.business_phone,
            bp.business_address,
            bp.verification_status,
            CASE WHEN bp.verification_status = 'verified' THEN 1 ELSE 0 END as is_verified,
            bp.created_at
          FROM business_profiles bp
          JOIN users u ON bp.user_id = u.id
          WHERE bp.business_type = 'cremation'
        `);

        console.log('Fallback query succeeded');
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return NextResponse.json({
          error: 'Database query failed',
          details: 'Both primary and fallback queries failed: ' +
                  (queryError instanceof Error ? queryError.message : 'Unknown error'),
          success: false
        }, { status: 500 });
      }
    }

    // Handle empty result
    if (!businesses || !Array.isArray(businesses)) {
      console.log('Businesses query returned invalid result');
      return NextResponse.json({
        error: 'Invalid query result',
        success: false,
        businesses: []
      }, { status: 500 });
    }

    // Format the results
    console.log(`Found ${businesses.length} cremation businesses`);
    const formattedBusinesses = businesses.map((business: any) => {
      try {
        // Format date with error handling
        let formattedDate = 'Unknown';
        try {
          if (business.created_at) {
            const registrationDate = new Date(business.created_at);
            formattedDate = registrationDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } catch (dateError) {
          console.warn('Error formatting date:', dateError);
        }

        // Combine first and last name with null checks
        const firstName = business.contact_first_name || '';
        const lastName = business.contact_last_name || '';
        const owner = `${firstName} ${lastName}`.trim() || 'Unknown Owner';

        // Format address with null checks
        const address = business.business_address || '';
        const city = business.city || '';
        const province = business.province || '';

        // Only add commas if the previous parts exist
        let fullAddress = address;
        if (city && fullAddress) fullAddress += `, ${city}`;
        else if (city) fullAddress = city;

        if (province && fullAddress) fullAddress += `, ${province}`;
        else if (province) fullAddress = province;

        if (!fullAddress) fullAddress = 'No address provided';

        // Determine verification status with null check
        const isVerified = business.is_verified === 1 || business.is_verified === true;

        return {
          id: business.id || 0,
          name: business.business_name || 'Unknown Business',
          owner: owner,
          email: business.email || '',
          phone: business.business_phone || '',
          address: fullAddress,
          city: city,
          province: province,
          registrationDate: formattedDate,
          status: business.verification_status === 'restricted' ? 'restricted' : (isVerified ? 'active' : 'pending'),
          activeServices: 0, // We'll update these with a separate query if needed
          totalBookings: 0,
          revenue: '₱0.00',
          description: business.service_description || 'No description provided',
          verified: isVerified,
          businessHours: business.business_hours || 'Not specified',
          permitNumber: business.bp_permit_number || '',
          taxIdNumber: business.tax_id_number || '',
          documentPath: business.document_path || ''
        };
      } catch (formatError) {
        console.error('Error formatting business data:', formatError, business);
        // Return a simplified record if formatting fails
        return {
          id: business.id || 0,
          name: business.business_name || 'Unknown Business',
          owner: 'Error formatting data',
          email: business.email || '',
          address: 'Error formatting address',
          registrationDate: 'Unknown',
          status: 'pending',
          activeServices: 0,
          totalBookings: 0,
          revenue: '₱0.00',
          description: 'Error formatting description',
          verified: false
        };
      }
    });

    // Now try to add statistics data if it doesn't cause errors
    try {
      console.log('Checking if statistics tables exist before fetching data');

      // First check if the required tables exist
      let businessServicesExists = false;
      let bookingsExists = false;

      try {
        const businessServicesCheck = await query(`SHOW TABLES LIKE 'business_services'`);
        businessServicesExists = Array.isArray(businessServicesCheck) && businessServicesCheck.length > 0;

        const bookingsCheck = await query(`SHOW TABLES LIKE 'bookings'`);
        bookingsExists = Array.isArray(bookingsCheck) && bookingsCheck.length > 0;

        console.log('Statistics tables check:', {
          business_services: businessServicesExists ? 'exists' : 'missing',
          bookings: bookingsExists ? 'exists' : 'missing'
        });
      } catch (tableCheckError) {
        console.error('Error checking statistics tables:', tableCheckError);
        // Skip statistics if we can't verify the tables
        return;
      }

      // Only proceed if the tables exist
      if (!businessServicesExists || !bookingsExists) {
        console.log('Skipping statistics due to missing tables');
        return;
      }

      console.log('Fetching service statistics');
      for (let i = 0; i < formattedBusinesses.length; i++) {
        const business = formattedBusinesses[i];

        // Skip if business ID is invalid
        if (!business.id) {
          console.warn('Skipping statistics for business with invalid ID');
          continue;
        }

        try {
          // Get service count with a more robust query
          const serviceResult = await query(`
            SELECT COUNT(*) as count
            FROM business_services
            WHERE business_profile_id = ? AND is_active = 1
          `, [business.id]);

          if (serviceResult && serviceResult[0]) {
            business.activeServices = parseInt(serviceResult[0].count || '0');
          }
        } catch (serviceError) {
          console.error(`Error fetching services for business ${business.id}:`, serviceError);
          // Continue with next business
        }

        try {
          // Get booking count and revenue with a more robust query
          const bookingResult = await query(`
            SELECT
              COUNT(b.id) as count,
              COALESCE(SUM(b.total_amount), 0) as revenue
            FROM bookings b
            JOIN business_services bs ON b.business_service_id = bs.id
            WHERE bs.business_profile_id = ?
          `, [business.id]);

          if (bookingResult && bookingResult[0]) {
            // Parse with error handling
            try {
              business.totalBookings = parseInt(bookingResult[0].count || '0');

              // Format revenue with PHP sign
              const revenue = parseFloat(bookingResult[0].revenue || '0');
              business.revenue = `₱${revenue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`;
            } catch (parseError) {
              console.error(`Error parsing booking stats for business ${business.id}:`, parseError);
            }
          }
        } catch (bookingError) {
          console.error(`Error fetching bookings for business ${business.id}:`, bookingError);
          // Continue with next business
        }
      }
    } catch (statsError) {
      console.error('Error fetching statistics (non-critical):', statsError);
      // We continue even if statistics fail, as we have the basic business data
    }

    console.log('Successfully processed cremation businesses data');
    return NextResponse.json({
      success: true,
      businesses: formattedBusinesses
    });
  } catch (error) {
    console.error('Error fetching cremation businesses:', error);
    return NextResponse.json({
      error: 'Failed to fetch cremation businesses',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

// Get a specific cremation business by ID
export async function POST(request: NextRequest) {
  try {
    console.log('Starting specific cremation business fetch');

    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    console.log('User ID:', userId, 'Account Type:', accountType);

    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required', success: false }, { status: 403 });
    }

    // Get the business ID from the request body
    const body = await request.json();
    const businessId = body.businessId;
    console.log('Requested business ID:', businessId);

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required', success: false }, { status: 400 });
    }

    // Get the business details with a simple query
    console.log('Fetching basic business details');
    const businessResults = await query(`
      SELECT
        bp.id,
        bp.business_name,
        u.email,
        bp.contact_first_name,
        bp.contact_last_name,
        bp.business_phone,
        bp.business_address,
        bp.province,
        bp.city,
        bp.zip,
        bp.business_hours,
        bp.service_description,
        CASE WHEN bp.verification_status = 'verified' THEN 1 ELSE 0 END as is_verified,
        bp.business_permit_path as document_path,
        '' as bp_permit_number,
        '' as tax_id_number,
        bp.created_at,
        bp.updated_at
      FROM business_profiles bp
      JOIN users u ON bp.user_id = u.id
      WHERE bp.id = ? AND bp.business_type = 'cremation'
    `, [businessId]);

    if (!businessResults || businessResults.length === 0) {
      console.log('Business not found');
      return NextResponse.json({ error: 'Business not found', success: false }, { status: 404 });
    }

    const business = businessResults[0];
    console.log('Found business:', business.business_name);

    // Get business documents
    let documents = [];
    if (business.document_path) {
      try {
        documents.push({
          type: 'Business Documents',
          path: business.document_path,
          uploadDate: new Date(business.updated_at).toLocaleDateString('en-US')
        });
      } catch (error) {
        console.error('Error parsing documents (non-critical):', error);
      }
    }

    // Format the business details
    const formattedBusiness = {
      id: business.id,
      name: business.business_name,
      owner: `${business.contact_first_name} ${business.contact_last_name}`,
      email: business.email,
      phone: business.business_phone,
      address: business.business_address,
      city: business.city,
      province: business.province,
      zip: business.zip,
      fullAddress: `${business.business_address}, ${business.city}, ${business.province}, ${business.zip}`,
      registrationDate: new Date(business.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      lastUpdated: new Date(business.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      status: business.is_verified === 1 ? 'active' : 'pending',
      description: business.service_description || 'No description provided',
      verified: business.is_verified === 1,
      businessHours: business.business_hours || 'Not specified',
      permitNumber: business.bp_permit_number || 'Not provided',
      taxIdNumber: business.tax_id_number || 'Not provided',
      documents: documents,
      services: [],
      bookingStats: {
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalRevenue: '₱0.00'
      }
    };

    // Try to get additional data if it doesn't cause errors
    try {
      console.log('Fetching business services');
      const services = await query(`
        SELECT
          bs.id,
          bs.price,
          bs.duration,
          bs.max_attendees,
          bs.is_available,
          st.name as service_name,
          st.description as service_description,
          st.category
        FROM business_services bs
        JOIN service_types st ON bs.service_type_id = st.id
        WHERE bs.business_id = ?
      `, [businessId]);

      if (services) {
        formattedBusiness.services = services;
      }
    } catch (servicesError) {
      console.error('Error fetching services (non-critical):', servicesError);
      // We continue even if service fetch fails
    }

    try {
      console.log('Fetching booking statistics');
      const bookingStats = await query(`
        SELECT
          COUNT(b.id) as total_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          SUM(b.total_amount) as total_revenue
        FROM bookings b
        JOIN business_services bs ON b.business_service_id = bs.id
        WHERE bs.business_id = ?
      `, [businessId]);

      if (bookingStats && bookingStats[0]) {
        formattedBusiness.bookingStats = {
          totalBookings: bookingStats[0].total_bookings || 0,
          completedBookings: bookingStats[0].completed_bookings || 0,
          pendingBookings: bookingStats[0].pending_bookings || 0,
          cancelledBookings: bookingStats[0].cancelled_bookings || 0,
          totalRevenue: bookingStats[0].total_revenue
            ? `₱${Number(bookingStats[0].total_revenue).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`
            : '₱0.00'
        };
      }
    } catch (statsError) {
      console.error('Error fetching booking stats (non-critical):', statsError);
      // We continue even if statistics fail
    }

    console.log('Successfully prepared business details response');
    return NextResponse.json({
      success: true,
      business: formattedBusiness
    });
  } catch (error) {
    console.error('Error fetching cremation business details:', error);
    return NextResponse.json({
      error: 'Failed to fetch business details',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}