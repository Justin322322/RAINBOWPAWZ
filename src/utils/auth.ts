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
import { extractTokenFromHeader } from '@/lib/jwt';
import { getCurrentPort } from './appUrl';

// Constants
const AUTH_TOKEN_COOKIE = 'auth_token';
const AUTH_TOKEN_3000 = 'auth_token_3000';
const USER_DATA_KEY = 'user_data';
const ADMIN_DATA_KEY = 'admin_data';
const SESSION_TOKEN_KEY = 'auth_token';

interface AuthResult {
  userId: string;
  accountType: string;
  // Email removed from JWT tokens for security - use dedicated API endpoints for user data
}

interface FastAuthResult {
  authenticated: boolean;
  userId: string | null;
  accountType: string | null;
  userData: any | null;
  adminData: any | null;
}

interface TokenParts {
  userId: string;
  accountType: string;
}

/**
 * Parse auth token and extract user info (for API routes)
 */
export const parseAuthToken = async (authToken: string): Promise<AuthResult | null> => {
  try {
    if (authToken.includes('.')) {
      return await parseJWTToken(authToken);
    } else {
      return parseLegacyToken(authToken);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing auth token:', error);
    }
    return null;
  }
};

/**
 * Parse JWT token
 */
async function parseJWTToken(authToken: string): Promise<AuthResult | null> {
  try {
    const { verifyToken } = await import('@/lib/jwt');
    const payload = verifyToken(authToken);

    // Support both new 'sub' claim and legacy 'userId' for backward compatibility
    const userId = payload?.sub || payload?.userId;

    if (!userId || !payload?.accountType) {
      return null;
    }

    return {
      userId: userId.toString(),
      accountType: payload.accountType,
      // Email removed from JWT payload for security - use dedicated API endpoints
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error verifying JWT token:', error);
    }
    return null;
  }
}

/**
 * Parse legacy token format
 */
function parseLegacyToken(authToken: string): AuthResult | null {
  const parts = authToken.split('_');
  if (parts.length !== 2) {
    return null;
  }

  const [userId, accountType] = parts;
  if (!userId || !accountType) {
    return null;
  }

  return { userId, accountType };
}

/**
 * Get auth token from server request (for API routes)
 */
export const getAuthTokenFromRequest = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      return token;
    }
  }

  return getAuthTokenFromCookies(request.headers.get('cookie'));
};

/**
 * Extract auth token from cookies
 */
function getAuthTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith(`${AUTH_TOKEN_COOKIE}=`));

  if (!authCookie) {
    return null;
  }

  const cookieParts = authCookie.split('=');
  if (cookieParts.length < 2) {
    return null;
  }

  const encodedToken = cookieParts[1];
  if (!encodedToken) {
    return null;
  }

  try {
    const token = decodeURIComponent(encodedToken);
    return isValidTokenFormat(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Check if token has valid format
 */
function isValidTokenFormat(token: string): boolean {
  return token.includes('.') || token.includes('_');
}

/**
 * Get the auth token from cookies
 */
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const token = getAuthTokenFromDocumentCookies();
    if (token) return token;

    const localStorageToken = getAuthTokenFromLocalStorage();
    if (localStorageToken) return localStorageToken;

    return getAuthTokenFromSessionStorage();
  } catch {
    return null;
  }
};

/**
 * Get auth token from document cookies
 */
function getAuthTokenFromDocumentCookies(): string | null {
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith(`${AUTH_TOKEN_COOKIE}=`));

  if (!authCookie) {
    return null;
  }

  const encodedToken = authCookie.split('=')[1];
  if (!encodedToken) {
    return null;
  }

  const token = decodeURIComponent(encodedToken);
  return isValidTokenFormat(token) ? token : null;
}

/**
 * Get auth token from localStorage (development only)
 */
function getAuthTokenFromLocalStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Allow localStorage access for development environments
  // Check if we're in development mode (localhost or development ports)
  const hostname = window.location.hostname;
  const currentPort = getCurrentPort();
  const portNum = parseInt(currentPort);

  // Only allow localhost with common development ports
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return null;
  }

  // Restrict to common development ports for security
  if (isNaN(portNum) || portNum < 3000 || portNum > 3010) {
    return null;
  }
  try {
    const localStorageToken = localStorage.getItem(AUTH_TOKEN_3000);
    return localStorageToken && isValidTokenFormat(localStorageToken) ? localStorageToken : null;
  } catch {
    return null;
  }
}

/**
 * Get auth token from sessionStorage
 */
function getAuthTokenFromSessionStorage(): string | null {
  try {
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    return sessionToken && isValidTokenFormat(sessionToken) ? sessionToken : null;
  } catch {
    return null;
  }
}

/**
 * Get user ID from auth token with proper JWT verification
 * 
 * This is the recommended function for getting user ID from JWT tokens.
 * It properly verifies the JWT signature and extracts the user ID.
 * 
 * @returns Promise resolving to user ID, or null if invalid/expired
 */
export const getUserIdAsync = async (): Promise<string | null> => {
  const token = getAuthToken();
  if (!token) return null;

  if (token.includes('.')) {
    try {
      const authResult = await parseAuthToken(token);
      return authResult?.userId || null;
    } catch (error) {
      console.error('Error parsing JWT token in getUserIdAsync:', error);
      return null;
    }
  }

  // For legacy tokens, use the synchronous version
  const tokenParts = parseLegacyToken(token);
  return tokenParts?.userId || null;
};

