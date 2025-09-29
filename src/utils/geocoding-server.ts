/**
 * Server-side geocoding utility
 * This contains the geocoding logic extracted from the API route for server-side use
 */

interface Coordinates {
  lat: number;
  lng: number;
}

// Multiple open-source geocoding providers for better accuracy in Philippines
const GEOCODING_PROVIDERS = {
  // Photon (OpenStreetMap-based but much better accuracy)
  photon: {
    name: 'Photon',
    baseUrl: 'https://photon.komoot.io/api',
    priority: 1
  },
  // Pelias (OpenStreetMap-based, high accuracy)
  pelias: {
    name: 'Pelias',
    baseUrl: 'https://api.geocode.earth/v1',
    priority: 2
  },
  // Nominatim (fallback, but with better parameters)
  nominatim: {
    name: 'Nominatim',
    baseUrl: 'https://nominatim.openstreetmap.org',
    priority: 3
  }
};

// Philippines-specific address cleaning and enhancement
function enhancePhilippineAddress(address: string): string {
  let enhanced = address.trim();
  
  // Standardize common Filipino address patterns
  enhanced = enhanced
    .replace(/\bBrgy\.\s*/gi, 'Barangay ')
    .replace(/\bSubd\.\s*/gi, 'Subdivision ')
    .replace(/\bSt\.\s*/gi, 'Street ')
    .replace(/\bAve\.\s*/gi, 'Avenue ')
    .replace(/\bRd\.\s*/gi, 'Road ')
    .replace(/\bBlvd\.\s*/gi, 'Boulevard ')
    .replace(/\bPurok\s*/gi, 'Purok ')
    .replace(/\bSitio\s*/gi, 'Sitio ');

  // Add Philippines context if not present
  if (!enhanced.toLowerCase().includes('philippines')) {
    enhanced = `${enhanced}, Philippines`;
  }

  // Add region context for better accuracy
  if (enhanced.toLowerCase().includes('bataan')) {
    if (!enhanced.toLowerCase().includes('central luzon')) {
      enhanced = enhanced.replace('Philippines', 'Central Luzon, Philippines');
    }
  }

  // Add postal code context for major cities
  const cityPostalCodes: { [key: string]: string } = {
    'manila': '1000',
    'quezon city': '1100',
    'makati': '1200',
    'pasig': '1600',
    'marikina': '1800',
    'caloocan': '1400',
    'las piñas': '1740',
    'parañaque': '1700',
    'muntinlupa': '1780',
    'taguig': '1630',
    'pateros': '1620',
    'pasay': '1300',
    'malabon': '1470',
    'navotas': '1485',
    'valenzuela': '1440',
    'balanga': '2100',
    'samal': '2103',
    'abucay': '2114',
    'bagac': '2107',
    'hermosa': '2111',
    'orani': '2112',
    'pilar': '2102',
    'morong': '2105',
    'limay': '2103',
    'mariveles': '2105',
    'dinalupihan': '2110'
  };

  for (const [city, postalCode] of Object.entries(cityPostalCodes)) {
    if (enhanced.toLowerCase().includes(city) && !enhanced.match(/\b\d{4}\b/)) {
      enhanced = enhanced.replace('Philippines', `${postalCode} Philippines`);
      break;
    }
  }

  return enhanced;
}

// Geocode with Photon (OpenStreetMap-based but much better)
async function geocodeWithPhoton(address: string): Promise<any[]> {
  const enhancedAddress = enhancePhilippineAddress(address);
  const params = new URLSearchParams({
    q: enhancedAddress,
    limit: '5',
    lang: 'en',
    lat: '14.5995', // Philippines center
    lon: '120.9842',
    radius: '1000' // Focus on Philippines
  });

  const url = `${GEOCODING_PROVIDERS.photon.baseUrl}?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Photon API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.features || data.features.length === 0) {
    return [];
  }

  // Filter and enhance results for Philippines
  return data.features
    .filter((feature: any) => {
      const country = feature.properties?.country;
      return country === 'Philippines' || country === 'PH';
    })
    .map((feature: any) => ({
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      display_name: feature.properties.name || feature.properties.street || feature.properties.city,
      importance: feature.properties.importance || 0.5,
      type: feature.properties.type || 'unknown',
      provider: 'photon',
      confidence: calculatePhotonConfidence(feature)
    }))
    .sort((a: any, b: any) => b.confidence - a.confidence);
}

// Geocode with Pelias (OpenStreetMap-based, high accuracy)
async function geocodeWithPelias(address: string): Promise<any[]> {
  const enhancedAddress = enhancePhilippineAddress(address);
  const params = new URLSearchParams({
    text: enhancedAddress,
    size: '5',
    lang: 'en',
    focus: '14.5995,120.9842', // Focus on Philippines center
    boundary: 'country:ph', // Restrict to Philippines
    layers: 'address,venue,neighbourhood,borough,localadmin,locality,county,region,country'
  });

  const url = `${GEOCODING_PROVIDERS.pelias.baseUrl}/search?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Pelias API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.features || data.features.length === 0) {
    return [];
  }

  return data.features
    .filter((feature: any) => {
      const country = feature.properties?.country;
      return country === 'Philippines' || country === 'PH';
    })
    .map((feature: any) => ({
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      display_name: feature.properties.name || feature.properties.street || feature.properties.city,
      importance: feature.properties.confidence || 0.5,
      type: feature.properties.layer || 'unknown',
      provider: 'pelias',
      confidence: calculatePeliasConfidence(feature)
    }))
    .sort((a: any, b: any) => b.confidence - a.confidence);
}

