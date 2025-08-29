import { NextRequest } from 'next/server';

/**
 * CORS Utility for Secure Origin Validation
 *
 * Environment Variables:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins (e.g., "https://example.com,https://app.example.com")
 * - NEXT_PUBLIC_APP_URL: Fallback origin for production (automatically included)
 *
 * Security Features:
 * - Validates request Origin header against allowlist
 * - Never uses wildcard '*' when credentials are enabled
 * - Returns 403 for unauthorized origins
 * - Handles preflight OPTIONS requests
 * - Supports wildcard patterns (e.g., *.example.com)
 *
 * Usage:
 * ```typescript
 * // In API routes
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
    allowCredentials: true, // Required for authentication
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
      // Simple wildcard matching (e.g., *.example.com)
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
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

  // Always set credentials to true for authenticated endpoints
  corsHeaders['Access-Control-Allow-Credentials'] = 'true';

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
    'Access-Control-Allow-Origin': origin || '',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
    'Access-Control-Max-Age': config.maxAge.toString(),
  };

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
  } catch {
    // If CORS validation fails, return 403
    return new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}
