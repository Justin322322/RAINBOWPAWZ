import { NextRequest, NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

// Helper function to check if the database is properly set up
async function checkDatabaseSetup() {
  try {
    // First check connection
    const connected = await testConnection();
    if (!connected) {
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
      return false;
    }

    // Log all available tables for debugging

    // Get table names, handling different case formats
    const tableNames = tables.map((row: any) => {
      const name = row.table_name || row.TABLE_NAME;
      return name ? name.toLowerCase() : null;
    }).filter(Boolean);


    // Check for required tables with more flexible matching
    // Only require the businesses table for basic functionality
    // Other tables are optional and will be handled gracefully if missing
    // Allow either service_providers or service_providers as the critical table
    const criticalTables = [['service_providers', 'service_providers']]; // Either one of these is required
    const warningTables = ['business_services', 'bookings'];

    const missingCriticalTables = [];
    const missingWarningTables = [];

    // Check critical tables (required for basic functionality)
    for (const tableOption of criticalTables) {
      if (Array.isArray(tableOption)) {
        // This is an array of alternatives - we need at least one of them
        const hasAnyAlternative = tableOption.some(table => tableNames.includes(table));
        if (!hasAnyAlternative) {
          missingCriticalTables.push(tableOption.join('|'));
        }
      } else {
        // This is a single required table
        if (!tableNames.includes(tableOption)) {
          missingCriticalTables.push(tableOption);
        }
      }
    }

    // Check warning tables (not critical but may affect some features)
    for (const table of warningTables) {
      if (!tableNames.includes(table)) {
        missingWarningTables.push(table);
      }
    }

    // Log all missing tables
    if (missingCriticalTables.length > 0 || missingWarningTables.length > 0) {
      if (missingCriticalTables.length > 0) {
      }
      if (missingWarningTables.length > 0) {
      }
    }

    // Only return false if critical tables are missing
    if (missingCriticalTables.length > 0) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Get all cremation businesses for admin panel
export async function GET(request: NextRequest) {

  try {
    // Process the request

    // First verify the database connection is working
    const dbConnected = await testConnection();
    if (!dbConnected) {
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
        // Call our init-db endpoint
        const initResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/init-db`);

        if (!initResponse.ok) {
          return NextResponse.json({
            error: 'Database initialization failed',
            details: 'Could not auto-initialize the database. Please run database setup manually.',
            success: false
          }, { status: 500 });
        }

        const _initResult = await initResponse.json();
      } catch {
        return NextResponse.json({
          error: 'Database initialization failed',
          details: 'Failed to initialize database automatically. You may need to run the database setup manually.',
          success: false
        }, { status: 500 });
      }
    }

    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Since you've migrated FROM service_providers to service_providers,
    // we'll use only the service_providers table
    const _tableName = 'service_providers';

    // Define these variables at a higher scope so they're available throughout the function
    // Since we're using service_providers table, we know the column names
    let _hasProviderTypeColumn = true;
    let _hasBusinessTypeColumn = false;
    let _businessTypeColumn = 'provider_type';

    // SECURITY FIX: Use validated table name instead of template literal
    // First check if the businesses table exists and has the right structure
    try {
      const _tableCheck = await query('SELECT COUNT(*) as count FROM service_providers');
    } catch (tableError) {
      return NextResponse.json({
        error: 'Database schema issue',
        details: tableError instanceof Error ? tableError.message : 'Unknown error',
        success: false
      }, { status: 500 });
    }

    // Check if the table has the provider_type column
    try {
      // Check if the table has the provider_type column
      const tableStructure = await query(
        'SHOW COLUMNS FROM service_providers WHERE Field = ?',
        ['provider_type']
      );

      if (!Array.isArray(tableStructure) || tableStructure.length === 0) {
        return NextResponse.json({
          error: 'Database schema issue',
          details: 'The service_providers table is missing the provider_type column. Database schema may need to be updated.',
          success: false
        }, { status: 500 });
      }

    } catch (structureError) {
      return NextResponse.json({
        error: 'Database schema issue',
        details: 'Could not verify the service_providers table structure. ' +
                (structureError instanceof Error ? structureError.message : 'Unknown error'),
        success: false
      }, { status: 500 });
    }

    // Use a simplified query first to avoid complex joins that might cause issues
    let businesses;
    try {
      // Use a more defensive query that handles potential missing columns
      // SECURITY FIX: First check the table structure to determine available columns
      const bpColumns = await query('SHOW COLUMNS FROM service_providers');
      const columnNames = bpColumns.map((col: any) => col.Field);


      // Also check the users table structure
      const userColumns = await query('SHOW COLUMNS FROM users');
      const userColumnNames = userColumns.map((col: any) => col.Field);

      // Check if user_type column exists
      const hasUserType = userColumnNames.includes('user_type');
      const hasRole = userColumnNames.includes('role');

      // Build a dynamic query based on available columns
      let selectFields = [
        'sp.provider_id as id',
        'sp.name as business_name',
        'u.email'
      ];

      // Add owner name field based on available columns in users table
      if (userColumnNames.includes('full_name')) {
        selectFields.push('u.full_name as owner');
      } else if (userColumnNames.includes('first_name') && userColumnNames.includes('last_name')) {
        selectFields.push("CONCAT(u.first_name, ' ', u.last_name) as owner");
      } else {
        selectFields.push("'Unknown Owner' as owner");
      }

      // Add fields for service_providers table if they exist
      if (columnNames.includes('contact_first_name')) selectFields.push('sp.contact_first_name');
      if (columnNames.includes('contact_last_name')) selectFields.push('sp.contact_last_name');
      if (columnNames.includes('phone')) selectFields.push('sp.phone as business_phone');
      if (columnNames.includes('address')) selectFields.push('sp.address as business_address');
      if (columnNames.includes('province')) selectFields.push('sp.province');
      if (columnNames.includes('city')) selectFields.push('sp.city');
      if (columnNames.includes('hours')) selectFields.push('sp.hours as business_hours');
      if (columnNames.includes('service_description')) selectFields.push('sp.service_description');
      if (columnNames.includes('verification_status')) selectFields.push('sp.verification_status');
      if (columnNames.includes('application_status')) selectFields.push('sp.application_status');
      if (columnNames.includes('created_at')) selectFields.push('sp.created_at');
      if (columnNames.includes('updated_at')) selectFields.push('sp.updated_at');

      // Add profile picture from users table if it exists
      if (userColumnNames.includes('profile_picture')) selectFields.push('u.profile_picture');      // Check if business is verified based on application_status
      const verifiedCondition = columnNames.includes('application_status')
        ? `CASE WHEN sp.application_status = 'approved' THEN 1 ELSE 0 END`
        : '0';

      selectFields.push(`${verifiedCondition} as is_verified`);

      if (columnNames.includes('business_permit_path')) selectFields.push('sp.business_permit_path as document_path');

      // Show all business types (cremation, memorial, veterinary, etc.)
      // Admin should see all businesses regardless of provider_type
      const typeCondition = '1=1'; // Show all providers

      // Build user role condition based on available columns
      // IMPORTANT: Include NULL check for LEFT JOIN results
      let userRoleCondition = '1=1'; // Default if no role columns exist
      if (hasRole && hasUserType) {
        userRoleCondition = "(u.role = 'business' OR u.user_type = 'business' OR u.role IS NULL)";
      } else if (hasRole) {
        userRoleCondition = "(u.role = 'business' OR u.role IS NULL)";
      } else if (hasUserType) {
        userRoleCondition = "(u.user_type = 'business' OR u.user_type IS NULL)";
      }

      // SECURITY FIX: Build safe query with validated table names
      // Use LEFT JOIN instead of INNER JOIN to include businesses even if user data is missing
      const selectFieldsStr = selectFields.join(',\n          ');
      const safeQueryString = `
        SELECT
          ${selectFieldsStr}
        FROM service_providers sp
        LEFT JOIN users u ON sp.user_id = u.user_id
        WHERE ${typeCondition} AND ${userRoleCondition}
        ORDER BY sp.provider_id DESC
        LIMIT 100
      `;

      console.log('[Cremation Businesses] Executing main query:', safeQueryString);
      businesses = await query(safeQueryString);
      console.log(`[Cremation Businesses] Main query returned ${businesses?.length || 0} businesses`);
    } catch (error) {
      console.error('[Cremation Businesses] Main query failed:', error);

      // Try a more basic query if the first one fails
      try {

        const userColumns = await query('SHOW COLUMNS FROM users');
        const userColumnNames = userColumns.map((col: any) => col.Field);

        // Check if user_type and role columns exist
        const hasUserType = userColumnNames.includes('user_type');
        const hasRole = userColumnNames.includes('role');

        // Build a minimal owner field based on available columns in users table
        let ownerField = "'Unknown Owner' as owner";
        if (userColumnNames.includes('full_name')) {
          ownerField = 'u.full_name as owner';
        } else if (userColumnNames.includes('first_name') && userColumnNames.includes('last_name')) {
          ownerField = "CONCAT(u.first_name, ' ', u.last_name) as owner";
        }

        // Build user role condition based on available columns
        // IMPORTANT: Include NULL check for LEFT JOIN results
        let userRoleCondition = '1=1';
        if (hasRole && hasUserType) {
          userRoleCondition = "(u.role = 'business' OR u.user_type = 'business' OR u.role IS NULL)";
        } else if (hasRole) {
          userRoleCondition = "(u.role = 'business' OR u.role IS NULL)";
        } else if (hasUserType) {
          userRoleCondition = "(u.user_type = 'business' OR u.user_type IS NULL)";
        }

        // SECURITY FIX: Use a minimal query with validated table name
        // Use LEFT JOIN and broader WHERE condition to catch all business users
        const safeFallbackQuery = `
          SELECT
            sp.provider_id as id,
            sp.name as business_name,
            ${ownerField},
            u.email
          FROM service_providers sp
          LEFT JOIN users u ON sp.user_id = u.user_id
          WHERE (sp.provider_type = 'cremation' OR sp.provider_type IS NULL OR sp.provider_type = '')
            AND ${userRoleCondition}
          ORDER BY sp.provider_id DESC
          LIMIT 100
        `;

        console.log('[Cremation Businesses] Executing fallback query:', safeFallbackQuery);
        businesses = await query(safeFallbackQuery);
        console.log(`[Cremation Businesses] Fallback query returned ${businesses?.length || 0} businesses`);

      } catch (fallbackError) {
        console.error('[Cremation Businesses] Fallback query also failed:', fallbackError);

        // Return empty data instead of error
        return NextResponse.json({
          success: true,
          businesses: []
        });
      }
    }

    // Handle empty result
    if (!businesses || !Array.isArray(businesses)) {
      return NextResponse.json({
        success: true,
        businesses: []
      });
    }

    // Get appeals and restrictions for all businesses in one query for better performance
    let businessAppeals: { [key: string]: any[] } = {};
    let businessRestrictions: { [key: string]: any } = {};
    try {
      const businessIds = businesses.map(b => b.id).filter(id => id);
      console.log('Fetching appeals and restrictions for business IDs:', businessIds);

      if (businessIds.length > 0) {
        // Get user IDs for each business to fetch restrictions
        const userResult = await query(`
          SELECT provider_id, user_id 
          FROM service_providers 
          WHERE provider_id IN (${businessIds.map(() => '?').join(',')})
        `, businessIds) as any[];

        const userIdToBusinessId: { [key: number]: number } = {};
        userResult.forEach((row: any) => {
          userIdToBusinessId[row.user_id] = row.provider_id;
        });

        const userIds = userResult.map((row: any) => row.user_id);

        // Fetch restrictions for all users
        if (userIds.length > 0) {
          try {
            const restrictionsQuery = `
              SELECT 
                user_id,
                restriction_status,
                restrictions_data,
                updated_at
              FROM users 
              WHERE user_id IN (${userIds.map(() => '?').join(',')}) 
              AND restriction_status = 'restricted'
              AND restrictions_data IS NOT NULL
              ORDER BY updated_at DESC
            `;
            const restrictions = await query(restrictionsQuery, userIds) as any[];
            
            // Group restrictions by business ID
            restrictions.forEach(restriction => {
              const businessId = userIdToBusinessId[restriction.user_id];
              if (businessId && restriction.restrictions_data) {
                try {
                  const restrictionData = JSON.parse(restriction.restrictions_data);
                  businessRestrictions[businessId] = {
                    reason: restrictionData.reason || 'Restricted by admin',
                    restriction_date: restrictionData.restricted_at || restriction.updated_at
                  };
                } catch (parseError) {
                  console.error('Error parsing restriction data:', parseError);
                  // Fallback to default values
                  businessRestrictions[businessId] = {
                    reason: 'Restricted by admin',
                    restriction_date: restriction.updated_at
                  };
                }
              }
            });
          } catch (restrictionError) {
            console.error('Error fetching restrictions:', restrictionError);
            // Continue without restrictions data
          }
        }

        // Consolidated schema: appeals table may not exist; handle gracefully
        // Attempt to select from appeals if present, otherwise skip without error
        let appeals: any[] = [];
        try {
          const appealsQuery = `
            SELECT
              a.appeal_id,
              a.user_id,
              a.business_id,
              a.subject,
              a.message,
              a.status,
              a.submitted_at
            FROM appeals a
            WHERE a.business_id IN (${businessIds.map(() => '?').join(',')})
            ORDER BY a.submitted_at DESC
          `;
          appeals = await query(appealsQuery, businessIds) as any[];
        } catch {
          appeals = [];
        }

        // Group appeals by business ID
        appeals.forEach(appeal => {
          const businessId = appeal.business_id;
          if (businessId) {
            if (!businessAppeals[businessId]) {
              businessAppeals[businessId] = [];
            }
            businessAppeals[businessId].push(appeal);
          }
        });

        console.log('Grouped business appeals:', businessAppeals);
        console.log('Grouped business restrictions:', businessRestrictions);
      }
    } catch (error) {
      console.error('Error fetching business appeals and restrictions:', error);
      // Continue without appeals and restrictions data
    }

    // Format the results
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
        } catch {
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
        // Check for application_status first, then fall back to verification_status
        const isVerified =
          (business.application_status === 'approved' || business.application_status === 'verified') ||
          (business.verification_status === 'verified') ||
          business.is_verified === 1 ||
          business.is_verified === true;

        // Check for restricted status in either column
        const isRestricted =
          (business.application_status === 'restricted') ||
          (business.verification_status === 'restricted') ||
          (business.status === 'restricted');

        // Determine the final status value
        let statusValue = isRestricted ? 'restricted' : (isVerified ? 'active' : 'pending');

        // Check for declined/rejected status
        if (business.application_status === 'declined' || business.application_status === 'rejected') {
          statusValue = 'declined';
        } else if (business.application_status === 'documents_required') {
          statusValue = 'documents_required';
        } else if (business.application_status === 'reviewing') {
          statusValue = 'reviewing';
        }

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
          status: statusValue,
          verification_status: business.application_status || business.verification_status || 'pending',
          activeServices: 0, // We'll update these with a separate query if needed
          totalBookings: 0,
          revenue: '₱0.00',
          description: business.service_description || 'No description provided',
          verified: isVerified,
          businessHours: business.business_hours || 'Not specified',
          permitNumber: business.bp_permit_number || '',
          taxIdNumber: business.tax_id_number || '',
          documentPath: business.document_path || '',
          profile_picture: business.profile_picture || null,
          appeals: businessAppeals[business.id] || [],
          restriction: businessRestrictions[business.id] || null
        };
      } catch {
        // Return a simplified record if formatting fails
        return {
          id: business.id || 0,
          name: business.business_name || 'Unknown Business',
          owner: 'Error formatting data',
          email: business.email || '',
          address: 'Error formatting address',
          registrationDate: 'Unknown',
          status: 'pending',
          verification_status: business.application_status || business.verification_status || 'pending',
          activeServices: 0,
          totalBookings: 0,
          revenue: '₱0.00',
          description: 'Error formatting description',
          verified: false,
          profile_picture: business.profile_picture || null,
          appeals: businessAppeals[business.id] || [],
          restriction: businessRestrictions[business.id] || null
        };
      }
    });

    // Now try to add statistics data if it doesn't cause errors
    try {
      // Get statistics for each business using the correct database structure

      for (let i = 0; i < formattedBusinesses.length; i++) {
        const business = formattedBusinesses[i];

        // Skip if business ID is invalid
        if (!business.id) {
          continue;
        }

        try {
          // Get active services count using the correct database structure
          // Use service_packages table directly with provider_id
          const serviceResult = await query(`
            SELECT COUNT(*) as count
            FROM service_packages
            WHERE provider_id = ? AND is_active = 1
          `, [business.id]);

          if (serviceResult && serviceResult[0]) {
            business.activeServices = parseInt(serviceResult[0].count || '0');
          } else {
            business.activeServices = 0;
          }
        } catch {
          // Set default if query fails
          business.activeServices = 0;
        }

        try {
          // Get booking count and revenue using the correct database structure
          // Use bookings table directly with provider_id
          const bookingResult = await query(`
            SELECT
              COUNT(sb.id) as count,
              COALESCE(SUM(sb.total_price), 0) as revenue
            FROM bookings sb
            WHERE sb.provider_id = ?
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
            } catch {
              // Set defaults if parsing fails
              business.totalBookings = 0;
              business.revenue = '₱0.00';
            }
          } else {
            // Set defaults if no results
            business.totalBookings = 0;
            business.revenue = '₱0.00';
          }
        } catch {
          // Set defaults if query fails
          business.totalBookings = 0;
          business.revenue = '₱0.00';
        }
      }
    } catch {
      // We continue even if statistics fail, as we have the basic business data
    }

    return NextResponse.json({
      success: true,
      businesses: formattedBusinesses
    });
  } catch (error) {

    // Handle error
    if (error instanceof Error) {
      // Error occurred
    }

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

    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required', success: false }, { status: 403 });
    }

    // Get the business ID from the request body
    const body = await request.json();
    const businessId = body.businessId;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required', success: false }, { status: 400 });
    }

    // Since you've migrated FROM service_providers to service_providers,
    // we'll use only the service_providers table
    const _tableName = 'service_providers';

    // SECURITY FIX: Check the table structure to determine available columns
    const tableStructure = await query('SHOW COLUMNS FROM service_providers') as any[];

    const _columnNames = tableStructure.map(col => col.Field);

    // Since we're using service_providers table, we know the column names
    let _hasBusinessTypeColumn = false;
    let _hasProviderTypeColumn = true;

    // Use the appropriate column names for service_providers table
    const _typeColumn = 'provider_type';
    const _nameColumn = 'name';
    const _phoneColumn = 'phone';
    const _addressColumn = 'address';
    const _hoursColumn = 'hours';

    // Use the provider_type column for cremation type
    const _typeCondition = "sp.provider_type = 'cremation'";

    // SECURITY FIX: Get the business details with a safe query
    const businessResults = await query(`
      SELECT
        sp.provider_id as id,
        sp.name as business_name,
        u.email,
        sp.contact_first_name,
        sp.contact_last_name,
        sp.phone as business_phone,
        sp.address as business_address,
        sp.province,
        sp.city,
        sp.zip,
        sp.hours as business_hours,
        sp.description as service_description,
        CASE WHEN sp.application_status = 'approved' THEN 1 ELSE 0 END as is_verified,
        sp.business_permit_path,
        sp.bir_certificate_path,
        sp.government_id_path,
        '' as bp_permit_number,
        '' as tax_id_number,
        sp.created_at,
        sp.updated_at
      FROM service_providers bp
      JOIN users u ON sp.user_id = u.user_id
      WHERE sp.provider_id = ? AND sp.provider_type = 'cremation'
    `, [businessId]);

    if (!businessResults || businessResults.length === 0) {
      return NextResponse.json({ error: 'Business not found', success: false }, { status: 404 });
    }

    const business = businessResults[0];

    // Get business documents - collect all available documents
    let documents = [];
    
    // Add business permit if available
    if (business.business_permit_path) {
      documents.push({
        type: 'Business Permit',
        path: business.business_permit_path,
        url: business.business_permit_path,
        uploadDate: new Date(business.updated_at).toLocaleDateString('en-US')
      });
    }
    
    // Add BIR certificate if available
    if (business.bir_certificate_path) {
      documents.push({
        type: 'BIR Certificate',
        path: business.bir_certificate_path,
        url: business.bir_certificate_path,
        uploadDate: new Date(business.updated_at).toLocaleDateString('en-US')
      });
    }
    
    // Add government ID if available
    if (business.government_id_path) {
      documents.push({
        type: 'Government ID',
        path: business.government_id_path,
        url: business.government_id_path,
        uploadDate: new Date(business.updated_at).toLocaleDateString('en-US')
      });
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
      services: [] as any[],
      bookingStats: {
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalRevenue: '₱0.00'
      }
    };

    // Try to get services data using the correct database structure
    try {
      // Get services using service_packages table directly with provider_id
      const services = await query(`
        SELECT
          sp.package_id as id,
          sp.name as service_name,
          sp.description as service_description,
          sp.category,
          sp.cremation_type,
          sp.processing_time,
          sp.price,
          sp.delivery_fee_per_km,
          sp.conditions,
          sp.is_active
        FROM service_packages sp
        WHERE sp.provider_id = ?
      `, [businessId]);

      if (services) {
        formattedBusiness.services = services;
      }
    } catch {
      // We continue even if service fetch fails
      formattedBusiness.services = [];
    }

    try {
      // Get booking statistics using the correct database structure
      // Use bookings table directly with provider_id
      const bookingStats = await query(`
        SELECT
          COUNT(sb.id) as total_bookings,
          SUM(CASE WHEN sb.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN sb.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
          SUM(CASE WHEN sb.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          COALESCE(SUM(sb.total_price), 0) as total_revenue
        FROM bookings sb
        WHERE sb.provider_id = ?
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
    } catch {
      // We continue even if statistics fail, set defaults
      formattedBusiness.bookingStats = {
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalRevenue: '₱0.00'
      };
    }

    return NextResponse.json({
      success: true,
      business: formattedBusiness
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch business details',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
