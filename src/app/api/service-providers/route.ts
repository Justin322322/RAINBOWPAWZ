import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Fetching service providers from database');

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
        // Fetch from service_providers table (updated structure)
        console.log('Using service_providers table');
        providersResult = await query(`
          SELECT
            id,
            name,
            city,
            address,
            phone,
            service_description as description,
            provider_type as type,
            created_at
          FROM service_providers
          WHERE verification_status = 'verified'
          AND status = 'active'
          ORDER BY name ASC
        `) as any[];
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
          WHERE bp.verification_status = 'verified'
          AND bp.business_type = 'cremation'
          ORDER BY bp.business_name ASC
        `) as any[];
      }

      if (businessResult && businessResult.length > 0) {
        console.log(`Found ${businessResult.length} cremation businesses in business_profiles table`);

        // Format the business data to match the expected format
        const formattedBusinesses = businessResult.map(business => ({
          id: business.id,
          name: business.name,
          // Extract specific location from address for display in cards
          city: business.address ? business.address.split(',')[0] : (business.city || 'Bataan'),
          address: business.address,
          phone: business.phone,
          email: business.email,
          description: business.description || 'Pet cremation services',
          type: 'Pet Cremation Services',
          // Get actual package count instead of random number
          packages: 0, // Will be updated below
          distance: `${((business.id * 1.5) % 30).toFixed(1)} km away`, // Consistent distance based on ID
          // Add postal code to ensure proper geocoding
          address: business.address.includes('2100') ? business.address : business.address.replace('Philippines', '2100 Philippines'),
          created_at: business.created_at
        }));

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
