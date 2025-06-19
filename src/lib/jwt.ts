import jwt, { SignOptions } from 'jsonwebtoken';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validate JWT secret at startup - SERVER SIDE ONLY
if (typeof window === 'undefined') {
  // Only validate on server side
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }

  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

export interface JWTPayload {
  userId: string;
  accountType: 'user' | 'admin' | 'business';
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token (SERVER-SIDE ONLY)
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    console.error('generateToken should not be called on the client side. The server should generate tokens.');
    throw new Error('generateToken is not available on the client side');
  }

  // Server-side JWT_SECRET validation
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }

  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'rainbow-paws',
    audience: 'rainbow-paws-users'
  } as SignOptions;

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token (SERVER-SIDE ONLY)
 */
export function verifyToken(token: string): JWTPayload | null {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    console.error('verifyToken should not be called on the client side. Use decodeTokenUnsafe for client-side token parsing.');
    return null;
  }

  // Server-side JWT_SECRET validation
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rainbow-paws',
      audience: 'rainbow-paws-users',
      clockTolerance: 30, // Allow 30 seconds of clock skew
      ignoreNotBefore: false,
      maxAge: '7d' // Maximum age validation
    }) as JWTPayload;

    // Additional validation for token structure
    if (!decoded.userId || !decoded.accountType) {
      throw new Error('Invalid token payload structure');
    }

    return decoded;
  } catch (error) {
    // Secure error handling - log without exposing sensitive details
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'JsonWebTokenError') {
        // Log error type only, not the actual token content
        console.error('JWT verification failed: Invalid token format');
      } else if (error.name === 'TokenExpiredError') {
        console.error('JWT token expired');
      } else if (error.name === 'NotBeforeError') {
        console.error('JWT token not active yet');
      } else {
        console.error('JWT verification error: Unknown error type');
      }
    } else {
      console.error('JWT verification error: Unexpected error format');
    }
    return null;
  }
}

/**
 * DEPRECATED - CLIENT-SIDE TOKEN DECODING REMOVED FOR SECURITY
 * 
 * Client-side JWT decoding is a security risk as it exposes sensitive user data
 * and can be tampered with. Use server-side API endpoints to get user information.
 * 
 * For client-side user data, create secure API endpoints like:
 * - GET /api/user/profile - for user information
 * - GET /api/auth/check - for authentication status
 */
export function decodeTokenUnsafe(_token: string): JWTPayload | null {
  if (typeof window !== 'undefined') {
    console.error('SECURITY WARNING: Client-side JWT decoding is disabled. Use server-side API endpoints instead.');
    return null;
  }
  
  // Still allow server-side usage but discourage it
  console.warn('DEPRECATED: Use verifyToken() for server-side JWT processing');
  return null;
}

/**
 * Refresh a JWT token (generate new token with updated expiration)
 * SERVER-SIDE ONLY
 */
export function refreshToken(token: string): string | null {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    console.error('refreshToken should not be called on the client side.');
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  // Remove iat and exp from payload for new token
  const { iat: _iat, exp: _exp, ...payload } = decoded;
  return generateToken(payload);
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (_error) {
    // Log error for debugging but don't expose sensitive data
    console.error('Token expiration check failed');
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
}
