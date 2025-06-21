import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';
import { calculateEnhancedDistance } from '@/utils/routeDistance';

export async function GET(request: Request) {
  // Extract user location from query parameters
  const { searchParams } = new URL(request.url);
  const userLocation = searchParams.get('location');
  const userLat = searchParams.get('lat');
  const userLng = searchParams.get('lng');

  // Validate that we have location information
  if (!userLocation && (!userLat || !userLng)) {
    return NextResponse.json({
      success: false,
      error: 'User location is required',
      providers: []
    });
  }

  // Get coordinates for the user's location
  let userCoordinates;

  // Priority 1: Use provided coordinates if available
  if (userLat && userLng) {
    const lat = parseFloat(userLat);
    const lng = parseFloat(userLng);

    if (!isNaN(lat) && !isNaN(lng)) {
      userCoordinates = { lat, lng };
      console.log('🎯 [API] Using provided coordinates:', userCoordinates);
    } else {
      console.warn('⚠️ [API] Invalid coordinates provided, falling back to geocoding');
      userCoordinates = getBataanCoordinates(userLocation || '');
    }
  } else if (userLocation) {
    // Priority 2: Fallback to address-based lookup
    console.log('📍 [API] No coordinates provided, using address lookup for:', userLocation);
    userCoordinates = getBataanCoordinates(userLocation);
  } else {
    // No location information available
    return NextResponse.json({
      success: false,
      error: 'Unable to determine user location',
      providers: []
    });
  }
  try {

    try {
      // Check which table exists: business_profiles or service_providers
      const tableCheckResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name IN ('business_profiles', 'service_providers')
      `) as any[];

      // Determine which table to use
      const tableNames = tableCheckResult.map(row => row.table_name);

      const useServiceProvidersTable = tableNames.includes('service_providers');
      const useBusinessProfilesTable = tableNames.includes('business_profiles');

      if (!useServiceProvidersTable && !useBusinessProfilesTable) {
        throw new Error('Database schema error: Required tables do not exist');
      }

      let providersResult;

      if (useServiceProvidersTable) {
        // Debug: Check if we have any providers at all
        const totalProvidersCount = await query(`
          SELECT COUNT(*) as count FROM service_providers WHERE provider_type = 'cremation'
        `) as any[];
        
        console.log('🔍 [Service Providers API] Total cremation providers in database:', totalProvidersCount[0]?.count || 0);
        
        // First check which status columns exist in the service_providers table
        const columnsResult = await query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'service_providers'
        `) as any[];

        const columnNames = columnsResult.map(col => col.COLUMN_NAME);
        const hasApplicationStatus = columnNames.includes('application_status');
        const hasVerificationStatus = columnNames.includes('verification_status');
        const hasStatus = columnNames.includes('status');

        // Build a WHERE clause based on available columns
        let whereClause = '';

        // Primary condition: application_status = 'approved' (new schema)
        // Make more lenient for development - allow pending and approved
        if (hasApplicationStatus) {
          whereClause = "(application_status = 'approved' OR application_status = 'verified' OR application_status = 'pending')";
        }
        // Fallback to verification_status if application_status doesn't exist
        else if (hasVerificationStatus) {
          whereClause = "(verification_status = 'verified' OR verification_status = 'pending')";
        }
        // If neither exists, use a default condition that always passes
        else {
          whereClause = "1=1";
        }

        // Add provider_type filter if column exists
        if (columnNames.includes('provider_type')) {
          whereClause += " AND provider_type = 'cremation'";
        }

        // Add active status filter if the column exists
        if (hasStatus) {
          whereClause += " AND status = 'active'";
        }

        // Fetch from service_providers table with dynamic WHERE clause, including user profile picture
        // Use COALESCE to fallback to user address if provider address is null
        // Create business name logic: use sp.name if it's clearly a business name, otherwise create one
        providersResult = await query(`
          SELECT
            sp.provider_id as id,
            CASE 
              WHEN sp.name LIKE '%Cremation%' OR sp.name LIKE '%Memorial%' OR sp.name LIKE '%Pet%' OR sp.name LIKE '%Service%' OR sp.name LIKE '%Center%' OR sp.name LIKE '%Care%' THEN sp.name
              ELSE CONCAT(COALESCE(NULLIF(TRIM(sp.name), ''), CONCAT(u.first_name, ' ', u.last_name)), ' Pet Cremation Services')
            END as name,
            COALESCE(sp.address, u.address) as address,
            COALESCE(sp.phone, u.phone) as phone,
            sp.description,
            sp.provider_type as type,
            sp.created_at,
            u.profile_picture,
            ${hasApplicationStatus ? 'sp.application_status' : hasVerificationStatus ? 'sp.verification_status' : "'approved' as application_status"}
          FROM service_providers sp
          LEFT JOIN users u ON sp.user_id = u.user_id
          WHERE ${whereClause}
          ORDER BY sp.name ASC
        `) as any[];

        // Log successful query results
        console.log('✅ [Service Providers API] Successfully fetched', providersResult.length, 'cremation providers');
      } else {
        // Use business_profiles table
        providersResult = [];
      }

      if (providersResult && providersResult.length > 0) {

        // Get the number of packages for each provider
        for (const provider of providersResult) {
          try {
            // Check if service_packages table has service_provider_id or provider_id column
            const packageColumnsResult = await query(`
              SHOW COLUMNS FROM service_packages
              WHERE Field IN ('service_provider_id', 'provider_id')
            `) as any[];

            const packageColumns = packageColumnsResult.map(col => col.Field);
            const useServiceProviderIdColumn = packageColumns.includes('service_provider_id');
            const useProviderIdColumn = packageColumns.includes('provider_id');

            let packagesResult;
            if (useProviderIdColumn) {
              // Use provider_id which matches our database schema
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id = ? AND is_active = 1
              `, [provider.id]) as any[];

            } else if (useServiceProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id = ? AND is_active = 1
              `, [provider.id]) as any[];

            } else {
              packagesResult = [{ package_count: 0 }];

            }

            provider.packages = packagesResult[0]?.package_count || 0;

            // Calculate actual distance based on coordinates
            const providerCoordinates = getBataanCoordinates(provider.address || 'Bataan');

            try {
              // Use enhanced distance calculation with real routing
              const distanceResult = await calculateEnhancedDistance(userCoordinates, providerCoordinates);
              provider.distance = distanceResult.formattedDistance;
              provider.distanceValue = distanceResult.distance; // Store numeric value for sorting

              console.log('📍 [Distance] Real routing calculation for', provider.name, ':', {
                distance: distanceResult.distance,
                formatted: distanceResult.formattedDistance,
                source: distanceResult.source,
                userCoords: userCoordinates,
                providerCoords: providerCoordinates
              });
            } catch (error) {
              console.error('📍 [Distance] Real routing calculation failed, using fallback:', error);
              // Fallback to simple calculation
              const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
              provider.distance = `${distanceValue} km away`;
              provider.distanceValue = distanceValue;
            }
          } catch {
            provider.packages = 0;
            provider.distance = 'Distance unavailable';
          }
        }

        return NextResponse.json({ providers: providersResult });
      }

      // If no results from service_providers, try to fetch from business_profiles as fallback

      // Only try business_profiles if it exists
      let businessResult = [];
      if (useBusinessProfilesTable) {
        // Check which columns exist in business_profiles
        const bpColumnsResult = await query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'business_profiles'
        `) as any[];

        const bpColumns = bpColumnsResult.map(col => col.COLUMN_NAME);
        const hasAppStatus = bpColumns.includes('application_status');
        const hasVerStatus = bpColumns.includes('verification_status');

        // Build WHERE clause based on available columns
        let bpWhereClause = '';
        if (hasAppStatus) {
          bpWhereClause = "(bp.application_status = 'approved' OR bp.application_status = 'verified')";
        } else if (hasVerStatus) {
          bpWhereClause = "bp.verification_status = 'verified'";
        } else {
          bpWhereClause = "1=1";
        }

        // SECURITY FIX: Build safe query with validated where clause
        const safeQuery = `
          SELECT
            bp.id,
            bp.business_name as name,
            bp.business_address as address,
            bp.business_phone as phone,
            u.email,
            bp.service_description as description,
            bp.business_type,
            bp.created_at
          FROM business_profiles bp
          JOIN users u ON bp.user_id = u.id
          WHERE ${bpWhereClause}
          AND bp.business_type = 'cremation'
          ORDER BY bp.business_name ASC
        `;
        businessResult = await query(safeQuery) as any[];
      }

      if (businessResult && businessResult.length > 0) {

        // Format the business data to match the expected format
        const formattedBusinesses = businessResult.map(business => {
          // Process the address to include postal code if needed
          const formattedAddress = business.address ?
            (business.address.includes('2100') ? business.address : business.address.replace('Philippines', '2100 Philippines')) :
            '';

          return {
            id: business.id,
            name: business.name,
            address: formattedAddress,
            phone: business.phone,
            email: business.email,
            description: business.description || 'Pet cremation services',
            type: 'Pet Cremation Services',
            // Get actual package count instead of random number
            packages: 0, // Will be updated below
            distance: '0.0 km away', // Will be updated below with actual distance
            created_at: business.created_at
          };
        });

        // Get actual package counts for each business
        for (const business of formattedBusinesses) {
          try {
            // Check if service_packages table has service_provider_id or provider_id column
            const packageColumnsResult = await query(`
              SHOW COLUMNS FROM service_packages
              WHERE Field IN ('service_provider_id', 'provider_id', 'business_id')
            `) as any[];

            const packageColumns = packageColumnsResult.map(col => col.Field);
            const useServiceProviderIdColumn = packageColumns.includes('service_provider_id');
            const useProviderIdColumn = packageColumns.includes('provider_id');
            const useBusinessIdColumn = packageColumns.includes('business_id');

            let packagesResult;
            if (useServiceProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id = ? AND is_active = 1
              `, [business.id]) as any[];
            } else if (useProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id = ? AND is_active = 1
              `, [business.id]) as any[];
            } else if (useBusinessIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE business_id = ? AND is_active = 1
              `, [business.id]) as any[];
            } else {
              packagesResult = [{ package_count: 0 }];
            }

            business.packages = packagesResult[0]?.package_count || 0;

            // Calculate actual distance based on coordinates using real routing
            const businessCoordinates = getBataanCoordinates(business.address || 'Bataan');

            try {
              // Use enhanced distance calculation with real routing
              const distanceResult = await calculateEnhancedDistance(userCoordinates, businessCoordinates);
              (business as any).distance = distanceResult.formattedDistance;
              (business as any).distanceValue = distanceResult.distance; // Store numeric value for sorting

              console.log('📍 [Distance] Real routing calculation for business', business.name, ':', {
                distance: distanceResult.distance,
                formatted: distanceResult.formattedDistance,
                source: distanceResult.source
              });
            } catch (error) {
              console.error('📍 [Distance] Real routing calculation failed for business, using fallback:', error);
              // Fallback to simple calculation
              const distanceValue = calculateDistance(userCoordinates, businessCoordinates);
              (business as any).distance = `${distanceValue} km away`;
              (business as any).distanceValue = distanceValue;
            }
          } catch {
          }
        }

        return NextResponse.json({ providers: formattedBusinesses });
      }

      // If no providers found in either table, log and return empty
      console.log('⚠️ [Service Providers API] No providers found in database - this could mean:');
      console.log('  1. No cremation services are registered');
      console.log('  2. All services have restrictive application_status');
      console.log('  3. Database connection issues');
      
      return NextResponse.json({ providers: [] });
    } catch {
      return NextResponse.json({ providers: [], error: 'Database error' });
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    );
  }
}
