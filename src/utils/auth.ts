/**
 * Authentication utility functions
 * 
 * MIGRATION NOTICE: 
 * Fixed JWT import issues that were causing silent authentication failures in ES module environments.
 * - parseAuthToken is now async and uses dynamic imports
 * - Added async versions: getUserIdAsync, getAccountTypeAsync, getJWTPayload (now async)
 * - Sync versions of getUserId/getAccountType warn when JWT tokens are encountered and return null
 * 
 * For API routes and server-side code:
 * - Use parseAuthToken (now async) instead of parseAuthTokenSync
 * - Use getUserIdAsync/getAccountTypeAsync for proper JWT verification
 * - Use getJWTPayload (now async) for full JWT payload access
 * 
 * Client-side code can continue using getUserId/getAccountType sync versions
 */
import { NextRequest } from 'next/server';
import { extractTokenFromHeader, type JWTPayload } from '@/lib/jwt';

// Parse auth token and extract user info (for API routes)
export const parseAuthToken = async (authToken: string): Promise<{ userId: string; accountType: string; email?: string } | null> => {
  try {
    let userId: string | null = null;
    let accountType: string | null = null;
    let email: string | undefined = undefined;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      try {
        const { verifyToken } = await import('@/lib/jwt');
        const payload = verifyToken(authToken);
        userId = payload?.userId?.toString() || null;
        accountType = payload?.accountType || null;
        email = payload?.email || undefined;
      } catch (error) {
        console.error('Error verifying JWT token:', error);
        return null;
      }
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
        // Old format doesn't have email
      }
    }

    if (!userId || !accountType) {
      return null;
    }

    return { userId, accountType, email };
  } catch {
    return null;
  }
};





// Get auth token from server request (for API routes)
export const getAuthTokenFromRequest = (request: NextRequest): string | null => {
  // First try Authorization header (preferred for API calls)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      return token;
    }
  }

  // Fallback to cookie-based authentication
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  let authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

  if (!authCookie) {
    return null;
  }

  // Extract the token value and decode it
  const cookieParts = authCookie.split('=');
  if (cookieParts.length < 2) {
    return null;
  }

  const encodedToken = cookieParts[1];
  if (!encodedToken) {
    return null;
  }

  // Decode the URI component
  try {
    const token = decodeURIComponent(encodedToken);

    // Check if it's a JWT token or old format
    if (token.includes('.')) {
      // JWT token format
      return token;
    } else if (token.includes('_')) {
      // Old format - still support for backward compatibility
      return token;
    }

    return null;
  } catch {
    return null;
  }
};



// Get the auth token from cookies
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    // Get cookies - removed secure_auth_token check since it's httpOnly and not accessible client-side
    const cookies = document.cookie.split(';');

    // Check for legacy auth_token cookie
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

    if (authCookie) {
      // Extract the token value and decode it
      const encodedToken = authCookie.split('=')[1];
      if (encodedToken) {
        // Decode the URI component
        const token = decodeURIComponent(encodedToken);

        // Validate token format (JWT tokens contain dots, old format contains underscores)
        if (token && (token.includes('.') || token.includes('_'))) {
          return token;
        }
      }
    }

    // Check for current port - if it's 3000, try the localStorage backup
    if (typeof window !== 'undefined' && window.location.port === '3000') {
      try {
        const localStorageToken = localStorage.getItem('auth_token_3000');
        if (localStorageToken && (localStorageToken.includes('.') || localStorageToken.includes('_'))) {
          return localStorageToken;
        }
      } catch {
        // Silently fail if localStorage is not available
      }
    }

    // If cookie not found or invalid, try sessionStorage as fallback
    const sessionToken = sessionStorage.getItem('auth_token');
    if (sessionToken && (sessionToken.includes('.') || sessionToken.includes('_'))) {
      // If found in sessionStorage, try to restore the cookie
      if (sessionToken.includes('_')) {
        // Old format
        const [userId, accountType] = sessionToken.split('_');
        if (userId && accountType) {
          // Don't call setAuthToken here to avoid infinite recursion
          // Just return the token from sessionStorage
          return sessionToken;
        }
      } else {
        // JWT format
        return sessionToken;
      }
    }

    return null;
  } catch {
    return null;
  }
};

// Get user ID from auth token (supports both JWT and old format)
export const getUserId = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;

  // For JWT tokens, we can't decode client-side safely
  // Return null and let components use getUserIdAsync() for JWT tokens
  if (token.includes('.')) {
    console.warn('JWT token detected in getUserId - use getUserIdAsync() for proper verification');
    return null;
  }

  // Legacy token format
  if (token.includes('_')) {
    const parts = token.split('_');
    if (parts.length === 2) {
      return parts[0];
    }
  }

  return null;
};



