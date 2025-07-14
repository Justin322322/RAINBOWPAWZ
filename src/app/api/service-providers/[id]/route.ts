import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';

/**
 * Handles HTTP GET requests to retrieve detailed information about a service provider by ID, including optional distance from a user location.
 *
 * Extracts the provider ID from the request parameters and user location data from query parameters. Fetches provider details, average rating, and active package count from the database. If user location and provider address are available, calculates the distance between them. Returns appropriate error responses for missing provider ID, provider not found, or database errors.
 *
 * @returns A JSON response containing the provider details, or an error message with the appropriate HTTP status code.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Extract user location from query parameters (optional)
    const { searchParams } = new URL(request.url);
    const userLocation = searchParams.get('location');
    const userLat = searchParams.get('lat');
    const userLng = searchParams.get('lng');

    // Get coordinates for the user's location (if available)
    let userCoordinates = null;

    if (userLocation || (userLat && userLng)) {
      // Priority 1: Use provided coordinates if available
      if (userLat && userLng) {
        const lat = parseFloat(userLat);
        const lng = parseFloat(userLng);

        if (!isNaN(lat) && !isNaN(lng)) {
          userCoordinates = { lat, lng };
        } else if (userLocation && userLocation.trim() !== '') {
          userCoordinates = getBataanCoordinates(userLocation);
          // Note: userCoordinates could be null if location not found, but that's okay for detail page
        }
      } else if (userLocation && userLocation.trim() !== '') {
        // Priority 2: Fallback to address-based lookup
        userCoordinates = getBataanCoordinates(userLocation);
        // Note: userCoordinates could be null if location not found, but that's okay for detail page
      }
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

        // Calculate actual distance based on coordinates (if user location available)
        if (userCoordinates && provider.address) {
          const providerCoordinates = getBataanCoordinates(provider.address);

          try {
            // Use simple distance calculation (enhanced routing removed)
            const distance = calculateDistance(userCoordinates, providerCoordinates);
            provider.distance = `${distance.toFixed(1)} km`;
            provider.distanceValue = distance;
          } catch (error) {
            console.error('Distance calculation failed:', error);
            // Fallback to simple calculation
            const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
            provider.distance = `${distanceValue} km away`;
            provider.distanceValue = distanceValue;
          }
        } else {
          // No user location available
          provider.distance = 'Distance not available';
          provider.distanceValue = null;
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

      // If provider not found, return 404
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
