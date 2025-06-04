import NodeCache from 'node-cache';

// Cache configuration
const DEFAULT_TTL = 300; // 5 minutes
const CHECK_PERIOD = 120; // Check for expired keys every 2 minutes

// Create cache instances for different data types
const userCache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: CHECK_PERIOD });
const packageCache = new NodeCache({ stdTTL: 600, checkperiod: CHECK_PERIOD }); // 10 minutes for packages
const providerCache = new NodeCache({ stdTTL: 600, checkperiod: CHECK_PERIOD }); // 10 minutes for providers
const configCache = new NodeCache({ stdTTL: 1800, checkperiod: CHECK_PERIOD }); // 30 minutes for config

export interface CacheOptions {
  ttl?: number;
  checkPeriod?: number;
}

export class CacheService {
  private cache: NodeCache;

  constructor(options: CacheOptions = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || DEFAULT_TTL,
      checkperiod: options.checkPeriod || CHECK_PERIOD,
    });
  }

  // Get value from cache
  get<T>(key: string): T | undefined {
    try {
      return this.cache.get<T>(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  // Set value in cache
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      return this.cache.set(key, value, ttl || DEFAULT_TTL);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete value from cache
  del(key: string): number {
    try {
      return this.cache.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return 0;
    }
  }

  // Check if key exists
  has(key: string): boolean {
    try {
      return this.cache.has(key);
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  // Get or set pattern
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const value = await fetcher();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      throw error;
    }
  }

  // Clear all cache
  flushAll(): void {
    try {
      this.cache.flushAll();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  // Get cache statistics
  getStats() {
    return this.cache.getStats();
  }
}

// Predefined cache instances
export const userCacheService = new CacheService({ ttl: DEFAULT_TTL });
export const packageCacheService = new CacheService({ ttl: 600 });
export const providerCacheService = new CacheService({ ttl: 600 });
export const configCacheService = new CacheService({ ttl: 1800 });

// Cache key generators
export const CacheKeys = {
  user: (id: number) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  packages: (providerId?: number) => providerId ? `packages:provider:${providerId}` : 'packages:all',
  provider: (id: number) => `provider:${id}`,
  providersByLocation: (lat: number, lng: number, radius: number) => 
    `providers:location:${lat}:${lng}:${radius}`,
  bookings: (userId: number) => `bookings:user:${userId}`,
  reviews: (providerId: number) => `reviews:provider:${providerId}`,
  notifications: (userId: number) => `notifications:user:${userId}`,
  config: (key: string) => `config:${key}`,
};

// Cache invalidation helpers
export const CacheInvalidation = {
  user: (userId: number) => {
    userCacheService.del(CacheKeys.user(userId));
  },
  
  userByEmail: (email: string) => {
    userCacheService.del(CacheKeys.userByEmail(email));
  },
  
  packages: (providerId?: number) => {
    if (providerId) {
      packageCacheService.del(CacheKeys.packages(providerId));
    }
    packageCacheService.del(CacheKeys.packages());
  },
  
  provider: (providerId: number) => {
    providerCacheService.del(CacheKeys.provider(providerId));
    // Also invalidate location-based caches (this is a simplified approach)
    providerCacheService.flushAll();
  },
  
  bookings: (userId: number) => {
    userCacheService.del(CacheKeys.bookings(userId));
  },
  
  reviews: (providerId: number) => {
    userCacheService.del(CacheKeys.reviews(providerId));
  },
  
  notifications: (userId: number) => {
    userCacheService.del(CacheKeys.notifications(userId));
  },
};

// Utility functions for common caching patterns
export async function cacheUserData<T>(
  userId: number,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return userCacheService.getOrSet(CacheKeys.user(userId), fetcher, ttl);
}

export async function cachePackageData<T>(
  providerId: number | undefined,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return packageCacheService.getOrSet(CacheKeys.packages(providerId), fetcher, ttl);
}

export async function cacheProviderData<T>(
  providerId: number,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return providerCacheService.getOrSet(CacheKeys.provider(providerId), fetcher, ttl);
}
