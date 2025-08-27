/**
 * Memory-only caching utilities for geocoding and routing data
 * No localStorage for better performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface GeocodingCacheData {
  coordinates: [number, number];
  formattedAddress: string;
  confidence: number;
  provider: string;
}

interface RoutingCacheData {
  route: any;
  distance: string;
  duration: string;
  steps: any[];
  trafficAware: boolean;
}

class MemoryCacheManager {
  private static instance: MemoryCacheManager;
  private geocodingCache = new Map<string, CacheEntry<GeocodingCacheData>>();
  private routingCache = new Map<string, CacheEntry<RoutingCacheData>>();
  
  private readonly GEOCODING_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly ROUTING_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_ENTRIES = 100; // Limit memory usage

  private constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  public static getInstance(): MemoryCacheManager {
    if (!MemoryCacheManager.instance) {
      MemoryCacheManager.instance = new MemoryCacheManager();
    }
    return MemoryCacheManager.instance;
  }

  private generateGeocodingKey(address: string): string {
    return address.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private generateRoutingKey(start: [number, number], end: [number, number], trafficAware: boolean = false): string {
    const trafficSuffix = trafficAware ? '_traffic' : '_normal';
    return `${start[0].toFixed(4)}_${start[1].toFixed(4)}_${end[0].toFixed(4)}_${end[1].toFixed(4)}${trafficSuffix}`;
  }

  private isValidEntry<T>(entry: CacheEntry<T>): boolean {
    return (Date.now() - entry.timestamp) < entry.ttl;
  }

  private evictOldestIfNeeded<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size >= this.MAX_ENTRIES) {
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [key, entry] of cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  }

  public setGeocodingCache(address: string, data: GeocodingCacheData): void {
    const key = this.generateGeocodingKey(address);
    this.evictOldestIfNeeded(this.geocodingCache);
    
    this.geocodingCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.GEOCODING_TTL
    });
  }

  public getGeocodingCache(address: string): GeocodingCacheData | null {
    const key = this.generateGeocodingKey(address);
    const entry = this.geocodingCache.get(key);
    
    if (!entry || !this.isValidEntry(entry)) {
      if (entry) this.geocodingCache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  public setRoutingCache(start: [number, number], end: [number, number], data: RoutingCacheData): void {
    const key = this.generateRoutingKey(start, end, data.trafficAware);
    this.evictOldestIfNeeded(this.routingCache);
    
    this.routingCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.ROUTING_TTL
    });
  }

  public getRoutingCache(start: [number, number], end: [number, number], trafficAware: boolean = false): RoutingCacheData | null {
    const key = this.generateRoutingKey(start, end, trafficAware);
    const entry = this.routingCache.get(key);
    
    if (!entry || !this.isValidEntry(entry)) {
      if (entry) this.routingCache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  public cleanupExpiredEntries(): void {
    // Clean geocoding cache
    for (const [key, entry] of this.geocodingCache.entries()) {
      if (!this.isValidEntry(entry)) {
        this.geocodingCache.delete(key);
      }
    }
    
    // Clean routing cache
    for (const [key, entry] of this.routingCache.entries()) {
      if (!this.isValidEntry(entry)) {
        this.routingCache.delete(key);
      }
    }
  }

  public clearCache(): void {
    this.geocodingCache.clear();
    this.routingCache.clear();
  }

  public clearRoutingCache(): void {
    this.routingCache.clear();
  }

  public getCacheStats(): { geocoding: number; routing: number; total: number } {
    const geocoding = this.geocodingCache.size;
    const routing = this.routingCache.size;
    return { geocoding, routing, total: geocoding + routing };
  }
}

// Export singleton instance
export const cacheManager = MemoryCacheManager.getInstance();