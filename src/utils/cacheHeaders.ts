/**
 * Cache Control Utilities for API Routes
 * 
 * Use these helpers to set appropriate cache headers in your API routes
 */

import { NextResponse } from 'next/server';

/**
 * Cache strategies for different types of data
 */
export const CacheStrategy = {
  /**
   * No caching - for user-specific or highly dynamic data
   * Use for: user profiles, bookings, auth endpoints, payments
   */
  NO_CACHE: 'private, no-cache, no-store, max-age=0, must-revalidate',
  
  /**
   * Short cache - for semi-dynamic data that changes frequently
   * Use for: notifications, recent activity, live stats
   * CDN: 1 minute, Stale: 5 minutes
   */
  SHORT: 'public, s-maxage=60, stale-while-revalidate=300',
  
  /**
   * Medium cache - for semi-static data that changes occasionally
   * Use for: service listings, packages, provider lists
   * CDN: 5 minutes, Stale: 10 minutes
   */
  MEDIUM: 'public, s-maxage=300, stale-while-revalidate=600',
  
  /**
   * Long cache - for mostly static data
   * Use for: categories, static content, public info
   * CDN: 1 hour, Stale: 1 day
   */
  LONG: 'public, s-maxage=3600, stale-while-revalidate=86400',
  
  /**
   * Immutable - for static assets that never change
   * Use for: images with content hashes, fonts, static files
   */
  IMMUTABLE: 'public, max-age=31536000, immutable',
} as const;

/**
 * Set cache headers on a NextResponse
 * 
 * @example
 * ```ts
 * // User-specific data (no cache)
 * const response = NextResponse.json({ user: userData });
 * return setCacheHeaders(response, CacheStrategy.NO_CACHE);
 * 
 * // Public list (medium cache)
 * const response = NextResponse.json({ services: serviceList });
 * return setCacheHeaders(response, CacheStrategy.MEDIUM);
 * ```
 */
export function setCacheHeaders(
  response: NextResponse,
  strategy: string = CacheStrategy.NO_CACHE
): NextResponse {
  response.headers.set('Cache-Control', strategy);
  return response;
}

/**
 * Create a NextResponse with cache headers in one call
 * 
 * @example
 * ```ts
 * // User bookings (no cache)
 * return createCachedResponse(
 *   { bookings: userBookings },
 *   CacheStrategy.NO_CACHE
 * );
 * 
 * // Service providers list (medium cache)
 * return createCachedResponse(
 *   { providers: providerList },
 *   CacheStrategy.MEDIUM
 * );
 * ```
 */
export function createCachedResponse<T>(
  data: T,
  strategy: string = CacheStrategy.NO_CACHE,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return setCacheHeaders(response, strategy);
}

/**
 * Revalidate cache for specific paths
 * Use this when data changes and you want to invalidate the cache
 * 
 * @example
 * ```ts
 * // After creating a new service
 * await revalidateCache('/api/service-providers');
 * ```
 */
export async function revalidateCache(path: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/revalidate?path=${encodeURIComponent(path)}`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Failed to revalidate cache:', error);
  }
}
