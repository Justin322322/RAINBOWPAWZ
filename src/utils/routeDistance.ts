/**
 * Route-based distance calculation utilities
 * Provides more accurate distance calculations using routing services
 */

import { routingService } from './routing';

interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  source: 'route' | 'haversine';
}

/**
 * Calculate route-based distance using real routing services
 * Uses the same routing service as the map directions for consistency
 */
export async function calculateRouteDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult> {
  try {
    // Use the real routing service (OSRM/MapBox)
    // Use trafficAware: true to match the directions calculation for consistency
    const routeResult = await routingService.getRoute(
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
      { trafficAware: true } // Use traffic-aware routing to match directions
    );

    // Parse the distance from the formatted string (e.g., "8.2 km" -> 8.2)
    const distanceMatch = routeResult.distance.match(/(\d+\.?\d*)/);
    const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;

    // Parse duration from formatted string (e.g., "15 min" -> 15)
    const durationMatch = routeResult.duration.match(/(\d+)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : Math.round(distance * 2);

    return {
      distance,
      duration,
      source: 'route'
    };
  } catch (error) {
    console.warn('Real routing service failed, falling back to Haversine:', error);

    // Fallback to Haversine formula
    const haversineDistance = calculateHaversineDistance(origin, destination);
    return {
      distance: haversineDistance,
      duration: Math.round(haversineDistance * 2), // Rough estimate: 30 km/h average
      source: 'haversine'
    };
  }
}



/**
 * Calculate straight-line distance using Haversine formula
 */
function calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.max(0.1, parseFloat(distance.toFixed(1)));
}

/**
 * Convert degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

/**
 * Enhanced distance calculation that uses real routing services
 * Returns both numeric distance and formatted string for consistency
 */
export async function calculateEnhancedDistance(
  origin: Coordinates | null,
  destination: Coordinates | null
): Promise<{ distance: number; formattedDistance: string; source: string }> {
  // Validate coordinates
  if (!origin || !destination || !isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    return {
      distance: 0,
      formattedDistance: 'Distance unavailable',
      source: 'invalid'
    };
  }

  try {
    // Try real routing service calculation
    const routeResult = await calculateRouteDistance(origin, destination);

    return {
      distance: routeResult.distance,
      formattedDistance: formatDistance(routeResult.distance, routeResult.source),
      source: routeResult.source
    };
  } catch (error) {
    console.error('Enhanced distance calculation failed:', error);

    // Final fallback to simple Haversine
    const distance = calculateHaversineDistance(origin, destination);
    return {
      distance,
      formattedDistance: formatDistance(distance, 'haversine-fallback'),
      source: 'haversine-fallback'
    };
  }
}

/**
 * Validate coordinate object
 */
function isValidCoordinate(coord: Coordinates): boolean {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number, _source?: string): string {
  if (distance === 0) return 'Distance unavailable';

  const formatted = distance < 1
    ? `${Math.round(distance * 1000)}m away`
    : `${distance} km away`;

  // Remove source indicator to keep display clean
  // Development debugging can be done via console logs instead
  return formatted;
}

/**
 * Format distance for display with routing service consistency
 * Ensures the same format as the routing service uses
 */
export function formatDistanceConsistent(distance: number | string, source?: string): string {
  // If it's already a formatted string from routing service, use it directly
  if (typeof distance === 'string') {
    const formatted = distance.includes('away') ? distance : `${distance} away`;

    // Remove source indicator to keep display clean
    return formatted;
  }

  // If it's a number, format it consistently
  return formatDistance(distance, source);
}
