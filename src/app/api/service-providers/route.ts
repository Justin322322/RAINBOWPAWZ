import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';

export async function GET(request: Request) {
  // Extract user location from query parameters
  const { searchParams } = new URL(request.url);
  const userLocation = searchParams.get('location') || 'Balanga City, Bataan';

  // Get coordinates for the user's location
  const userCoordinates = getBataanCoordinates(userLocation);
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
        if (hasApplicationStatus) {
          whereClause = "(application_status = 'approved' OR application_status = 'verified')";
        }
        // Fallback to verification_status if application_status doesn't exist
        else if (hasVerificationStatus) {
          whereClause = "verification_status = 'verified'";
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
        providersResult = await query(`
          SELECT
            sp.provider_id as id,
            sp.name,
            sp.address,
            sp.phone,
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

        // Add detailed logging to see what's happening with the query
        if (providersResult.length > 0) {
          providersResult.forEach(provider => {
          });
        }
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
                WHERE provider_id = ? AND is_active = TRUE
              `, [provider.id]) as any[];
            } else if (useServiceProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id = ? AND is_active = TRUE
              `, [provider.id]) as any[];
            } else {
              packagesResult = [{ package_count: 0 }];
            }

            provider.packages = packagesResult[0]?.package_count || 0;

            // Calculate actual distance based on coordinates
            const providerCoordinates = getBataanCoordinates(provider.address || 'Bataan');
            const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
            provider.distance = `${distanceValue} km away`;
            provider.distanceValue = distanceValue; // Store numeric value for sorting
          } catch (error) {
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

        businessResult = await query(`
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
        `) as any[];
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
                WHERE service_provider_id = ? AND is_active = TRUE
              `, [business.id]) as any[];
            } else if (useProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id = ? AND is_active = TRUE
              `, [business.id]) as any[];
            } else if (useBusinessIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE business_id = ? AND is_active = TRUE
              `, [business.id]) as any[];
            } else {
              packagesResult = [{ package_count: 0 }];
            }

            business.packages = packagesResult[0]?.package_count || 0;

            // Calculate actual distance based on coordinates
            const businessCoordinates = getBataanCoordinates(business.address || 'Bataan');
            const distanceValue = calculateDistance(userCoordinates, businessCoordinates);
            (business as any).distance = `${distanceValue} km away`;
            (business as any).distanceValue = distanceValue; // Store numeric value for sorting
          } catch (error) {
          }
        }

        return NextResponse.json({ providers: formattedBusinesses });
      }

      // If no providers found in either table, create test providers

      // No test providers - all data comes from database
      return NextResponse.json({ providers: [] });
    } catch (dbError) {
      return NextResponse.json({ providers: [], error: 'Database error' });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    );
  }
}
