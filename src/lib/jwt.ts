import jwt, { SignOptions } from 'jsonwebtoken';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

  if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.warn('WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!');
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

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rainbow-paws',
      audience: 'rainbow-paws-users'
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Safe error handling that works in all environments
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'JsonWebTokenError') {
        console.error('JWT verification failed:', (error as any).message);
      } else if (error.name === 'TokenExpiredError') {
        console.error('JWT token expired:', (error as any).message);
      } else {
        console.error('JWT verification error:', error);
      }
    } else {
      console.error('JWT verification error:', error);
    }
    return null;
  }
}

/**
 * Decode a JWT token without verification (CLIENT-SAFE)
 * Use this for client-side token parsing when you don't need verification
 * This implementation doesn't use the jsonwebtoken library to avoid browser compatibility issues
 */
export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    // Split the JWT token into its three parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);

    // Decode base64
    const decodedPayload = atob(paddedPayload);

    // Parse JSON
    const parsedPayload = JSON.parse(decodedPayload) as JWTPayload;

    return parsedPayload;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
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
  const { iat, exp, ...payload } = decoded;
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
  } catch (error) {
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