// Enhanced Nominatim with better parameters for Philippines
async function geocodeWithNominatim(address: string): Promise<any[]> {
  const enhancedAddress = enhancePhilippineAddress(address);
  const params = new URLSearchParams({
    format: 'json',
    q: enhancedAddress,
    countrycodes: 'ph',
    viewbox: '119.8,14.0,121.5,15.5', // Focus on Luzon
    bounded: '1',
    limit: '5',
    addressdetails: '1',
    dedupe: '1',
    extratags: '1',
    namedetails: '1'
  });

  const url = `${GEOCODING_PROVIDERS.nominatim.baseUrl}/search?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((item: any) => ({
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    display_name: item.display_name,
    importance: parseFloat(item.importance) || 0.5,
    type: item.type || 'unknown',
    provider: 'nominatim',
    confidence: calculateNominatimConfidence(item)
  }));
}

// Confidence calculation functions
function calculatePhotonConfidence(feature: any): number {
  let confidence = 0.5;
  
  if (feature.properties.house_number) confidence += 0.2;
  if (feature.properties.street) confidence += 0.15;
  if (feature.properties.city) confidence += 0.1;
  if (feature.properties.postcode) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}

function calculatePeliasConfidence(feature: any): number {
  let confidence = feature.properties.confidence || 0.5;
  
  if (feature.properties.housenumber) confidence += 0.15;
  if (feature.properties.street) confidence += 0.1;
  if (feature.properties.postalcode) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}

function calculateNominatimConfidence(item: any): number {
  let confidence = parseFloat(item.importance) || 0.5;
  
  if (item.address?.house_number) confidence += 0.15;
  if (item.address?.road) confidence += 0.1;
  if (item.address?.postcode) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}

// Fallback coordinates for common Philippine locations
function getFallbackCoordinates(address: string): any | null {
  const lowerAddress = address.toLowerCase();
  
  // Common Philippine locations with their coordinates
  const fallbackLocations: { [key: string]: { lat: number; lon: number; name: string } } = {
    // Bataan locations - exact addresses from database
    'don manuel banzon avenue': { lat: 14.6767, lon: 120.5363, name: 'Don Manuel Banzon Avenue, Balanga City, Bataan' },
    'capitol drive': { lat: 14.6767, lon: 120.5363, name: 'Capitol Drive, Balanga, Bataan' },
    'balanga': { lat: 14.6767, lon: 120.5363, name: 'Balanga, Bataan' },
    'bataan': { lat: 14.6767, lon: 120.5363, name: 'Bataan Province' },
    'mariveles': { lat: 14.4333, lon: 120.4833, name: 'Mariveles, Bataan' },
    'limay': { lat: 14.5667, lon: 120.6167, name: 'Limay, Bataan' },
    'hermosa': { lat: 14.8333, lon: 120.5000, name: 'Hermosa, Bataan' },
    'dinalupihan': { lat: 14.8667, lon: 120.4667, name: 'Dinalupihan, Bataan' },
    'orani': { lat: 14.8000, lon: 120.5333, name: 'Orani, Bataan' },
    'samal': { lat: 14.7667, lon: 120.5500, name: 'Samal, Bataan' },
    'bagac': { lat: 14.6000, lon: 120.4000, name: 'Bagac, Bataan' },
    'morong': { lat: 14.5333, lon: 120.4667, name: 'Morong, Bataan' },
    'abucay': { lat: 14.7333, lon: 120.5333, name: 'Abucay, Bataan' },
    'pilar': { lat: 14.6667, lon: 120.5833, name: 'Pilar, Bataan' },
    
    // Metro Manila
    'manila': { lat: 14.5995, lon: 120.9842, name: 'Manila City' },
    'quezon city': { lat: 14.6760, lon: 121.0437, name: 'Quezon City' },
    'makati': { lat: 14.5547, lon: 121.0244, name: 'Makati City' },
    'pasig': { lat: 14.5764, lon: 121.0851, name: 'Pasig City' },
    'taguig': { lat: 14.5176, lon: 121.0509, name: 'Taguig City' },
    'marikina': { lat: 14.6507, lon: 121.1029, name: 'Marikina City' },
    'caloocan': { lat: 14.6488, lon: 120.9644, name: 'Caloocan City' },
    'las piñas': { lat: 14.4378, lon: 120.9942, name: 'Las Piñas City' },
    'parañaque': { lat: 14.4793, lon: 121.0198, name: 'Parañaque City' },
    'muntinlupa': { lat: 14.3831, lon: 121.0362, name: 'Muntinlupa City' },
    'pasay': { lat: 14.5378, lon: 120.9896, name: 'Pasay City' },
    
    // Central Luzon
    'central luzon': { lat: 15.4817, lon: 120.5979, name: 'Central Luzon Region' },
    'bulacan': { lat: 14.7942, lon: 120.8794, name: 'Bulacan Province' },
    'pampanga': { lat: 15.0794, lon: 120.6200, name: 'Pampanga Province' },
    'nueva ecija': { lat: 15.5784, lon: 121.1113, name: 'Nueva Ecija Province' },
    'tarlac': { lat: 15.4756, lon: 120.5979, name: 'Tarlac Province' },
    'zambales': { lat: 15.5074, lon: 119.9647, name: 'Zambales Province' }
  };
  
  // Try to find a match with more flexible matching
  for (const [key, coords] of Object.entries(fallbackLocations)) {
    // Check for exact key match or partial match
    if (lowerAddress.includes(key) || 
        (key.includes('balanga') && lowerAddress.includes('balanga')) ||
        (key.includes('capitol') && lowerAddress.includes('capitol')) ||
        (key.includes('don manuel') && lowerAddress.includes('don manuel'))) {
      return {
        lat: coords.lat,
        lon: coords.lon,
        display_name: `${coords.name} (Fallback)`,
        importance: 0.3,
        type: 'fallback',
        provider: 'local_fallback',
        confidence: 0.3
      };
    }
  }
  
  return null;
}

/**
 * Direct geocoding function for server-side use
 * This function uses the same logic as the API route but can be called directly
 */
export async function geocodeAddressDirect(location: string): Promise<Coordinates | null> {
  if (!location || location.trim() === '') {
    return null;
  }

  try {
    let results: any[] = [];
    let errors: string[] = [];

    // Try all providers in order of priority
    const providers = Object.entries(GEOCODING_PROVIDERS)
      .sort(([,a], [,b]) => a.priority - b.priority);

    for (const [key, providerInfo] of providers) {
      try {
        let providerResults: any[] = [];
        
        switch (key) {
          case 'photon':
            providerResults = await geocodeWithPhoton(location);
            break;
          case 'pelias':
            providerResults = await geocodeWithPelias(location);
            break;
          case 'nominatim':
            providerResults = await geocodeWithNominatim(location);
            break;
        }

        if (providerResults.length > 0) {
          results = providerResults;
          console.log(`🗺️ [Server Geocoding] Successfully geocoded with ${providerInfo.name}`);
          break; // Use first successful provider
        }
      } catch (error) {
        const errorMsg = `${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.warn(`🗺️ [Server Geocoding] ${errorMsg}`);
      }
    }

    if (results.length === 0) {
      // Instead of returning null, provide fallback coordinates for common Philippine locations
      const fallbackResult = getFallbackCoordinates(location);
      if (fallbackResult) {
        console.log(`🗺️ [Server Geocoding] Using fallback coordinates for: ${location}`);
        return {
          lat: fallbackResult.lat,
          lng: fallbackResult.lon
        };
      }
      
      // Return fallback coordinates for Philippines center
      return {
        lat: 14.5995, // Philippines center
        lng: 120.9842
      };
    }

    // Use the first (best) result
    const bestResult = results[0];
    
    return {
      lat: parseFloat(bestResult.lat),
      lng: parseFloat(bestResult.lon)
    };
  } catch (error) {
    console.error(`🗺️ [Server Geocoding] Unexpected error for "${location}":`, error);
    return null;
  }
}
