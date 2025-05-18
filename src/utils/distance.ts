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
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  // If either coordinate is missing or invalid, return a default distance
  if (!coord1 || !coord2 || !coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
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
  
  return parseFloat(distance.toFixed(1));
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
 * Get coordinates for a location in Bataan, Philippines
 * This is a fallback function that returns coordinates for common locations in Bataan
 * @param location Location name or address
 * @returns Coordinates (latitude, longitude)
 */
export function getBataanCoordinates(location: string): Coordinates | null {
  // Default coordinates for Bataan Peninsula State University
  const defaultCoords = { lat: 14.6417, lng: 120.5419 };
  
  // Common locations in Bataan with their coordinates
  const locations: Record<string, Coordinates> = {
    'balanga': { lat: 14.6761, lng: 120.5439 },
    'balanga city': { lat: 14.6761, lng: 120.5439 },
    'orani': { lat: 14.8004, lng: 120.5292 },
    'dinalupihan': { lat: 14.8775, lng: 120.4667 },
    'hermosa': { lat: 14.8333, lng: 120.5000 },
    'abucay': { lat: 14.7333, lng: 120.5333 },
    'samal': { lat: 14.7667, lng: 120.5167 },
    'pilar': { lat: 14.6667, lng: 120.5667 },
    'orion': { lat: 14.6333, lng: 120.5833 },
    'limay': { lat: 14.5667, lng: 120.6000 },
    'mariveles': { lat: 14.4333, lng: 120.4833 },
    'bagac': { lat: 14.6000, lng: 120.3833 },
    'morong': { lat: 14.6833, lng: 120.2667 },
    'bataan peninsula state university': { lat: 14.6417, lng: 120.5419 },
    'bpsu': { lat: 14.6417, lng: 120.5419 },
  };
  
  if (!location) return defaultCoords;
  
  // Convert to lowercase and remove common words for better matching
  const normalizedLocation = location.toLowerCase()
    .replace(', philippines', '')
    .replace('philippines', '')
    .replace('2100', '')
    .replace('bataan', '')
    .trim();
  
  // Check if the location contains any of the known locations
  for (const [key, coords] of Object.entries(locations)) {
    if (normalizedLocation.includes(key)) {
      return coords;
    }
  }
  
  // Return default coordinates if no match is found
  return defaultCoords;
}