// Get account type from auth token (supports both JWT and old format)
export const getAccountType = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;

  // For JWT tokens, we can't decode client-side safely
  // Return null and let components use getAccountTypeAsync() for JWT tokens
  if (token.includes('.')) {
    console.warn('JWT token detected in getAccountType - use getAccountTypeAsync() for proper verification');
    return null;
  }

  // Legacy token format
  if (token.includes('_')) {
    const parts = token.split('_');
    if (parts.length === 2) {
      return parts[1];
    }
  }

  return null;
};





// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  // For JWT tokens, we can't safely verify client-side
  // Just check if we have a valid-looking JWT token
  if (token.includes('.')) {
    // JWT token - assume valid, let server verify
    return true;
  }
  
  // Legacy token format - can verify client-side
  if (token.includes('_')) {
    const parts = token.split('_');
    return parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]);
  }
  
  return false;
};





// Clear auth token (logout)
export const clearAuthToken = async (): Promise<void> => {
  if (typeof document === 'undefined') return;

  // Clear all session storage
  sessionStorage.clear();

  // Clear localStorage backups
  try {
    localStorage.removeItem('auth_token_3000');
  } catch {
    // Silently fail if localStorage is not available
  }

  // Get the current hostname
  const hostname = window.location.hostname;

  // Use SameSite=Lax for better compatibility with HTTP
  const sameSiteValue = 'Lax';

  // Clear the cookie with simple approach - don't specify domain
  document.cookie = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
  document.cookie = `auth_token=; path=/; max-age=0; SameSite=${sameSiteValue}`;

  // Clear for localhost specifically
  if (hostname === 'localhost') {
    document.cookie = `auth_token=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
    document.cookie = `auth_token=; path=/; domain=localhost; max-age=0; SameSite=${sameSiteValue}`;
  }

  // Clear any other potential auth-related cookies
  document.cookie = `user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
  document.cookie = `account_type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;

  // Note: We don't call the server-side logout API here because the LogoutModal component already does that
};

// Redirect to appropriate dashboard based on account type
export const redirectToDashboard = (accountType: string): string => {
  switch (accountType) {
    case 'admin':
      return '/admin/dashboard';
    case 'business':
      return '/cremation/dashboard';
    case 'user':
      return '/user/furparent_dashboard';
    default:
      return '/';
  }
};



// Fast auth check that doesn't redirect - use for preventing flashing during navigation
export const fastAuthCheck = (): {
  authenticated: boolean;
  userId: string | null;
  accountType: string | null;
  userData: any | null;
  adminData: any | null;
} => {
  // Default return state
  const defaultState = {
    authenticated: false,
    userId: null,
    accountType: null,
    userData: null,
    adminData: null
  };

  try {
    if (typeof window === 'undefined') {
      return defaultState;
    }

    // First try to get from session storage (fastest)
    const userData = typeof sessionStorage !== 'undefined' ? 
      JSON.parse(sessionStorage.getItem('user_data') || 'null') : null;
    const adminData = typeof sessionStorage !== 'undefined' ? 
      JSON.parse(sessionStorage.getItem('admin_data') || 'null') : null;

    // For JWT tokens, we can't safely decode client-side
    // Just check if we have a token and let server-side verification handle the rest
    const authToken = getAuthToken();
    if (!authToken) return defaultState;

    // If we have JWT tokens (containing dots), don't try to decode client-side
    if (authToken.includes('.')) {
      return {
        authenticated: true,
        userId: null, // Don't try to decode client-side for security
        accountType: null, // Don't try to decode client-side for security
        userData: userData,
        adminData: adminData
      };
    }

    // Old format fallback for backward compatibility
    let userId: string | null = null;
    let accountType: string | null = null;
    
    const parts = authToken.split('_');
    if (parts.length === 2) {
      userId = parts[0];
      accountType = parts[1];
    }

    if (!userId || !accountType) {
      // If we have a token but can't decode it safely, still return authenticated
      return {
        authenticated: true,
        userId: null,
        accountType: null,
        userData: userData,
        adminData: adminData
      };
    }

    // Return the appropriate data based on account type
    if (accountType === 'admin') {
      return {
        authenticated: true,
        userId,
        accountType,
        userData: null,
        adminData: adminData
      };
    } else if (accountType === 'user') {
      return {
        authenticated: true,
        userId,
        accountType,
        userData,
        adminData: null
      };
    } else if (accountType === 'business') {
      return {
        authenticated: true,
        userId,
        accountType,
        userData: null,
        adminData: null
      };
    }

    // If no cached data but token exists, return basic auth info
    return {
      authenticated: true,
      userId,
      accountType,
      userData: null,
      adminData: null
    };
  } catch {
    return defaultState;
  }
};
