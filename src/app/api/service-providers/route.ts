import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, getBataanCoordinates } from '@/utils/distance';
import { routingService } from '@/utils/routing';
import { serverCache } from '@/utils/server-cache';



// Cache for table/column existence to avoid repeated information_schema hits
let __spSchemaCache: { checkedAt: number; hasTable: boolean; columns: Set<string> } | null = null;
const SCHEMA_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedSchema() {
  if (!__spSchemaCache) return null;
  if (Date.now() - __spSchemaCache.checkedAt > SCHEMA_TTL_MS) return null;
  return __spSchemaCache;
}

async function ensureServiceProvidersSchema() {
  const cached = getCachedSchema();
  if (cached) return cached;

  const tableCheckResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
      `) as any[];
  const hasTable = tableCheckResult.length > 0;

  const columnsResult = hasTable
    ? await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'service_providers'
      `) as any[]
    : [];

  const columns = new Set<string>(columnsResult.map((c: any) => c.COLUMN_NAME));
  __spSchemaCache = { checkedAt: Date.now(), hasTable, columns };
  return __spSchemaCache;
}

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
      const schema = await ensureServiceProvidersSchema();
      if (!schema.hasTable) {
        throw new Error('Database schema error: service_providers table does not exist');
      }

      let providersResult;

      // Debug: Check if we have any providers at all
      const _totalProvidersCount = await query(`
        SELECT COUNT(*) as count FROM service_providers WHERE provider_type = 'cremation'
      `) as any[];

      const columnNames = schema.columns;
      const hasApplicationStatus = columnNames.has('application_status');
      const hasVerificationStatus = columnNames.has('verification_status');
      const hasStatus = columnNames.has('status');

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
      if (columnNames.has('provider_type')) {
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
          ${columnNames.has('provider_type') ? 'sp.provider_type' : "'cremation'"} as type,
          sp.created_at,
          u.profile_picture,
          ${hasApplicationStatus ? 'sp.application_status' : hasVerificationStatus ? 'sp.verification_status' : "'approved' as application_status"}
        FROM service_providers sp
        LEFT JOIN users u ON sp.user_id = u.user_id
        WHERE ${whereClause}
        ORDER BY sp.name ASC
      `) as any[];

      if (providersResult && providersResult.length > 0) {
        const parseDistanceValue = (distanceString: string): number => {
          if (!distanceString || typeof distanceString !== 'string') {
            return 0;
          }

          // Remove commas and extract numeric value with improved regex
          // This handles formats like: "1,234.5 km", "1.5 km", "500 m", "1,000 m"
          const cleanDistance = distanceString.replace(/,/g, '');
          const distanceMatch = cleanDistance.match(/^.*?(\d+(?:\.\d+)?).*?(?:km|m).*?$/i);

          if (!distanceMatch) {
            return 0;
          }

          const numericValue = parseFloat(distanceMatch[1]);

          // Convert meters to kilometers if needed (more precise unit detection)
          if (/^\s*\d+(?:\.\d+)?\s*m\s*$/i.test(cleanDistance.trim())) {
            return numericValue / 1000;
          }

          return numericValue;
        };
        // Async function to calculate distance for a single provider with server caching
        const calculateProviderDistance = async (provider: any, userCoords: any): Promise<void> => {
          const providerCoordinates = getBataanCoordinates(provider.address || 'Bataan');

          // Check if providerCoordinates is null and skip distance calculation
          if (!providerCoordinates) {
            provider.distance = 'Location not available';
            provider.distanceValue = 0;
            return;
          }

          // Try server cache first for faster response
          const cachedRoute = serverCache.getRoutingData(
            [userCoords.lat, userCoords.lng],
            [providerCoordinates.lat, providerCoordinates.lng]
          );

          if (cachedRoute) {
            // Use cached data for immediate response
            provider.distance = cachedRoute.distance;
            provider.distanceValue = cachedRoute.distanceValue;
            return;
          }

          try {
            // Try to get actual routing distance with timeout
            const routeResult = await routingService.getRoute(
              [userCoords.lat, userCoords.lng],
              [providerCoordinates.lat, providerCoordinates.lng],
              { timeout: 5000 } // 5 second timeout
            );

            // Validate that distance exists in the response before parsing
            if (!routeResult?.distance) {
              throw new Error('Invalid route response: missing distance');
            }

            // Extract numeric distance value with improved parsing
            const numericDistance = parseDistanceValue(routeResult.distance);

            if (numericDistance === 0) {
              throw new Error(`Unable to parse distance from: ${routeResult.distance}`);
            }

            provider.distance = routeResult.distance;
            provider.distanceValue = numericDistance;

            // Cache the result in server cache for future requests
            serverCache.setRoutingData(
              [userCoords.lat, userCoords.lng],
              [providerCoordinates.lat, providerCoordinates.lng],
              {
                distance: routeResult.distance,
                duration: routeResult.duration,
                distanceValue: numericDistance,
                provider: routeResult.provider,
                trafficAware: routeResult.trafficAware
              }
            );

          } catch {
            // Fallback to simple distance calculation
            const distance = calculateDistance(userCoords, providerCoordinates);
            provider.distance = `${distance.toFixed(1)} km`;
            provider.distanceValue = distance;
          }
        };

        // Check if service_packages table has service_provider_id or provider_id column (once)
        const packageColumnsResult = await query(`
          SHOW COLUMNS FROM service_packages
          WHERE Field IN ('service_provider_id', 'provider_id')
        `) as any[];

        const packageColumns = packageColumnsResult.map(col => col.Field);
        const useServiceProviderIdColumn = packageColumns.includes('service_provider_id');
        const useProviderIdColumn = packageColumns.includes('provider_id');

        // Prepare concurrent operations for all providers
        const providerOperations = providersResult.map(async (provider) => {
          try {
            // Get package count for this provider
            let packagesResult;
            if (useProviderIdColumn) {
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

            // Calculate distance using the dedicated async function
            await calculateProviderDistance(provider, userCoordinates);

          } catch {
            // Final fallback
            const providerCoordinates = getBataanCoordinates(provider.address || 'Bataan');
            if (providerCoordinates) {
              const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
              provider.distance = `${distanceValue.toFixed(1)} km`;
              provider.distanceValue = distanceValue;
            } else {
              provider.distance = 'Distance unavailable';
              provider.distanceValue = 0;
            }
            provider.packages = provider.packages || 0;
          }

          return provider;
        });

        // Execute all provider operations concurrently using Promise.allSettled
        // This ensures that if one provider fails, others can still complete successfully
        const results = await Promise.allSettled(providerOperations);

        // Process results and filter out any rejected promises
        const processedProviders = results
          .map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              // Return the original provider with fallback values
              const provider = providersResult[index];
              provider.packages = 0;
              provider.distance = 'Distance unavailable';
              provider.distanceValue = 0;
              return provider;
            }
          })
          .filter(provider => provider !== null); // Filter out any null providers

        return NextResponse.json({ providers: processedProviders });
      }

      // If no providers found, return empty array
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