import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyToken, JWTPayload } from './jwt';
import crypto from 'crypto';

// Security configuration
const AUTH_COOKIE_NAME = 'secure_auth_token';
const CSRF_COOKIE_NAME = 'csrf_token';
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Generate a secure CSRF token
 */
function generateCSRFToken(): string {
  // Generate 32 bytes of cryptographically secure random data
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Set secure authentication cookies
 * This replaces all the insecure client-side token storage
 */
export function setSecureAuthCookies(
  response: NextResponse,
  userId: string,
  accountType: 'user' | 'admin' | 'business',
  email: string
): void {
  // Generate JWT token
  const token = generateToken({
    userId,
    accountType,
    email
  });

  // Generate CSRF token
  const csrfToken = generateCSRFToken();

  // Set httpOnly authentication cookie (secure, not accessible to client JS)
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,           // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',         // CSRF protection
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
    // In development, set domain to localhost to work across ports
    ...(process.env.NODE_ENV === 'development' && { domain: 'localhost' })
  });

  // Set CSRF token cookie (accessible to client for header inclusion)
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,         // Client needs access for CSRF headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
    // In development, set domain to localhost to work across ports
    ...(process.env.NODE_ENV === 'development' && { domain: 'localhost' })
  });
}

/**
 * Get authentication token from secure httpOnly cookie
 * Updated to support backward compatibility with Authorization headers and legacy cookies
 */
export function getAuthTokenFromRequest(request: NextRequest): string | null {
  // First try the secure auth token (new secure method)
  const secureToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (secureToken) {
    return secureToken;
  }

  // Fallback 1: Authorization header (for API calls with Bearer tokens)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract token from "Bearer <token>" format
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      return bearerMatch[1];
    }
  }

  // Fallback 2: Legacy auth_token cookie (for backward compatibility)
  const legacyToken = request.cookies.get('auth_token')?.value;
  if (legacyToken) {
    try {
      // Decode the URI component if needed
      return decodeURIComponent(legacyToken);
    } catch {
      // If decoding fails, return as-is
      return legacyToken;
    }
  }

  return null;
}

/**
 * Verify authentication from secure cookies
 * Updated to support backward compatibility with legacy token formats
 */
export function verifySecureAuth(request: NextRequest): JWTPayload | null {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return null;
  }

  // Handle JWT tokens
  if (token.includes('.')) {
    try {
      return verifyToken(token);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  // Handle legacy token format (userId_accountType)
  if (token.includes('_')) {
    const parts = token.split('_');
    if (parts.length === 2) {
      const [userId, accountType] = parts;
      if (userId && accountType) {
        // Convert legacy format to JWTPayload format for consistency
        return {
          userId: userId,
          accountType: accountType as 'user' | 'admin' | 'business',
          email: undefined, // Legacy tokens don't have email
          iat: Math.floor(Date.now() / 1000), // Current timestamp
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
        };
      }
    }
  }

  return null;
}

/**
 * Clear all authentication cookies (logout)
 */
export function clearSecureAuthCookies(response: NextResponse): void {
  // Clear authentication cookie
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    // In development, set domain to localhost to work across ports
    ...(process.env.NODE_ENV === 'development' && { domain: 'localhost' })
  });

  // Clear CSRF cookie
  response.cookies.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    // In development, set domain to localhost to work across ports
    ...(process.env.NODE_ENV === 'development' && { domain: 'localhost' })
  });
}

/**
 * Validate CSRF token (for non-GET requests)
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const cookieCSRF = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerCSRF = request.headers.get('X-CSRF-Token') || 
                     request.headers.get('x-csrf-token');
  
  if (!cookieCSRF || !headerCSRF) {
    return false;
  }

  return cookieCSRF === headerCSRF;
}

/**
 * Authentication middleware helper
 */
export function requireAuth(request: NextRequest): { 
  isAuthenticated: boolean; 
  user: JWTPayload | null; 
  needsCSRF: boolean 
} {
  const user = verifySecureAuth(request);
  const isAuthenticated = user !== null;
  const method = request.method;
  const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  return {
    isAuthenticated,
    user,
    needsCSRF
  };
}

/**
 * Get user information from secure authentication
 * This replaces all the client-side token parsing
 */
export function getSecureUserInfo(request: NextRequest): {
  userId: string | null;
  accountType: string | null;
  email: string | null;
  isAuthenticated: boolean;
} {
  const user = verifySecureAuth(request);
  
  if (!user) {
    return {
      userId: null,
      accountType: null,
      email: null,
      isAuthenticated: false
    };
  }

  return {
    userId: user.userId,
    accountType: user.accountType,
    email: user.email || null,
    isAuthenticated: true
  };
} 