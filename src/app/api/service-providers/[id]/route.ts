import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Extract user location from query parameters
    const { searchParams } = new URL(request.url);
    const userLocation = searchParams.get('location') || 'Balanga City, Bataan';

    // Get coordinates for the user's location
    const userCoordinates = getBataanCoordinates(userLocation);

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }


    // Check if this is a test provider first to avoid database errors
    if (id === '1001' || id === '1002' || id === '1003') {

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
          created_at: new Date().toISOString()
        }
      };

      // Calculate actual distance for the requested provider
      const provider = testProviders[id as keyof typeof testProviders];
      if (provider) {
        const providerCoordinates = getBataanCoordinates(provider.address || provider.city || 'Bataan');
        const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
        const enhancedProvider = {
          ...provider,
          distance: `${distanceValue} km away`,
          distanceValue: distanceValue
        };
        return NextResponse.json({ provider: enhancedProvider });
      }
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


      // Get provider details
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
      `, [id]) as any[];

      // Get average rating for this provider
      let avgRating = 0;
      try {
        const ratingResult = await query(`
          SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
          FROM reviews
          WHERE service_provider_id = ?
        `, [id]) as any[];

        if (ratingResult && ratingResult.length > 0) {
          avgRating = parseFloat(ratingResult[0]?.avg_rating || "0");
        }
      } catch (ratingError) {
        console.error('Error fetching provider rating:', ratingError);
        // Continue without rating data
      }

      if (providerResult && providerResult.length > 0) {
        const provider = providerResult[0];

        // Add rating to provider object
        provider.rating = avgRating;

        // Calculate actual distance based on coordinates
        const providerCoordinates = getBataanCoordinates(provider.address || provider.city || 'Bataan');
        const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
        provider.distance = `${distanceValue} km away`;
        provider.distanceValue = distanceValue;

        // Get package count
        try {
          const packagesCount = await query(`
            SELECT COUNT(*) as count
            FROM service_packages
            WHERE service_provider_id = ? AND is_active = TRUE
          `, [provider.id]) as any[];

          provider.packages = packagesCount[0]?.count || 0;
        } catch (err) {
          provider.packages = 0;
        }

        return NextResponse.json({ provider });
      }

      // If not found in service_providers, try business_profiles

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
        `, [id]) as any[];

        if (businessResult && businessResult.length > 0) {
          const business = businessResult[0];

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
            distance: '0.0 km away', // Will be updated below with actual distance
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

            // Calculate actual distance based on coordinates
            const businessCoordinates = getBataanCoordinates(formattedBusiness.address || formattedBusiness.city || 'Bataan');
            const distanceValue = calculateDistance(userCoordinates, businessCoordinates);
            (formattedBusiness as any).distance = `${distanceValue} km away`;
            (formattedBusiness as any).distanceValue = distanceValue;
          } catch (err) {
          }

          return NextResponse.json({ provider: formattedBusiness });
        }
      } catch (businessError) {
        // Continue to check for test providers
      }

      // If provider not found in either table

      return NextResponse.json(
        { error: 'Provider not found. The requested service provider may have been removed or is no longer available.' },
        { status: 404 }
      );
    } catch (dbError) {

      // Check if DB error is due to specific connection issues
      if (dbError instanceof Error) {
        const errorCode = 'code' in dbError ? (dbError as any).code : '';

        if (errorCode === 'ECONNREFUSED') {
          return NextResponse.json(
            { error: 'Database connection error', details: 'Could not connect to the database server' },
            { status: 503 }
          );
        }

        if (errorCode === 'ER_ACCESS_DENIED_ERROR') {
          return NextResponse.json(
            { error: 'Database authentication error', details: 'Invalid database credentials' },
            { status: 500 }
          );
        }

        if (errorCode === 'ER_BAD_DB_ERROR') {
          return NextResponse.json(
            { error: 'Database not found', details: 'The specified database does not exist' },
            { status: 500 }
          );
        }
      }

      // If this is a numeric provider ID that matches a test provider, return test data
      if (!isNaN(Number(id)) &&
          ['1001', '1002', '1003'].includes(id)) {

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
            created_at: new Date().toISOString()
          }
        };

        // Calculate actual distance for the requested provider
        const provider = testProviders[id as keyof typeof testProviders];
        let enhancedProvider = { ...provider };
        
        if (provider) {
          const providerCoordinates = getBataanCoordinates(provider.address || provider.city || 'Bataan');
          const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
          enhancedProvider = {
            ...provider,
            distance: `${distanceValue} km away`,
            distanceValue: distanceValue
          } as any;
        }
        return NextResponse.json({ provider: enhancedProvider });
      }

      return NextResponse.json(
        {
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          providerId: id
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}
