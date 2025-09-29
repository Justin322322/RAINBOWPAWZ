/**
 * Server-side caching for routing and distance calculations
 * This provides in-memory caching for API routes to improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface RoutingCacheData {
  distance: string;
  duration: string;
  distanceValue: number;
  provider: string;
  trafficAware: boolean;
}

interface ServiceProvidersCacheData {
  providers: any[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  statistics: {
    totalProviders: number;
    filteredCount: number;
  };
}

// Union type for all supported cache data types
// Add new cache data types here as needed for future extensibility
type CacheDataTypes = RoutingCacheData | ServiceProvidersCacheData;

class ServerCache {
  private static instance: ServerCache;
  private cache = new Map<string, CacheEntry<CacheDataTypes>>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes (reduced for better performance)
  private readonly ROUTING_TTL = 15 * 60 * 1000; // 15 minutes (reduced for better performance)
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of entries
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
  }

  public static getInstance(): ServerCache {
    if (!ServerCache.instance) {
      ServerCache.instance = new ServerCache();
    }
    return ServerCache.instance;
  }

  /**
   * Generic method to set data in cache with type safety
   * @template T - The type of data being cached, must extend CacheDataTypes
   * @param key - Unique cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (defaults to DEFAULT_TTL)
   */
  public set<T extends CacheDataTypes>(
    key: string,
    data: T,
    ttl: number = this.DEFAULT_TTL
  ): void {
    try {
      // Check cache size and cleanup if needed
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.cleanupOldEntries();
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0
      };

      this.cache.set(key, entry as CacheEntry<CacheDataTypes>);
      console.log(`📍 [Server Cache] Cached data for ${key}`);
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * Generic method to get data from cache with type safety
   * @template T - The type of data being retrieved, must extend CacheDataTypes
   * @param key - Unique cache key
   * @returns The cached data of type T, or null if not found/expired
   */
  public get<T extends CacheDataTypes>(key: string): T | null {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return null;
      }

      // Check if entry is expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return null;
      }

      // Increment hit counter
      entry.hits++;
      console.log(`📍 [Server Cache Hit] Retrieved data for ${key} (hits: ${entry.hits})`);

      return entry.data as T;
    } catch (error) {
      console.warn('Failed to retrieve data from cache:', error);
      return null;
    }
  }

  /**
   * Generate cache key for routing data
   */
  private generateRoutingKey(
    userCoords: [number, number],
    providerCoords: [number, number],
    trafficAware: boolean = false
  ): string {
    const precision = 4; // Coordinate precision for caching
    const userKey = `${userCoords[0].toFixed(precision)},${userCoords[1].toFixed(precision)}`;
    const providerKey = `${providerCoords[0].toFixed(precision)},${providerCoords[1].toFixed(precision)}`;
    const trafficSuffix = trafficAware ? '_traffic' : '_normal';
    return `route_${userKey}_to_${providerKey}${trafficSuffix}`;
  }

  /**
   * Set routing data in cache
   */
  public setRoutingData(
    userCoords: [number, number],
    providerCoords: [number, number],
    data: RoutingCacheData,
    trafficAware: boolean = false
  ): void {
    const key = this.generateRoutingKey(userCoords, providerCoords, trafficAware);
    this.set<RoutingCacheData>(key, data, this.ROUTING_TTL);
  }

  /**
   * Get routing data from cache
   */
  public getRoutingData(
    userCoords: [number, number],
    providerCoords: [number, number],
    trafficAware: boolean = false
  ): RoutingCacheData | null {
    const key = this.generateRoutingKey(userCoords, providerCoords, trafficAware);
    return this.get<RoutingCacheData>(key);
  }

  /**
   * Set service providers data in cache
   */
  public setServiceProvidersData(
    cacheKey: string,
    data: ServiceProvidersCacheData,
    ttl: number = this.DEFAULT_TTL
  ): void {
    this.set<ServiceProvidersCacheData>(cacheKey, data, ttl);
  }

  /**
   * Get service providers data from cache
   */
  public getServiceProvidersData(cacheKey: string): ServiceProvidersCacheData | null {
    return this.get<ServiceProvidersCacheData>(cacheKey);
  }

  /**
   * Preload routing data for common routes
   */
  public async preloadCommonRoutes(
    userCoords: [number, number],
    providerCoordsList: [number, number][],
    routingService: any
  ): Promise<void> {
    console.log(`📍 [Preload] Starting preload for ${providerCoordsList.length} routes`);
    
    // Process routes in batches to avoid overwhelming the routing service
    const batchSize = 3;
    for (let i = 0; i < providerCoordsList.length; i += batchSize) {
      const batch = providerCoordsList.slice(i, i + batchSize);
      
      const preloadPromises = batch.map(async (providerCoords) => {
        try {
          // Check if already cached
          if (this.getRoutingData(userCoords, providerCoords)) {
            return; // Already cached
          }

          // Preload with longer timeout for background processing
          const result = await routingService.getRoute(userCoords, providerCoords, { 
            timeout: 10000 
          });

          // Cache the result
          this.setRoutingData(userCoords, providerCoords, {
            distance: result.distance,
            duration: result.duration,
            distanceValue: this.parseDistanceValue(result.distance),
            provider: result.provider,
            trafficAware: result.trafficAware
          });
        } catch (error) {
          console.warn(`📍 [Preload] Failed to preload route to ${providerCoords}:`, error);
        }
      });

      // Wait for current batch to complete before starting next batch
      await Promise.allSettled(preloadPromises);
      
      // Small delay between batches to be respectful to routing APIs
      if (i + batchSize < providerCoordsList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`📍 [Preload] Completed preload process`);
  }

  /**
   * Parse distance value from string (same logic as in the API)
   */
  private parseDistanceValue(distanceString: string): number {
    if (!distanceString || typeof distanceString !== 'string') {
      return 0;
    }
    
    const cleanDistance = distanceString.replace(/,/g, '');
    const distanceMatch = cleanDistance.match(/(\d+(?:\.\d+)?)/);
    
    if (!distanceMatch) {
      return 0;
    }
    
    const numericValue = parseFloat(distanceMatch[1]);
    
    // Convert meters to kilometers if needed
    if (cleanDistance.toLowerCase().includes('m') && !cleanDistance.toLowerCase().includes('km')) {
      return numericValue / 1000;
    }
    
    return numericValue;
  }

  /**
   * Clean up expired entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    // If still too many entries, remove least recently used
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2)); // Remove 20%
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
        removedCount++;
      });
    }

    if (removedCount > 0) {
      console.log(`📍 [Cache Cleanup] Removed ${removedCount} expired/old entries`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Clean up every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEntries();
    }, 10 * 60 * 1000);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; totalHits: number; avgHits: number } {
    let totalHits = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      totalHits,
      avgHits: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('📍 [Cache] All cache entries cleared');
  }

  /**
   * Cleanup on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const serverCache = ServerCache.getInstance();
