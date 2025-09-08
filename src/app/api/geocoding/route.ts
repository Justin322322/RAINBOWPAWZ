import { NextRequest, NextResponse } from 'next/server';

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
    baseUrl: 'https://nominatim.openstreetmu.org',
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const type = searchParams.get('type'); // 'forward' or 'reverse'
    const provider = searchParams.get('provider'); // Specific provider to use

    if (!address && !(lat && lon)) {
      return NextResponse.json(
        { error: 'Missing required parameters: address for forward geocoding or lat/lon for reverse geocoding' },
        { status: 400 }
      );
    }

    // Reverse geocoding (coordinates to address)
    if (type === 'reverse' || (lat && lon)) {
      const params = new URLSearchParams({
        format: 'json',
        lat: lat!,
        lon: lon!,
        countrycodes: 'ph',
        addressdetails: '1'
      });

      const url = `${GEOCODING_PROVIDERS.nominatim.baseUrl}/reverse?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nominatim reverse geocoding error: ${response.status}`);
      }

      const data = await response.json();
      
      return NextResponse.json([data]);
    }

    // Forward geocoding (address to coordinates)
    let results: any[] = [];
    let errors: string[] = [];

    // If specific provider requested, try only that one
    if (provider && GEOCODING_PROVIDERS[provider as keyof typeof GEOCODING_PROVIDERS]) {
      try {
        switch (provider) {
          case 'photon':
            results = await geocodeWithPhoton(address!);
            break;
          case 'pelias':
            results = await geocodeWithPelias(address!);
            break;
          case 'nominatim':
            results = await geocodeWithNominatim(address!);
            break;
        }
      } catch (error) {
        errors.push(`${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Try all providers in order of priority
      const providers = Object.entries(GEOCODING_PROVIDERS)
        .sort(([,a], [,b]) => a.priority - b.priority);

      for (const [key, providerInfo] of providers) {
        try {
          let providerResults: any[] = [];
          
          switch (key) {
            case 'photon':
              providerResults = await geocodeWithPhoton(address!);
              break;
            case 'pelias':
              providerResults = await geocodeWithPelias(address!);
              break;
            case 'nominatim':
              providerResults = await geocodeWithNominatim(address!);
              break;
          }

          if (providerResults.length > 0) {
            results = providerResults;
            console.log(`🗺️ [Geocoding API] Successfully geocoded with ${providerInfo.name}`);
            break; // Use first successful provider
          }
        } catch (error) {
          const errorMsg = `${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.warn(`🗺️ [Geocoding API] ${errorMsg}`);
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { 
          error: 'No geocoding results found',
          details: errors.length > 0 ? errors : 'All providers failed',
          suggestions: [
            'Check if the address is correct',
            'Try adding more specific details (street name, barangay)',
            'Ensure the address is in the Philippines'
          ]
        },
        { status: 404 }
      );
    }

    // Add CORS headers
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(JSON.stringify(results), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('🗺️ [Geocoding API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Check your address format',
          'Verify the address is in the Philippines',
          'Try again in a few moments'
        ]
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
