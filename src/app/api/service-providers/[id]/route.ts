import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = params.id;

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching details for service provider ID: ${providerId} - Enhanced version with improved error handling`);

    // Check if this is a test provider first to avoid database errors
    if (providerId === '1001' || providerId === '1002' || providerId === '1003') {
      console.log(`Returning test provider data for ID ${providerId}`);
      
      // Return the test provider data
      const testProviders = {
        '1001': {
          id: 1001,
          name: "Rainbow Bridge Pet Cremation",
          city: "Balanga City, Bataan",
          address: "Capitol Drive, Balanga City, Bataan, 2100 Philippines",
          phone: "(123) 456-7890",
          email: "info@rainbowbridge.com",
          description: "Compassionate pet cremation services with personalized memorials. We offer a range of options to help you honor your beloved pet's memory, including private and communal cremation services, custom urns, memorial jewelry, and paw print keepsakes.",
          type: "Pet Cremation Services",
          packages: 3,
          distance: "5.5 km away",
          distanceValue: 5.5,
          created_at: new Date().toISOString()
        },
        '1002': {
          id: 1002,
          name: "Peaceful Paws Memorial",
          city: "Orani, Bataan",
          address: "National Road, Orani, Bataan, 2112 Philippines",
          phone: "(234) 567-8901",
          email: "care@peacefulpaws.com",
          description: "Dignified pet cremation with eco-friendly options. Our services include gentle handling of your pet, environmentally conscious cremation processes, biodegradable urns, and memorial tree planting options to create a living tribute to your pet.",
          type: "Pet Cremation Services",
          packages: 2,
          distance: "12.3 km away",
          distanceValue: 12.3,
          created_at: new Date().toISOString()
        },
        '1003': {
          id: 1003,
          name: "Forever Friends Pet Services",
          city: "Dinalupihan, Bataan",
          address: "San Ramon Highway, Dinalupihan, Bataan, 2110 Philippines",
          phone: "(345) 678-9012",
          email: "service@foreverfriends.com",
          description: "Comprehensive pet memorial services with home pickup options. We understand that saying goodbye is difficult, so we offer compassionate home collection services, private viewing rooms for final goodbyes, and a range of memorial products to honor your pet's memory.",
          type: "Pet Cremation Services",
          packages: 4,
          distance: "18.7 km away",
          distanceValue: 18.7,
          created_at: new Date().toISOString()
        }
      };

      // Type-safe access to test provider data
      const provider = testProviders[providerId as keyof typeof testProviders];
      return NextResponse.json({ provider });
    }

    // Try to fetch from service_providers table
    try {
      // First check which columns exist
      const spColumnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'service_providers'
      `) as any[];
      
      const spColumnNames = spColumnsResult.map(col => col.COLUMN_NAME);
      const hasSPAppStatus = spColumnNames.includes('application_status');
      const hasSPVerStatus = spColumnNames.includes('verification_status');
      const hasStatus = spColumnNames.includes('status');
      
      // Build WHERE clause based on available columns
      let whereClause = 'id = ?';
      
      // Add status condition
      if (hasSPAppStatus) {
        whereClause += " AND (application_status = 'approved' OR application_status = 'verified')";
      } else if (hasSPVerStatus) {
        whereClause += " AND verification_status = 'verified'";
      }
      
      // Add active status condition if available
      if (hasStatus) {
        whereClause += " AND status = 'active'";
      }
      
      console.log(`Service providers query WHERE clause: ${whereClause}`);
      
      const providerResult = await query(`
        SELECT
          id,
          name,
          city,
          address,
          phone,
          service_description as description,
          provider_type as type,
          created_at,
          ${hasSPAppStatus ? 'application_status' : hasSPVerStatus ? 'verification_status' : "'unknown' as status"}
        FROM service_providers
        WHERE ${whereClause}
        LIMIT 1
      `, [providerId]) as any[];

      if (providerResult && providerResult.length > 0) {
        const provider = providerResult[0];
        console.log(`Found provider in service_providers: ${provider.name} with status: ${hasSPAppStatus ? provider.application_status : hasSPVerStatus ? provider.verification_status : 'unknown'}`);

        // Calculate approximate distance (mock data for now, but with consistent values)
        const distanceValue = ((Number(provider.id) * 1.5) % 30).toFixed(1);
        provider.distance = `${distanceValue} km away`;
        
        // Get package count
        try {
          const packagesCount = await query(`
            SELECT COUNT(*) as count
            FROM service_packages
            WHERE service_provider_id = ? AND is_active = TRUE
          `, [provider.id]) as any[];
          
          provider.packages = packagesCount[0]?.count || 0;
        } catch (err) {
          console.error(`Error getting package count: ${err}`);
          provider.packages = 0;
        }

        return NextResponse.json({ provider });
      }

      // If not found in service_providers, try business_profiles
      console.log(`Provider not found in service_providers, checking business_profiles`);
      
      // Check which columns business_profiles has
      const bpColumnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'business_profiles'
      `) as any[];
      
      const bpColumnNames = bpColumnsResult.map(col => col.COLUMN_NAME);
      const hasBPAppStatus = bpColumnNames.includes('application_status');
      const hasBPVerStatus = bpColumnNames.includes('verification_status');
      
      // Build WHERE clause based on available columns
      let bpWhereClause = 'bp.id = ?';
      
      if (hasBPAppStatus) {
        bpWhereClause += " AND (bp.application_status = 'approved' OR bp.application_status = 'verified')";
      } else if (hasBPVerStatus) {
        bpWhereClause += " AND bp.verification_status = 'verified'";
      }
      
      console.log(`Business profiles query WHERE clause: ${bpWhereClause}`);
      
      try {
        const businessResult = await query(`
          SELECT
            bp.id,
            bp.business_name as name,
            bp.city,
            bp.business_address as address,
            bp.business_phone as phone,
            u.email,
            bp.service_description as description,
            bp.business_type,
            bp.created_at,
            ${hasBPAppStatus ? 'bp.application_status' : hasBPVerStatus ? 'bp.verification_status' : "'unknown'"} as status
          FROM business_profiles bp
          JOIN users u ON bp.user_id = u.id
          WHERE ${bpWhereClause}
          LIMIT 1
        `, [providerId]) as any[];

        if (businessResult && businessResult.length > 0) {
          const business = businessResult[0];
          console.log(`Found business in business_profiles: ${business.name}`);

          // Process the address to include postal code if needed
          const formattedAddress = business.address ? 
            (business.address.includes('2100') ? business.address : business.address.replace('Philippines', '2100 Philippines')) : 
            '';
            
          const formattedBusiness = {
            id: business.id,
            name: business.name,
            city: formattedAddress ? formattedAddress.split(',')[0] : (business.city || 'Bataan'),
            address: formattedAddress,
            phone: business.phone,
            email: business.email,
            description: business.description || 'Pet cremation services',
            type: 'Pet Cremation Services',
            distance: `${((Number(business.id) * 1.5) % 30).toFixed(1)} km away`, // Consistent distance based on ID
            created_at: business.created_at,
            packages: 0 // Default value, will be updated if possible
          };
          
          // Get package count if possible
          try {
            const packagesCount = await query(`
              SELECT COUNT(*) as count
              FROM service_packages
              WHERE business_id = ? AND is_active = TRUE
            `, [business.id]) as any[];
            
            formattedBusiness.packages = packagesCount[0]?.count || 0;
          } catch (err) {
            console.error(`Error getting package count for business: ${err}`);
          }

          return NextResponse.json({ provider: formattedBusiness });
        }
      } catch (businessError) {
        console.error('Error looking up business profile:', businessError);
        // Continue to check for test providers
      }

      // If provider not found in either table
      console.error(`Provider with ID ${providerId} not found in any table and is not a test provider`);

      return NextResponse.json(
        { error: 'Provider not found. The requested service provider may have been removed or is no longer available.' },
        { status: 404 }
      );
    } catch (dbError) {
      console.error('Database error fetching provider:', dbError);
      
      // Check if DB error is due to specific connection issues
      if (dbError instanceof Error) {
        const errorCode = 'code' in dbError ? (dbError as any).code : '';
        
        if (errorCode === 'ECONNREFUSED') {
          console.error('Database connection refused. Check if MySQL is running.');
          return NextResponse.json(
            { error: 'Database connection error', details: 'Could not connect to the database server' },
            { status: 503 }
          );
        }
        
        if (errorCode === 'ER_ACCESS_DENIED_ERROR') {
          console.error('Database access denied. Check credentials.');
          return NextResponse.json(
            { error: 'Database authentication error', details: 'Invalid database credentials' },
            { status: 500 }
          );
        }
        
        if (errorCode === 'ER_BAD_DB_ERROR') {
          console.error('Database does not exist. Check DB name.');
          return NextResponse.json(
            { error: 'Database not found', details: 'The specified database does not exist' },
            { status: 500 }
          );
        }
      }
      
      // If this is a numeric provider ID that matches a test provider, return test data
      if (!isNaN(Number(providerId)) && 
          ['1001', '1002', '1003'].includes(providerId)) {
        console.log(`Database error but providing test data for provider ${providerId}`);
        
        // Return test provider data (same as in test providers section)
        const testProviders = {
          '1001': {
            id: 1001,
            name: "Rainbow Bridge Pet Cremation (Test)",
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
          '1002': {
            id: 1002,
            name: "Peaceful Paws Memorial (Test)",
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
          '1003': {
            id: 1003,
            name: "Forever Friends Pet Services (Test)",
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
        };
        
        // Type-safe access to test provider data
        const provider = testProviders[providerId as keyof typeof testProviders];
        return NextResponse.json({ provider });
      }
      
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          providerId
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}
