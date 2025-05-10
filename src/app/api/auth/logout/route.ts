import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the auth token cookie - try multiple approaches to ensure it's cleared

    // Approach 1: Set with expires in the past
    cookies().set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Approach 2: Set with max-age=0
    cookies().set({
      name: 'auth_token',
      value: '',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Approach 3: Delete the cookie
    cookies().delete('auth_token');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      error: 'Failed to logout',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
