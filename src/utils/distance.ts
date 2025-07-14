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
 * Returns the geographic coordinates for a known location in Bataan, Philippines, or `null` if the location is not recognized.
 *
 * The function normalizes the input location string and attempts to match it against a predefined list of cities, municipalities, common places, and specific businesses in Bataan. If no match is found, it returns `null`.
 *
 * @param location - The name or address of a location in Bataan
 * @returns The coordinates of the matched location, or `null` if no match is found
 */
export function getBataanCoordinates(location: string): Coordinates | null {
  // No default coordinates - return null if location not found

  // Common locations in Bataan with their coordinates
  const locations: Record<string, Coordinates> = {
    // Cities
    'balanga': { lat: 14.6761, lng: 120.5439 },
    'balanga city': { lat: 14.6761, lng: 120.5439 },
    // Municipalities
    'dinalupihan': { lat: 14.8775, lng: 120.4667 },
    'hermosa': { lat: 14.8333, lng: 120.5000 },
    'orani': { lat: 14.8004, lng: 120.5292 },
    'samal': { lat: 14.7667, lng: 120.5167 },
    'samal bataan': { lat: 14.7667, lng: 120.5167 }, // More specific match for Samal, Bataan
    'abucay': { lat: 14.7333, lng: 120.5333 },
    'pilar': { lat: 14.6667, lng: 120.5667 },
    'orion': { lat: 14.6333, lng: 120.5833 },
    'limay': { lat: 14.5667, lng: 120.6000 },
    'mariveles': { lat: 14.4333, lng: 120.4833 },
    'bagac': { lat: 14.6000, lng: 120.3833 },
    'morong': { lat: 14.6833, lng: 120.2667 },
    // Common places
    'bataan peninsula state university': { lat: 14.6417, lng: 120.5419 },
    'bpsu': { lat: 14.6417, lng: 120.5419 },
    'the peninsula': { lat: 14.6761, lng: 120.5439 },
    // Specific business locations
    'rainbow paws cremation center': { lat: 14.7667, lng: 120.5167 }, // Samal, Bataan location
  };
  
  if (!location) {
    return null;
  }

  // Convert to lowercase for better matching
  const normalizedLocation = location.toLowerCase()
    .replace(/[,\s]+philippines/g, '')
    .replace(/\d{4}/, '')  // Remove postal codes
    .replace(/\s+/g, ' ')
    .trim();

  // Try exact match first (including with "bataan")
  const exactMatch = locations[normalizedLocation];
  if (exactMatch) {
    return exactMatch;
  }

  // Try without "bataan" for broader matching
  const withoutBataan = normalizedLocation.replace(/bataan/g, '').replace(/\s+/g, ' ').trim();
  const withoutBataanMatch = locations[withoutBataan];
  if (withoutBataanMatch) {
    return withoutBataanMatch;
  }

  // Check if the location contains any of the known locations
  for (const [key, coords] of Object.entries(locations)) {
    if (normalizedLocation.includes(key) || withoutBataan.includes(key)) {
      return coords;
    }
  }

  // Return null if no match is found - don't use default coordinates
  return null;
}
