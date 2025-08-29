import { NextRequest } from 'next/server';

/**
 * CORS Utility for Secure Origin Validation
 *
 * Environment Variables:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins (e.g., "https://example.com,https://app.example.com")
 * - NEXT_PUBLIC_APP_URL: Fallback origin for production (automatically included)
 * - CORS_ALLOW_CREDENTIALS: Enable/disable credentials support (true/false, defaults to false for security)
 *   Accepted values: 'true', 'false', '1', '0', 'yes', 'no', 'on', 'off'
 *
 * Security Features:
 * - Validates request Origin header against allowlist
 * - Never uses wildcard '*' when credentials are enabled
 * - Returns 403 for unauthorized origins
 * - Handles preflight OPTIONS requests
 * - Supports wildcard patterns (e.g., *.example.com)
 * - Configurable credentials support with safe defaults (false)
 *
 * Usage:
 * ```typescript
 * // Set CORS_ALLOW_CREDENTIALS=true in your environment to enable credentials
 * // Defaults to false for security - only enable when needed
 * import { createCORSHeaders, handleOptionsRequest } from '@/utils/cors';
 *
 * export async function GET(request: NextRequest) {
 *   const headers = createCORSHeaders(request, { 'Content-Type': 'application/json' });
 *   return new Response(data, { headers });
 * }
 *
 * export async function OPTIONS(request: NextRequest) {
 *   return handleOptionsRequest(request);
 * }
 * ```
 */

/**
 * Parse boolean environment variable with safe defaults
 * Accepts: 'true', 'false', '1', '0', 'yes', 'no'
 * Returns: boolean value with default fallback
 */
function parseBooleanEnv(envValue: string | undefined, defaultValue: boolean = false): boolean {
  if (!envValue) return defaultValue;

  const normalized = envValue.toLowerCase().trim();
  const truthyValues = ['true', '1', 'yes', 'on'];
  const falsyValues = ['false', '0', 'no', 'off'];

  if (truthyValues.includes(normalized)) return true;
  if (falsyValues.includes(normalized)) return false;

  // Log warning for invalid values but return default
  console.warn(`Invalid boolean value for CORS_ALLOW_CREDENTIALS: "${envValue}". Using default: ${defaultValue}`);
  return defaultValue;
}

/**
 * CORS configuration interface
 */
interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

/**
 * Get CORS configuration from environment variables
 */
function getCORSConfig(): CORSConfig {
  // Read allowed origins from environment
  const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  // Parse comma-separated origins and clean them
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(origin => {
      // Remove trailing slash if present
      return origin.replace(/\/$/, '');
    });

  // Ensure localhost variants are included in development
  if (process.env.NODE_ENV !== 'production') {
    const localhostVariants = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];

    for (const localhost of localhostVariants) {
      if (!allowedOrigins.includes(localhost)) {
        allowedOrigins.push(localhost);
      }
    }
  }

  return {
    allowedOrigins,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'X-Api-Version',
      'X-CSRF-Token'
    ],
    // Read allowCredentials from environment variable with safe default (false)
    // Set CORS_ALLOW_CREDENTIALS=true to enable credentials, defaults to false for security
    allowCredentials: parseBooleanEnv(process.env.CORS_ALLOW_CREDENTIALS, false),
    maxAge: 86400 // 24 hours
  };
}

/**
 * Validate if the request origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  // Check exact matches first
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check if origin matches any wildcard patterns
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes('*')) {
      try {
        // If allowedOrigin contains no '*' (shouldn't happen here but for safety)
        if (!allowedOrigin.includes('*')) {
          if (allowedOrigin === origin) {
            return true;
          }
          continue;
        }

        // First escape all regex metacharacters except the wildcard '*'
        // This prevents regex injection attacks
        const escaped = allowedOrigin.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        // Then replace the literal '*' with '.*' to implement wildcard behavior
        const pattern = escaped.replace(/\*/g, '.*');
        // Build the anchored pattern with ^...$ to match the entire origin
        const regex = new RegExp(`^${pattern}$`);

        if (regex.test(origin)) {
          return true;
        }
      } catch (error) {
        // Handle invalid regex patterns gracefully
        console.warn(`Invalid regex pattern for origin: ${allowedOrigin}`, error);
        // Fall back to exact string match for security
        if (allowedOrigin === origin) {
          return true;
        }
      }
    }
  }

  return false; // Add missing return statement
}



/**
 * Create CORS headers for a response
 */
export function createCORSHeaders(request: NextRequest, customHeaders: Record<string, string> = {}): Record<string, string> {
  const config = getCORSConfig();
  const origin = request.headers.get('origin');
  const isAllowed = isOriginAllowed(origin, config.allowedOrigins);

  const corsHeaders: Record<string, string> = {
    ...customHeaders
  };

  // Only set origin if it's in the allowlist (never use '*' when credentials are true)
  if (isAllowed && origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  }

  // Set credentials based on configuration (defaults to false for security)
  if (config.allowCredentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  // Important: Add Vary header when response depends on Origin
  corsHeaders['Vary'] = 'Origin';
  return corsHeaders;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptionsRequest(request: NextRequest): Response {
  const config = getCORSConfig();
  const origin = request.headers.get('origin');
  const isAllowed = isOriginAllowed(origin, config.allowedOrigins);

  // If origin is not allowed, return 403
  if (!isAllowed) {
    return new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
    'Access-Control-Max-Age': config.maxAge.toString(),
  };

  // Only set credentials header if configured to allow credentials
  if (config.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Only set Access-Control-Allow-Origin header when origin is valid
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return new Response(null, {
    status: 200,
    headers
  });
}

/**
 * Validate CORS for non-OPTIONS requests
 * Returns the appropriate CORS headers or throws an error
 */
export function validateCORS(request: NextRequest): Record<string, string> {
  const config = getCORSConfig();
  const origin = request.headers.get('origin');
  const isAllowed = isOriginAllowed(origin, config.allowedOrigins);

  if (!isAllowed) {
    throw new Error('CORS policy violation: Origin not allowed');
  }

  return createCORSHeaders(request);
}

/**
 * Enhanced response creation with proper CORS handling
 */
export function createCORSResponse(
  body: any,
  init: ResponseInit = {},
  request: NextRequest
): Response {
  try {
    // Convert HeadersInit to plain object if needed
    let customHeaders: Record<string, string> = {};
    if (init.headers) {
      if (init.headers instanceof Headers) {
        // Convert Headers object to plain object using forEach
        init.headers.forEach((value, key) => {
          customHeaders[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        // Handle array of header tuples
        for (const [key, value] of init.headers) {
          customHeaders[key] = value;
        }
      } else {
        // Already a plain object
        customHeaders = init.headers as Record<string, string>;
      }
    }

    const corsHeaders = createCORSHeaders(request, customHeaders);
    return new Response(body, {
      ...init,
      headers: corsHeaders
    });
  } catch (error) {
    // Check if this is a known CORS validation failure
    if (error instanceof Error && error.message === 'CORS policy violation: Origin not allowed') {
      // If CORS validation fails, return 403 with preserved headers
      const corsHeaders = createCORSHeaders(request);
      return new Response('Forbidden', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders
        }
      });
    } else {
      // For unexpected errors, log and return 500
      console.error('Unexpected error in CORS response creation:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }
}
