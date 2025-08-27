import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const type = searchParams.get('type'); // 'forward' or 'reverse'

    if (!address && !(lat && lon)) {
      return NextResponse.json(
        { error: 'Missing required parameters: address for forward geocoding or lat/lon for reverse geocoding' },
        { status: 400 }
      );
    }

    let url: string;
    let params: URLSearchParams;

    if (type === 'reverse' || (lat && lon)) {
      // Reverse geocoding
      params = new URLSearchParams({
        format: 'json',
        lat: lat!,
        lon: lon!,
        countrycodes: 'ph',
        addressdetails: '1'
      });
      url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
    } else {
      // Forward geocoding
      params = new URLSearchParams({
        format: 'json',
        q: address!,
        countrycodes: 'ph',
        viewbox: '119.8,14.0,121.5,15.5',
        bounded: '1',
        limit: '3',
        addressdetails: '1',
        dedupe: '1'
      });
      url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    }

    console.log(`🗺️ [Geocoding API] Making request to: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`🗺️ [Geocoding API] Nominatim responded with status: ${response.status}`);
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited', code: 'RATE_LIMITED' },
          { status: 429 }
        );
      }
      
      // Try to get error details from response
      let errorDetails = '';
      try {
        const errorData = await response.text();
        errorDetails = errorData ? ` - ${errorData}` : '';
      } catch (e) {
        // Ignore error reading response body
      }
      
      return NextResponse.json(
        { error: `Geocoding service error: ${response.status}${errorDetails}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`🗺️ [Geocoding API] Successfully received data for ${type === 'reverse' ? 'reverse' : 'forward'} geocoding`);

    // Add CORS headers
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('🗺️ [Geocoding API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
