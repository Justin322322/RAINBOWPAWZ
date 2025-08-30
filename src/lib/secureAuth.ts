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
    console.log('🔐 [secureAuth] Auth token found:', !!authToken);

    if (!authToken) {
      console.log('❌ [secureAuth] No auth token found');
      return null;
    }

    const authData = await parseAuthToken(authToken);
    console.log('🔐 [secureAuth] Parsed auth data:', !!authData);

    if (!authData) {
      console.log('❌ [secureAuth] Failed to parse auth token');
      return null;
    }

    // Extract userId ensuring it is a string from either 'sub' (standard) or 'userId' (legacy) claim
    const extractedUserId =
      typeof (authData as any).sub === 'string'
        ? (authData as any).sub
        : typeof (authData as any).userId === 'string'
        ? (authData as any).userId
        : null;

    console.log('🔐 [secureAuth] Extracted user ID:', extractedUserId);

    if (!extractedUserId) {
      console.log('❌ [secureAuth] No valid user ID found in token');
      return null;
    }

    // Validate accountType is a string and one of the allowed values
    const accountTypeCandidate = (authData as any).accountType;
    const allowedAccountTypes = ['user', 'admin', 'business'] as const;
    const isValidAccountType =
      typeof accountTypeCandidate === 'string' &&
      (allowedAccountTypes as readonly string[]).includes(accountTypeCandidate);

    console.log('🔐 [secureAuth] Account type validation:', { accountType: accountTypeCandidate, isValid: isValidAccountType });

    if (!isValidAccountType) {
      console.log('❌ [secureAuth] Invalid account type:', accountTypeCandidate);
      return null;
    }

    const result = {
      userId: extractedUserId,
      accountType: accountTypeCandidate,
      // Email removed from return type for security - use dedicated API endpoints for user data
    };

    console.log('✅ [secureAuth] Authentication successful:', result);
    return result;
  } catch (error) {
    console.error('❌ [secureAuth] Error during authentication:', error);
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
    secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test', // Secure in production and test
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Strict in production, lax in development
    maxAge: cookieMaxAge,
    path: '/',
    // Add domain if in production to ensure proper cookie handling
    ...(process.env.NODE_ENV === 'production' && { domain: process.env.VERCEL_URL ? `.${process.env.VERCEL_URL.replace('https://', '')}` : undefined })
  });
}

/**
 * Clear secure authentication cookies
 */
export function clearSecureAuthCookies(response: NextResponse): void {
  response.cookies.delete({ name: 'auth_token', path: '/' });
}
