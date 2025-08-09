import jwt, { SignOptions } from 'jsonwebtoken';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET_VALUE: string | undefined = JWT_SECRET;

// Maximum allowed expiration time: 30 days in seconds
const MAX_JWT_EXPIRATION_SECONDS = 30 * 24 * 60 * 60; // 30 days
// Default expiration time: 7 days in seconds
const DEFAULT_JWT_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

const JWT_EXPIRES_IN_SECONDS: number = (() => {
  const rawEnv = process.env.JWT_EXPIRES_IN;
  const raw = rawEnv?.trim();
  if (!raw) return DEFAULT_JWT_EXPIRATION_SECONDS;

  let parsedSeconds: number;

  // Try parsing as a direct number first
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    parsedSeconds = asNumber;
  } else {
    // Fallback simple parser for "7d", "12h", "30m" (case-insensitive)
    const match = /^([0-9]+)\s*([smhd])$/i.exec(raw);
    if (!match) return DEFAULT_JWT_EXPIRATION_SECONDS;

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    // Validate the numeric value to prevent overflow
    if (!Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER) {
      console.warn(`Invalid JWT expiration value: ${value}. Using default expiration.`);
      return DEFAULT_JWT_EXPIRATION_SECONDS;
    }

    switch (unit) {
      case 's': parsedSeconds = value; break;
      case 'm': parsedSeconds = value * 60; break;
      case 'h': parsedSeconds = value * 60 * 60; break;
      case 'd': parsedSeconds = value * 24 * 60 * 60; break;
      default: return DEFAULT_JWT_EXPIRATION_SECONDS;
    }
  }

  // Validate against maximum allowed expiration time
  if (parsedSeconds > MAX_JWT_EXPIRATION_SECONDS) {
    console.warn(`JWT expiration time ${parsedSeconds}s exceeds maximum allowed ${MAX_JWT_EXPIRATION_SECONDS}s. Clamping to maximum.`);
    return MAX_JWT_EXPIRATION_SECONDS;
  }

  // Ensure the value is finite and positive
  if (!Number.isFinite(parsedSeconds) || parsedSeconds <= 0) {
    console.warn(`Invalid JWT expiration time: ${parsedSeconds}. Using default expiration.`);
    return DEFAULT_JWT_EXPIRATION_SECONDS;
  }

  return parsedSeconds;
})();

// Prefer explicit environment-based server detection over window checks for SSR/edge runtimes
const IS_SERVER_RUNTIME: boolean = (() => {
  // Explicit override if provided
  if (process.env.IS_SERVER === 'true') return true;
  if (process.env.IS_SERVER === 'false') return false;
  // NEXT_RUNTIME is defined on the server (nodejs or edge)
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') return true;
  // Node.js environment
  if (typeof process !== 'undefined' && typeof process.versions !== 'undefined' && typeof process.versions.node === 'string') {
    return true;
  }
  // Fallback: assume non-server if not explicitly marked
  return false;
})();

// Validate JWT secret at startup - SERVER SIDE ONLY
if (IS_SERVER_RUNTIME) {
  // Only validate on server side
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }

  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

export interface JWTPayload {
  /** Standard JWT subject claim - contains the user ID */
  sub: string;
  /** Custom claim for account type */
  accountType: 'user' | 'admin' | 'business';
  /** Standard JWT issued at claim */
  iat?: number;
  /** Standard JWT expiration claim */
  exp?: number;
  /** Standard JWT audience claim */
  aud?: string;
  /** Standard JWT issuer claim */
  iss?: string;

  // Legacy support - will be removed in future versions
  /** @deprecated Use 'sub' instead */
  userId?: string;
}

/**
 * Generate a signed JWT token for authentication (SERVER-SIDE ONLY)
 */
export function generateToken(payload: JWTPayload, options?: SignOptions): string {
  if (!IS_SERVER_RUNTIME) {
    throw new Error('generateToken must not be called on the client side');
  }

  if (!JWT_SECRET_VALUE) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }

  // Prevent callers from overriding critical claims via options **and** payload
  const { issuer: _ignoredIssuer, audience: _ignoredAudience, expiresIn: _ignoredExpiresIn, ...safeOptions } = options ?? {};

  // Remove reserved claims from the payload so we control them centrally
  const {
    exp: _ignoredExp,
    iat: _ignoredIat,
    iss: _ignoredIss,
    aud: _ignoredAud,
    nbf: _ignoredNbf,
    ...sanitizedPayload
  } = (payload as unknown) as Record<string, unknown>;

  const signOptions: SignOptions = {
    ...safeOptions,
    issuer: 'rainbow-paws',
    audience: 'rainbow-paws-users',
    expiresIn: JWT_EXPIRES_IN_SECONDS,
  };

  return jwt.sign(sanitizedPayload, JWT_SECRET_VALUE as string, signOptions);
}

/**
 * Verify and decode a JWT token (SERVER-SIDE ONLY)
 */
export function verifyToken(token: string): JWTPayload | null {
  // Check if we're in a browser environment
  if (!IS_SERVER_RUNTIME) {
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
      // Use the same max age as we used when signing, to keep behavior consistent
      maxAge: JWT_EXPIRES_IN_SECONDS
    }) as JWTPayload;

    // Additional validation for token structure
    // Support both new 'sub' claim and legacy 'userId' for backward compatibility
    const userId = decoded.sub || decoded.userId;
    if (!userId || !decoded.accountType) {
      throw new Error('Invalid token payload structure');
    }

    // Ensure the payload has the userId field for backward compatibility
    if (!decoded.userId && decoded.sub) {
      decoded.userId = decoded.sub;
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
  if (!IS_SERVER_RUNTIME) {
    console.error('SECURITY WARNING: Client-side JWT decoding is disabled. Use server-side API endpoints instead.');
    return null;
  }
  
  // Still allow server-side usage but discourage it
  console.warn('DEPRECATED: Use verifyToken() for server-side JWT processing');
  return null;
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


