import { NextResponse } from 'next/server';
import { clearSecureAuthCookies } from '@/lib/secureAuth';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear all secure authentication cookies (auth token + CSRF token)
    clearSecureAuthCookies(response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      error: 'Failed to logout',
      message: 'An error occurred during logout'
    }, { status: 500 });
  }
}
