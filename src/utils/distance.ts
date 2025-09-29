/**
 * Utility functions for calculating distances between coordinates
 */

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate (latitude, longitude)
 * @param coord2 Second coordinate (latitude, longitude)
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates | null, coord2: Coordinates | null): number {
  // If either coordinate is missing or invalid, return a default distance
  if (!coord1 || !coord2 || !isValidCoordinate(coord1) || !isValidCoordinate(coord2)) {
    return 0;
  }

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers

  return Math.max(0.1, parseFloat(distance.toFixed(1))); // Ensure minimum distance of 0.1km
}

/**
 * Check if coordinate is valid
 */
function isValidCoordinate(coord: Coordinates): boolean {
  return typeof coord.lat === 'number' && 
         typeof coord.lng === 'number' &&
         !isNaN(coord.lat) && 
         !isNaN(coord.lng) &&
         coord.lat >= -90 && 
         coord.lat <= 90 &&
         coord.lng >= -180 && 
         coord.lng <= 180;
}

/**
 * Convert degrees to radians
 * @param deg Degrees
 * @returns Radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

/**
 * Get coordinates for any location using dynamic geocoding
 * This function uses the geocoding API to resolve addresses dynamically for any location
 * @param location Location name or address (works for any location, not just Bataan)
 * @returns Promise<Coordinates | null>
 */
export async function geocodeAddress(location: string): Promise<Coordinates | null> {
  if (!location || location.trim() === '') {
    return null;
  }

  try {
    // Use the geocoding API to resolve the address dynamically
    const response = await fetch(`/api/geocoding?address=${encodeURIComponent(location)}`);
    
    if (!response.ok) {
      console.warn(`Geocoding failed for "${location}": ${response.status}`);
      return null;
    }

    const results = await response.json();
    
    if (!results || results.length === 0) {
      console.warn(`No geocoding results found for "${location}"`);
      return null;
    }

    // Use the first (best) result
    const bestResult = results[0];
    
    return {
      lat: parseFloat(bestResult.lat),
      lng: parseFloat(bestResult.lon)
    };
  } catch (error) {
    console.error(`Error geocoding "${location}":`, error);
    return null;
  }
}
