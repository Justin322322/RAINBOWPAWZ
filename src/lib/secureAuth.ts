import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';
import { generateToken } from '@/lib/jwt';

/**
 * Verify secure authentication for API routes
 * Simplified version - only includes functions that are actually used
 */
export async function verifySecureAuth(request: NextRequest): Promise<{ userId: string; accountType: string } | null> {
  try {
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return null;
    }

    const authData = await parseAuthToken(authToken);

    if (!authData) {
      return null;
    }

    // Extract userId ensuring it is a string from either 'sub' (standard) or 'userId' (legacy) claim
    const extractedUserId =
      typeof (authData as any).sub === 'string'
        ? (authData as any).sub
        : typeof (authData as any).userId === 'string'
        ? (authData as any).userId
        : null;

    if (!extractedUserId) {
      return null;
    }

    // Validate accountType is a string and one of the allowed values
    const accountTypeCandidate = (authData as any).accountType;
    const allowedAccountTypes = ['user', 'admin', 'business'] as const;
    const isValidAccountType =
      typeof accountTypeCandidate === 'string' &&
      (allowedAccountTypes as readonly string[]).includes(accountTypeCandidate);

    if (!isValidAccountType) {
      return null;
    }

    return {
      userId: extractedUserId,
      accountType: accountTypeCandidate,
      // Email removed from return type for security - use dedicated API endpoints for user data
    };
  } catch {
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
  _email?: string // Email parameter kept for API compatibility but not used
): void {
  const cookieMaxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  const currentTime = Math.floor(Date.now() / 1000);

  // Create a signed JWT token with standard claims
  const payload = {
    sub: userId, // Standard JWT subject claim
    accountType, // Custom claim for account type
    iat: currentTime, // Standard JWT issued at claim
    exp: currentTime + cookieMaxAge, // Standard JWT expiration claim
    // Note: aud and iss are set in generateToken options
    // Email removed from payload for security - use API endpoints to get user data
  };

  const token = generateToken(payload);

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: cookieMaxAge,
    path: '/',
  });
}

/**
 * Clear secure authentication cookies
 */
export function clearSecureAuthCookies(response: NextResponse): void {
  response.cookies.delete({ name: 'auth_token', path: '/' });
}
