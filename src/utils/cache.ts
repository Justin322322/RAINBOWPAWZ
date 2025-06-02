/**
 * Enhanced caching utilities for geocoding and routing data
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version: string;
  confidence?: number; // For geocoding results
}

export interface GeocodingCacheData {
  coordinates: [number, number];
  formattedAddress: string;
  confidence: number;
  provider: string;
}

export interface RoutingCacheData {
  route: any;
  distance: string;
  duration: string;
  steps: any[];
}

class CacheManager {
  private static instance: CacheManager;
  private readonly CACHE_VERSION = '1.0.0';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly GEOCODING_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly ROUTING_TTL = 60 * 60 * 1000; // 1 hour

  private constructor() {
    // Only cleanup if we're in the browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      this.cleanupExpiredEntries();
    }
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Generate a cache key from an address
   */
  private generateGeocodingKey(address: string): string {
    return `geo_${address.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
  }

  /**
   * Generate a cache key for routing
   */
  private generateRoutingKey(start: [number, number], end: [number, number]): string {
    return `route_${start[0].toFixed(4)}_${start[1].toFixed(4)}_${end[0].toFixed(4)}_${end[1].toFixed(4)}`;
  }

  /**
   * Check if a cache entry is valid
   */
  private isValidEntry<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return (
      entry.version === this.CACHE_VERSION &&
      (now - entry.timestamp) < entry.ttl
    );
  }

  /**
   * Store geocoding data in cache
   */
  public setGeocodingCache(address: string, data: GeocodingCacheData): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const key = this.generateGeocodingKey(address);
      const entry: CacheEntry<GeocodingCacheData> = {
        data,
        timestamp: Date.now(),
        ttl: this.GEOCODING_TTL,
        version: this.CACHE_VERSION,
        confidence: data.confidence
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache geocoding data:', error);
    }
  }

  /**
   * Get geocoding data from cache
   */
  public getGeocodingCache(address: string): GeocodingCacheData | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    
    try {
      const key = this.generateGeocodingKey(address);
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      const entry: CacheEntry<GeocodingCacheData> = JSON.parse(cached);

      if (!this.isValidEntry(entry)) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve geocoding cache:', error);
      return null;
    }
  }

  /**
   * Store routing data in cache
   */
  public setRoutingCache(start: [number, number], end: [number, number], data: RoutingCacheData): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const key = this.generateRoutingKey(start, end);
      const entry: CacheEntry<RoutingCacheData> = {
        data,
        timestamp: Date.now(),
        ttl: this.ROUTING_TTL,
        version: this.CACHE_VERSION
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache routing data:', error);
    }
  }

  /**
   * Get routing data from cache
   */
  public getRoutingCache(start: [number, number], end: [number, number]): RoutingCacheData | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    
    try {
      const key = this.generateRoutingKey(start, end);
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      const entry: CacheEntry<RoutingCacheData> = JSON.parse(cached);

      if (!this.isValidEntry(entry)) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve routing cache:', error);
      return null;
    }
  }

  /**
   * Clean up expired cache entries
   */
  public cleanupExpiredEntries(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || (!key.startsWith('geo_') && !key.startsWith('route_'))) continue;

        try {
          const cached = localStorage.getItem(key);
          if (!cached) continue;

          const entry: CacheEntry<any> = JSON.parse(cached);
          if (!this.isValidEntry(entry)) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to cleanup cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('geo_') || key.startsWith('route_'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { geocoding: number; routing: number; total: number } {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { geocoding: 0, routing: 0, total: 0 };
    }
    
    let geocoding = 0;
    let routing = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.startsWith('geo_')) geocoding++;
        else if (key.startsWith('route_')) routing++;
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return { geocoding, routing, total: geocoding + routing };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
