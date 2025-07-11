import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';

/**
 * Verify secure authentication for API routes
 * Simplified version - only includes functions that are actually used
 */
export async function verifySecureAuth(request: NextRequest): Promise<{ userId: string; accountType: string; email?: string } | null> {
  try {
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return null;
    }

    const authData = await parseAuthToken(authToken);

    if (!authData) {
      return null;
    }

    return {
      userId: authData.userId,
      accountType: authData.accountType,
      email: authData.email
    };
  } catch (error) {
    return null;
  }
}

/**
 * Set secure authentication cookies
 */
export function setSecureAuthCookies(
  response: NextResponse,
  userId: string,
  accountType: 'user' | 'admin' | 'business',
  email?: string
): void {
  // Create a simple token (in production, use proper JWT)
  const token = `${userId}:${accountType}:${email || ''}`;
  
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  });
}

/**
 * Clear secure authentication cookies
 */
export function clearSecureAuthCookies(response: NextResponse): void {
  response.cookies.delete('auth_token');
}
