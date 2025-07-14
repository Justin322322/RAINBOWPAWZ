import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';

/**
 * Handles GET requests to retrieve cremation service providers based on user location.
 *
 * Extracts location information from query parameters, resolves user coordinates, and queries the database for cremation providers. Returns a list of providers with details, package counts, and calculated distances from the user. Responds with appropriate error messages if location data is missing or invalid, or if database errors occur.
 *
 * @param request - The incoming HTTP request containing location query parameters
 * @returns A JSON response with an array of cremation service providers and their details, or an error message if the request cannot be fulfilled
 */
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
    } else {
      console.warn('⚠️ [API] Invalid coordinates provided, falling back to geocoding');
      // Only fallback to geocoding if we have a valid location string
      if (userLocation && userLocation.trim() !== '') {
        userCoordinates = getBataanCoordinates(userLocation);
        if (!userCoordinates) {
          // Location not found in our database
          return NextResponse.json({
            success: false,
            error: 'Location not found. Please check your address in your profile.',
            providers: []
          });
        }
      } else {
        // No valid location data available
        return NextResponse.json({
          success: false,
          error: 'Invalid coordinates provided and no valid location address available',
          providers: []
        });
      }
    }
  } else if (userLocation) {
    // Priority 2: Fallback to address-based lookup
    userCoordinates = getBataanCoordinates(userLocation);
    if (!userCoordinates) {
      // Location not found in our database
      return NextResponse.json({
        success: false,
        error: 'Location not found. Please check your address in your profile.',
        providers: []
      });
    }
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
      // Check if service_providers table exists
      const tableCheckResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
      `) as any[];

      if (tableCheckResult.length === 0) {
        throw new Error('Database schema error: service_providers table does not exist');
      }

      let providersResult;

      // Debug: Check if we have any providers at all
      const _totalProvidersCount = await query(`
        SELECT COUNT(*) as count FROM service_providers WHERE provider_type = 'cremation'
      `) as any[];
      
      
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
              // Use simple distance calculation (enhanced routing removed)
              const distance = calculateDistance(userCoordinates, providerCoordinates);
              provider.distance = `${distance.toFixed(1)} km`;
              provider.distanceValue = distance; // Store numeric value for sorting
            } catch (error) {
              console.error('📍 [Distance] Distance calculation failed:', error);
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

      // If no providers found, return empty array
      return NextResponse.json({ providers: [] });
    } catch (dbError) {
      console.error('Database error in service-providers:', dbError);
      return NextResponse.json({ providers: [], error: 'Database error' });
    }
  } catch (error) {
    console.error('General error in service-providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    );
  }
}
