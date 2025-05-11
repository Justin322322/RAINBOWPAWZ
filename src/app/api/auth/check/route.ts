import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Get the auth token cookie
    const cookiesStore = await cookies();
    const authCookie = cookiesStore.get('auth_token');

    if (!authCookie || !authCookie.value) {
      return NextResponse.json({
        authenticated: false,
        message: 'No authentication token found'
      });
    }

    // Try to decode the cookie value
    let decodedValue;
    try {
      decodedValue = decodeURIComponent(authCookie.value);
    } catch (error) {
      decodedValue = authCookie.value;
    }

    // Parse the token
    const parts = decodedValue.split('_');

    if (parts.length !== 2) {
      return NextResponse.json({
        authenticated: false,
        message: 'Invalid authentication token format'
      });
    }

    const userId = parts[0];
    const accountType = parts[1];

    return NextResponse.json({
      authenticated: true,
      userId,
      accountType
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check authentication'
    }, { status: 500 });
  }
}
