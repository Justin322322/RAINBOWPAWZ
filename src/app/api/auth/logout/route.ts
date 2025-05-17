import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the auth token cookie - try multiple approaches to ensure it's cleared
    const cookiesStore = await cookies();

    // Approach 1: Set with expires in the past
    cookiesStore.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Approach 2: Set with max-age=0
    cookiesStore.set({
      name: 'auth_token',
      value: '',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Approach 3: Delete the cookie
    cookiesStore.delete('auth_token');

    // Approach 4: Try with different paths
    cookiesStore.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/user',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    cookiesStore.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/admin',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    cookiesStore.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/cremation',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to logout',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
