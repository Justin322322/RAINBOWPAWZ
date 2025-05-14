import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Fetching service providers from database - Enhanced version with application_status support');

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
      console.log('Available tables:', tableNames);

      const useServiceProvidersTable = tableNames.includes('service_providers');
      const useBusinessProfilesTable = tableNames.includes('business_profiles');

      if (!useServiceProvidersTable && !useBusinessProfilesTable) {
        console.error('Neither business_profiles nor service_providers table exists in the database');
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
        
        console.log('Service providers table columns:', {
          hasApplicationStatus,
          hasVerificationStatus,
          hasStatus
        });
        
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
        
        // Fetch from service_providers table with dynamic WHERE clause
        console.log('Using service_providers table with WHERE clause:', whereClause);
        providersResult = await query(`
          SELECT
            id,
            name,
            city,
            address,
            phone,
            service_description as description,
            provider_type as type,
            created_at,
            ${hasApplicationStatus ? 'application_status' : hasVerificationStatus ? 'verification_status' : "'approved' as application_status"}
          FROM service_providers
          WHERE ${whereClause}
          ORDER BY name ASC
        `) as any[];
        
        // Add detailed logging to see what's happening with the query
        console.log(`Found ${providersResult.length} providers matching the criteria:`);
        if (providersResult.length > 0) {
          providersResult.forEach(provider => {
            console.log(`- [ID: ${provider.id}] ${provider.name} (${hasApplicationStatus ? provider.application_status : hasVerificationStatus ? provider.verification_status : 'unknown status'})`);
          });
        }
      } else {
        // Use business_profiles table
        console.log('Using business_profiles table');
        providersResult = [];
      }

      if (providersResult && providersResult.length > 0) {
        console.log(`Found ${providersResult.length} service providers in service_providers table`);

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
            if (useServiceProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id = ? AND is_active = TRUE
              `, [provider.id]) as any[];
            } else if (useProviderIdColumn) {
              packagesResult = await query(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id = ? AND is_active = TRUE
              `, [provider.id]) as any[];
            } else {
              console.error('service_packages table missing required columns');
              packagesResult = [{ package_count: 0 }];
            }

            provider.packages = packagesResult[0]?.package_count || 0;

            // Calculate approximate distance (mock data for now, but with consistent values)
            // Using provider ID to generate consistent distances for sorting
            const distanceValue = ((provider.id * 1.5) % 30).toFixed(1);
            provider.distance = `${distanceValue} km away`;
            provider.distanceValue = parseFloat(distanceValue); // Store numeric value for sorting
          } catch (error) {
            console.error(`Error fetching packages for provider ${provider.id}:`, error);
            provider.packages = 0;
            provider.distance = 'Distance unavailable';
          }
        }

        return NextResponse.json({ providers: providersResult });
      }

      // If no results from service_providers, try to fetch from business_profiles as fallback
      console.log('No results from previous query, trying business_profiles');

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
            bp.city,
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
        console.log(`Found ${businessResult.length} cremation businesses in business_profiles table`);

        // Format the business data to match the expected format
        const formattedBusinesses = businessResult.map(business => {
          // Process the address to include postal code if needed
          const formattedAddress = business.address ? 
            (business.address.includes('2100') ? business.address : business.address.replace('Philippines', '2100 Philippines')) :
            '';
            
          return {
            id: business.id,
            name: business.name,
            // Extract specific location from address for display in cards
            city: formattedAddress ? formattedAddress.split(',')[0] : (business.city || 'Bataan'),
            address: formattedAddress,
            phone: business.phone,
            email: business.email,
            description: business.description || 'Pet cremation services',
            type: 'Pet Cremation Services',
            // Get actual package count instead of random number
            packages: 0, // Will be updated below
            distance: `${((business.id * 1.5) % 30).toFixed(1)} km away`, // Consistent distance based on ID
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
              console.error('service_packages table missing required columns');
              packagesResult = [{ package_count: 0 }];
            }

            business.packages = packagesResult[0]?.package_count || 0;
          } catch (error) {
            console.error(`Error fetching packages for business ${business.id}:`, error);
          }
        }

        return NextResponse.json({ providers: formattedBusinesses });
      }

      // If no providers found in either table, create test providers
      console.log('No providers found in any table, creating test providers');

      // Create test providers in Bataan area
      const testProviders = [
        {
          id: 1001,
          name: "Rainbow Bridge Pet Cremation",
          city: "Balanga City, Bataan",
          address: "Capitol Drive, Balanga City, Bataan, 2100 Philippines",
          phone: "(123) 456-7890",
          email: "info@rainbowbridge.com",
          description: "Compassionate pet cremation services with personalized memorials.",
          type: "Pet Cremation Services",
          packages: 3,
          distance: "5.5 km away",
          distanceValue: 5.5,
          created_at: new Date().toISOString()
        },
        {
          id: 1002,
          name: "Peaceful Paws Memorial",
          city: "Orani, Bataan",
          address: "National Road, Orani, Bataan, 2112 Philippines",
          phone: "(234) 567-8901",
          email: "care@peacefulpaws.com",
          description: "Dignified pet cremation with eco-friendly options.",
          type: "Pet Cremation Services",
          packages: 2,
          distance: "12.3 km away",
          distanceValue: 12.3,
          created_at: new Date().toISOString()
        },
        {
          id: 1003,
          name: "Forever Friends Pet Services",
          city: "Dinalupihan, Bataan",
          address: "San Ramon Highway, Dinalupihan, Bataan, 2110 Philippines",
          phone: "(345) 678-9012",
          email: "service@foreverfriends.com",
          description: "Comprehensive pet memorial services with home pickup options.",
          type: "Pet Cremation Services",
          packages: 4,
          distance: "18.7 km away",
          distanceValue: 18.7,
          created_at: new Date().toISOString()
        }
      ];

      return NextResponse.json({ providers: testProviders });
    } catch (dbError) {
      console.error('Database error fetching service providers:', dbError);
      return NextResponse.json({ providers: [], error: 'Database error' });
    }
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    );
  }
}
