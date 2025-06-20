import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';
import { calculateEnhancedDistance } from '@/utils/routeDistance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Extract user location from query parameters
    const { searchParams } = new URL(request.url);
    const userLocation = searchParams.get('location') || 'Balanga City, Bataan';
    const userLat = searchParams.get('lat');
    const userLng = searchParams.get('lng');

    // Get coordinates for the user's location
    let userCoordinates;

    // Priority 1: Use provided coordinates if available
    if (userLat && userLng) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);

      if (!isNaN(lat) && !isNaN(lng)) {
        userCoordinates = { lat, lng };
      } else {
        userCoordinates = getBataanCoordinates(userLocation);
      }
    } else {
      // Priority 2: Fallback to address-based lookup
      userCoordinates = getBataanCoordinates(userLocation);
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }


    // All provider data comes from database

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
      let whereClause = 'provider_id = ?';

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


      // Get provider details including user profile picture
      const providerResult = await query(`
        SELECT
          sp.provider_id as id,
          sp.name,
          sp.city,
          sp.address,
          sp.phone,
          sp.description,
          sp.provider_type as type,
          sp.created_at,
          u.profile_picture,
          ${hasSPAppStatus ? 'sp.application_status' : hasSPVerStatus ? 'sp.verification_status' : "'unknown' as status"}
        FROM service_providers sp
        LEFT JOIN users u ON sp.user_id = u.user_id
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

        try {
          // Use enhanced distance calculation with real routing
          const distanceResult = await calculateEnhancedDistance(userCoordinates, providerCoordinates);
          provider.distance = distanceResult.formattedDistance;
          provider.distanceValue = distanceResult.distance;

          console.log('📍 [Distance] Real routing calculation for provider', provider.name, ':', {
            distance: distanceResult.distance,
            formatted: distanceResult.formattedDistance,
            source: distanceResult.source
          });
        } catch (error) {
          console.error('Real routing calculation failed, using fallback:', error);
          // Fallback to simple calculation
          const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
          provider.distance = `${distanceValue} km away`;
          provider.distanceValue = distanceValue;
        }

        // Get package count
        try {
          const packagesCount = await query(`
            SELECT COUNT(*) as count
            FROM service_packages
            WHERE provider_id = ? AND is_active = 1
          `, [provider.id]) as any[];

          provider.packages = packagesCount[0]?.count || 0;
        } catch {
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
        // SECURITY FIX: Build safe query with validated where clause
        const statusColumn = hasBPAppStatus ? 'bp.application_status' : hasBPVerStatus ? 'bp.verification_status' : "'unknown'";
        const businessQuery = `
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
            ${statusColumn} as status
          FROM business_profiles bp
          JOIN users u ON bp.user_id = u.user_id
          WHERE ${bpWhereClause}
          LIMIT 1
        `;
        const businessResult = await query(businessQuery, [id]) as any[];

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
              WHERE business_id = ? AND is_active = 1
            `, [business.id]) as any[];

            formattedBusiness.packages = packagesCount[0]?.count || 0;

            // Calculate actual distance based on coordinates
            const businessCoordinates = getBataanCoordinates(formattedBusiness.address || formattedBusiness.city || 'Bataan');

            try {
              // Use enhanced distance calculation with real routing
              const distanceResult = await calculateEnhancedDistance(userCoordinates, businessCoordinates);
              (formattedBusiness as any).distance = distanceResult.formattedDistance;
              (formattedBusiness as any).distanceValue = distanceResult.distance;

              console.log('📍 [Distance] Real routing calculation for business', formattedBusiness.name, ':', {
                distance: distanceResult.distance,
                formatted: distanceResult.formattedDistance,
                source: distanceResult.source
              });
            } catch (error) {
              console.error('Real routing calculation failed for business, using fallback:', error);
              // Fallback to simple calculation
              const distanceValue = calculateDistance(userCoordinates, businessCoordinates);
              (formattedBusiness as any).distance = `${distanceValue} km away`;
              (formattedBusiness as any).distanceValue = distanceValue;
            }
          } catch {
          }

          return NextResponse.json({ provider: formattedBusiness });
        }
      } catch {
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

      // No test provider fallback - all data from database

      return NextResponse.json(
        {
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          providerId: id
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}
