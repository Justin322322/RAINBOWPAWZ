/**
 * Utility functions for handling geolocation
 */

import { geocodingService } from '@/utils/geocoding';

// Interface for location data
export interface LocationData {
  address: string;
  coordinates?: [number, number]; // [latitude, longitude]
  source: 'geolocation' | 'profile' | 'default';
  accuracy?: 'high' | 'medium' | 'low';
  confidence?: number;
}

/**
 * Get the user's current location using the browser's Geolocation API
 * and reverse geocode it to get the address
 *
 * @returns Promise with the user's location data
 */
export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported by the browser
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    // Get the current position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const coordinates: [number, number] = [latitude, longitude];

          // Reverse geocode the coordinates to get the address
          const address = await reverseGeocode(coordinates);

          resolve({
            address,
            coordinates,
            source: 'geolocation'
          });
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Reverse geocode coordinates to get an address
 *
 * @param coordinates [latitude, longitude]
 * @returns Promise with the address string
 */
export const reverseGeocode = async (coordinates: [number, number]): Promise<string> => {
  try {
    const [latitude, longitude] = coordinates;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&countrycodes=ph`,
      {
        headers: {
          'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to reverse geocode coordinates');
    }

    const data = await response.json();

    // Format the address
    let address = '';

    if (data.address) {
      const parts = [];

      // Add city/town/village
      if (data.address.city) {
        parts.push(data.address.city);
      } else if (data.address.town) {
        parts.push(data.address.town);
      } else if (data.address.village) {
        parts.push(data.address.village);
      }

      // Add state/province
      if (data.address.state || data.address.province) {
        parts.push(data.address.state || data.address.province);
      }

      // Add country
      if (data.address.country) {
        parts.push(data.address.country);
      }

      address = parts.join(', ');
    }

    // If we couldn't parse the address, use the display_name
    if (!address && data.display_name) {
      address = data.display_name;
    }

    return address || 'Unknown location';
  } catch (error) {
    return 'Unknown location';
  }
};

/**
 * Geocode an address to coordinates using the enhanced geocoding service
 *
 * @param address Address to geocode
 * @returns Promise with location data including coordinates and accuracy
 */
export const geocodeAddress = async (address: string): Promise<LocationData> => {
  try {
    const result = await geocodingService.geocodeAddress(address);

    return {
      address: result.formattedAddress,
      coordinates: result.coordinates,
      source: 'profile',
      accuracy: result.accuracy,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('Geocoding error:', error);

    // Return default location with low confidence
    return {
      address: 'Balanga City, Bataan, Philippines (Default Location)',
      coordinates: [14.6742, 120.5434],
      source: 'default',
      accuracy: 'low',
      confidence: 0.1
    };
  }
};

/**
 * Get the user's location with fallbacks
 * 1. Use profile address if available
 * 2. Fall back to default location
 *
 * @param userData User data object that might contain an address
 * @param defaultLocation Default location to use as a last resort
 * @returns Promise with the user's location data
 */
export const getUserLocation = async (
  userData?: any,
  defaultLocation: string = 'Balanga City, 2100 Bataan, Philippines'
): Promise<LocationData> => {
  // First priority: Use the user's profile address
  if (userData?.address) {
    return {
      address: userData.address,
      source: 'profile'
    };
  }

  // If no profile address, use the default location
  return {
    address: defaultLocation,
    source: 'default'
  };
};
