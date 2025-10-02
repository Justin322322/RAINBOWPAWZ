import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateDistance, geocodeAddress } from '@/utils/distance';
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
  // Extract user location and filtering parameters from query parameters
  const { searchParams } = new URL(request.url);
  const userLocation = searchParams.get('location');
  const userLat = searchParams.get('lat');
  const userLng = searchParams.get('lng');

  // Add pagination and filtering parameters
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
  const search = searchParams.get('search') || '';

  // Validate that we have location information
  if (!userLocation && (!userLat || !userLng)) {
    return NextResponse.json({
      success: false,
      error: 'User location is required',
      providers: []
    });
  }

  // Get coordinates for the user's location
  let userCoordinates: { lat: number; lng: number } | null = null;

  // Priority 1: Use provided coordinates if available
  if (userLat && userLng) {
    const lat = parseFloat(userLat);
    const lng = parseFloat(userLng);

    if (!isNaN(lat) && !isNaN(lng)) {
      userCoordinates = { lat, lng };
    } else {
      // Only fallback to geocoding if we have a valid location string
      if (userLocation && userLocation.trim() !== '') {
        userCoordinates = await geocodeAddress(userLocation);
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
    userCoordinates = await geocodeAddress(userLocation);
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

      // Create simplified cache key (ignore pagination for better cache hits)
      const baseCacheKey = `${userLat}_${userLng}_${search}`;
      
      // Check server cache first (10 minute cache for better performance)
      const cachedData = serverCache.getServiceProvidersData(baseCacheKey);
      if (cachedData) {
        // Apply pagination to cached data
        const paginatedProviders = cachedData.providers.slice(offset, offset + limit);
        const total = cachedData.providers.length;
        
        const response = NextResponse.json({
          providers: paginatedProviders,
          pagination: {
            total,
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            limit,
            offset,
            hasMore: offset + limit < total
          },
          statistics: {
            totalProviders: total,
            filteredCount: paginatedProviders.length
          }
        });
        
        // Set cache headers for public list data
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        response.headers.set('X-Cache', 'HIT');
        return response;
      }

      let providersResult: any[];

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
      // Only show approved/verified providers to users
      if (hasApplicationStatus) {
        whereClause = "(application_status = 'approved' OR application_status = 'verified')";
      }
      // Fallback to verification_status if application_status doesn't exist
      else if (hasVerificationStatus) {
        whereClause = "verification_status = 'verified'";
      }
      // If neither exists, don't show any providers to avoid showing pending ones
      else {
        whereClause = "1=0"; // This will return no results, preventing pending providers from showing
      }

      // Add provider_type filter if column exists
      if (columnNames.has('provider_type')) {
        whereClause += " AND provider_type = 'cremation'";
      }

      // Add active status filter if the column exists
      if (hasStatus) {
        whereClause += " AND status = 'active'";
      }

      // Build dynamic WHERE clause for filtering
      let fullWhereClause = whereClause;

      // Add search filter if provided
      if (search) {
        const searchConditions = [
          'sp.name LIKE ?',
          'COALESCE(sp.address, u.address) LIKE ?',
          'sp.description LIKE ?'
        ];
        fullWhereClause += ` AND (${searchConditions.join(' OR ')})`;
      }

      // Fetch from service_providers table with dynamic WHERE clause, including user profile picture
      // Use COALESCE to fallback to user address if provider address is null
      // Create business name logic: use sp.name if it's clearly a business name, otherwise create one
      providersResult = await query(`
        SELECT
          sp.provider_id as id,
          CASE
            WHEN sp.name LIKE '%Cremation%' OR sp.name LIKE '%Memorial%' OR sp.name LIKE '%Pet%' OR sp.name LIKE '%Service%' OR sp.name LIKE '%Center%' OR sp.name LIKE '%Care%' THEN sp.name
            WHEN sp.name IS NOT NULL AND TRIM(sp.name) != '' THEN CONCAT(TRIM(sp.name), ' Pet Cremation Services')
            ELSE CONCAT(
              CASE 
                WHEN TRIM(CONCAT_WS(' ', COALESCE(u.first_name, ''), COALESCE(u.last_name, ''))) = '' 
                THEN 'Our' 
                ELSE TRIM(CONCAT_WS(' ', COALESCE(u.first_name, ''), COALESCE(u.last_name, '')))
              END, 
              ' Pet Cremation Services'
            )
          END as name,
          COALESCE(sp.address, u.address) as address,
          COALESCE(sp.phone, u.phone) as phone,
          sp.description,
          ${columnNames.has('provider_type') ? 'sp.provider_type' : "'cremation'"} as type,
          sp.created_at,
          u.profile_picture,
          ${hasApplicationStatus ? 'sp.application_status' : hasVerificationStatus ? 'sp.verification_status' : "'approved' as application_status"},
          COALESCE(sp.hours, 'Not specified') as operational_hours
        FROM service_providers sp
        LEFT JOIN users u ON sp.user_id = u.user_id
        WHERE ${fullWhereClause}
        ORDER BY sp.name ASC
      `, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []) as any[];

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
          const providerCoordinates = await geocodeAddress(provider.address || 'Bataan');

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
            // Try to get actual routing distance with reduced timeout
            const routeResult = await routingService.getRoute(
              [userCoords.lat, userCoords.lng],
              [providerCoordinates.lat, providerCoordinates.lng],
              { timeout: 800 } // Reduced to 800ms for faster response
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
            // Fallback to simple distance calculation (faster)
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

        // Batch fetch package counts for all providers at once
        const providerIds = providersResult.map(p => p.id);
        let packageCounts: Map<number, number> = new Map();
        
        if (providerIds.length > 0) {
          try {
            let packageCountsResult;
            if (useProviderIdColumn) {
              packageCountsResult = await query(`
                SELECT provider_id, COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id IN (${providerIds.map(() => '?').join(',')}) AND is_active = 1
                GROUP BY provider_id
              `, providerIds) as any[];
              packageCountsResult.forEach((row: any) => {
                packageCounts.set(row.provider_id, row.package_count);
              });
            } else if (useServiceProviderIdColumn) {
              packageCountsResult = await query(`
                SELECT service_provider_id, COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id IN (${providerIds.map(() => '?').join(',')}) AND is_active = 1
                GROUP BY service_provider_id
              `, providerIds) as any[];
              packageCountsResult.forEach((row: any) => {
                packageCounts.set(row.service_provider_id, row.package_count);
              });
            }
          } catch (error) {
            console.error('Error fetching package counts:', error);
          }
        }

        // Prepare concurrent operations for all providers
        const providerOperations = providersResult.map(async (provider) => {
          try {
            // Use pre-fetched package count
            provider.packages = packageCounts.get(provider.id) || 0;

            // Calculate distance using the dedicated async function
            await calculateProviderDistance(provider, userCoordinates);

          } catch {
            // Final fallback - use simple distance calculation with fallback coordinates
            try {
              const providerCoordinates = await geocodeAddress(provider.address || 'Bataan');
              if (providerCoordinates) {
                const distanceValue = calculateDistance(userCoordinates, providerCoordinates);
                provider.distance = `${distanceValue.toFixed(1)} km`;
                provider.distanceValue = distanceValue;
              } else {
                provider.distance = 'Distance unavailable';
                provider.distanceValue = 0;
              }
            } catch {
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

        // Cache all processed providers (without pagination)
        const total = processedProviders.length;
        serverCache.setServiceProvidersData(baseCacheKey, {
          providers: processedProviders,
          pagination: {
            total,
            currentPage: 1,
            totalPages: Math.ceil(total / limit),
            limit,
            offset: 0,
            hasMore: total > limit
          },
          statistics: {
            totalProviders: total,
            filteredCount: total
          }
        }, 10 * 60 * 1000); // 10 minute cache

        // Apply pagination to response
        const paginatedProviders = processedProviders.slice(offset, offset + limit);

        const response = NextResponse.json({
          providers: paginatedProviders,
          pagination: {
            total,
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            limit,
            offset,
            hasMore: offset + limit < total
          },
          statistics: {
            totalProviders: total,
            filteredCount: paginatedProviders.length
          }
        });
        
        // Set cache headers for public list data
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        response.headers.set('X-Cache', 'MISS');
        return response;
      }

      // If no providers found, return empty array with pagination metadata
      return NextResponse.json({
        providers: [],
        pagination: {
          total: 0,
          currentPage: 1,
          totalPages: 0,
          limit,
          offset,
          hasMore: false
        },
        statistics: {
          totalProviders: 0,
          filteredCount: 0
        }
      });
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