/**
 * Get account type from auth token with proper JWT verification
 * 
 * This is the recommended function for getting account type from JWT tokens.
 * It properly verifies the JWT signature and extracts the account type.
 * 
 * @returns Promise resolving to account type, or null if invalid/expired
 */
export const getAccountTypeAsync = async (): Promise<string | null> => {
  const token = getAuthToken();
  if (!token) return null;

  if (token.includes('.')) {
    try {
      const authResult = await parseAuthToken(token);
      return authResult?.accountType || null;
    } catch (error) {
      console.error('Error parsing JWT token in getAccountTypeAsync:', error);
      return null;
    }
  }

  // For legacy tokens, use the synchronous version
  const tokenParts = parseLegacyToken(token);
  return tokenParts?.accountType || null;
};

/**
 * Check if an auth token is present (does NOT verify token validity)
 * 
 * ⚠️ SECURITY NOTE: This function only checks for token presence and format.
 * It does NOT verify token validity, expiration, or signature.
 * 
 * For JWT tokens: Returns true if a token with dot format exists (assumes JWT format)
 * For legacy tokens: Returns true if token can be parsed and contains userId/accountType
 * 
 * Use this for UI state management only. For security checks, use proper verification:
 * - For JWT tokens: Use parseAuthToken() or getUserIdAsync()/getAccountTypeAsync()
 * - For legacy tokens: This function provides basic validation
 * 
 * @returns true if auth token is present and appears valid, false otherwise
 */
export const hasAuthToken = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  if (token.includes('.')) {
    return true; // JWT token - assume valid format, let server verify actual validity
  }
  
  const tokenParts = parseLegacyToken(token);
  return Boolean(tokenParts?.userId && tokenParts?.accountType);
};

/**
 * Clear auth token (logout)
 */
export const clearAuthToken = async (): Promise<void> => {
  if (typeof document === 'undefined') return;

  clearSessionStorage();
  clearLocalStorage();
  clearCookies();
};

/**
 * Clear session storage
 */
function clearSessionStorage(): void {
  try {
    sessionStorage.clear();
  } catch {
    // Silently fail if sessionStorage is not available
  }
}

/**
 * Clear localStorage backups but preserve fur parent profile picture
 */
function clearLocalStorage(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_3000);
    // Note: We intentionally don't remove 'furparent_profile_picture' - let it persist across logout
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Clear cookies
 */
function clearCookies(): void {
  const hostname = window.location.hostname;
  const sameSiteValue = 'Lax';

  // Clear the cookie with simple approach - don't specify domain
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=${sameSiteValue}`;

  // Clear for localhost specifically
  if (hostname === 'localhost') {
    document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
    document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; domain=localhost; max-age=0; SameSite=${sameSiteValue}`;
  }

  // Clear any other potential auth-related cookies
  document.cookie = `user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
  document.cookie = `account_type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSiteValue}`;
}

/**
 * Redirect to appropriate dashboard based on account type
 */
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

/**
 * Fast auth check that doesn't redirect - use for preventing flashing during navigation
 */
export const fastAuthCheck = (): FastAuthResult => {
  const defaultState: FastAuthResult = {
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

    const { userData, adminData } = getCachedUserData();
    const authToken = getAuthToken();
    
    if (!authToken) return defaultState;

    if (authToken.includes('.')) {
      return {
        authenticated: true,
        userId: null, // Don't try to decode client-side for security
        accountType: null, // Don't try to decode client-side for security
        userData,
        adminData
      };
    }

    const tokenParts = parseLegacyToken(authToken);
    if (!tokenParts) {
      return {
        authenticated: true,
        userId: null,
        accountType: null,
        userData,
        adminData
      };
    }

    return getAuthResultByAccountType(tokenParts, userData, adminData);
  } catch {
    return defaultState;
  }
};

/**
 * Get cached user data from session storage
 */
function getCachedUserData(): { userData: any | null; adminData: any | null } {
  try {
    const userData = typeof sessionStorage !== 'undefined' ? 
      JSON.parse(sessionStorage.getItem(USER_DATA_KEY) || 'null') : null;
    const adminData = typeof sessionStorage !== 'undefined' ? 
      JSON.parse(sessionStorage.getItem(ADMIN_DATA_KEY) || 'null') : null;
    
    return { userData, adminData };
  } catch {
    return { userData: null, adminData: null };
  }
}

/**
 * Get auth result based on account type
 */
function getAuthResultByAccountType(
  tokenParts: TokenParts,
  userData: any | null,
  adminData: any | null
): FastAuthResult {
  const { userId, accountType } = tokenParts;

  switch (accountType) {
    case 'admin':
      return {
        authenticated: true,
        userId,
        accountType,
        userData: null,
        adminData
      };
    case 'user':
      return {
        authenticated: true,
        userId,
        accountType,
        userData,
        adminData: null
      };
    case 'business':
      return {
        authenticated: true,
        userId,
        accountType,
        userData: null,
        adminData: null
      };
    default:
      return {
        authenticated: true,
        userId,
        accountType,
        userData: null,
        adminData: null
      };
  }
}
