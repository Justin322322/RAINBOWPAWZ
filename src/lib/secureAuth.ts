import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyToken, JWTPayload } from './jwt';
import crypto from 'crypto';

// Security configuration
const AUTH_COOKIE_NAME = 'auth_token';
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
    path: '/'
  });

  // Set CSRF token cookie (accessible to client for header inclusion)
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,         // Client needs access for CSRF headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/'
  });
}

/**
 * Get authentication token from secure httpOnly cookie
 */
export function getAuthTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
}

/**
 * Verify authentication from secure cookies
 */
export function verifySecureAuth(request: NextRequest): JWTPayload | null {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
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
    path: '/'
  });

  // Clear CSRF cookie
  response.cookies.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
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