/**
 * Authentication utility functions
 */
import { NextRequest } from 'next/server';

// Get auth token from server request (for API routes)
export const getAuthTokenFromRequest = (request: NextRequest): string | null => {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  // Try to find auth_token with different approaches
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

    // Validate token format (should be userId_accountType)
    if (!token || !token.includes('_')) {
      return null;
    }

    return token;
  } catch (error) {
    return null;
  }
};

// Get the auth token from cookies
export const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    // First try to get from cookies
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

    if (authCookie) {
      // Extract the token value and decode it
      const encodedToken = authCookie.split('=')[1];
      if (encodedToken) {
        // Decode the URI component
        const token = decodeURIComponent(encodedToken);

        // Validate token format (should be userId_accountType)
        if (token && token.includes('_')) {
          return token;
        }
      }
    }

    // Check for current port - if it's 3000, try the localStorage backup
    if (typeof window !== 'undefined' && window.location.port === '3000') {
      try {
        const localStorageToken = localStorage.getItem('auth_token_3000');
        if (localStorageToken && localStorageToken.includes('_')) {
          return localStorageToken;
        }
      } catch (e) {
        // Silently fail if localStorage is not available
      }
    }

    // If cookie not found or invalid, try sessionStorage as fallback
    const sessionToken = sessionStorage.getItem('auth_token');
    if (sessionToken && sessionToken.includes('_')) {
      // If found in sessionStorage, try to restore the cookie
      const [userId, accountType] = sessionToken.split('_');
      if (userId && accountType) {
        // Don't call setAuthToken here to avoid infinite recursion
        // Just return the token from sessionStorage
        return sessionToken;
      }
    }

    // If all else fails, return null
    return null;
  } catch (error) {
    return null;
  }
};

// Get user ID from auth token
export const getUserId = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;

  return token.split('_')[0];
};

// Get account type from auth token
export const getAccountType = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;

  return token.split('_')[1];
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

// Check if user has a specific account type
export const hasAccountType = (type: 'user' | 'admin' | 'business'): boolean => {
  const accountType = getAccountType();
  return accountType === type;
};

// Check if user is an admin
export const isAdmin = (): boolean => {
  return hasAccountType('admin');
};

// Check if user is a business (cremation center)
export const isBusiness = (): boolean => {
  return hasAccountType('business');
};

// Check if user is a fur parent
export const isFurParent = (): boolean => {
  return hasAccountType('user');
};

// Set auth token in cookie
export const setAuthToken = (userId: string, accountType: string, expirationDays: number = 30): void => {
  if (typeof document === 'undefined') return;

  // Create the token value - format is userId_accountType
  const tokenValue = `${userId}_${accountType}`;

  // Clear any existing auth token - use multiple approaches to ensure it's cleared
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'auth_token=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  // Set expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expirationDays);

  // Get the current hostname and port
  const hostname = window.location.hostname;
  const port = window.location.port;

  // For HTTP connections, we can't use SameSite=None without Secure flag
  // So we'll use SameSite=Lax instead which works better for HTTP
  const sameSiteValue = 'Lax';

  // Set the cookie with appropriate attributes for all environments
  // Standard version without domain specification
  document.cookie = `auth_token=${tokenValue}; path=/; expires=${expirationDate.toUTCString()}; SameSite=${sameSiteValue}`;

  // Add specific settings for localhost to ensure it works consistently
  if (hostname === 'localhost') {
    // Additional cookie specifically for localhost
    document.cookie = `auth_token=${tokenValue}; path=/; domain=localhost; expires=${expirationDate.toUTCString()}; SameSite=${sameSiteValue}`;
  }

  // Also add a cookie that's not port-specific (in case port is causing the issue)
  if (port === '3000') {
    try {
      // Store the token in localStorage as a backup specifically for port 3000
      localStorage.setItem('auth_token_3000', tokenValue);
    } catch (e) {
      // Silently fail if localStorage is not available
    }
  }

  // Also store in sessionStorage as a backup
  sessionStorage.setItem('auth_user_id', userId);
  sessionStorage.setItem('auth_account_type', accountType);
  sessionStorage.setItem('auth_port', port || '80');

  // Store the full token in sessionStorage as well
  sessionStorage.setItem('auth_token', tokenValue);
};

// Clear auth token (logout)
export const clearAuthToken = async (): Promise<void> => {
  if (typeof document === 'undefined') return;

  // Clear all session storage
  sessionStorage.clear();

  // Clear localStorage backups
  try {
    localStorage.removeItem('auth_token_3000');
  } catch (e) {
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

// Check authentication status with the server
export const checkAuthStatus = async (): Promise<{
  authenticated: boolean;
  userId?: string;
  accountType?: string;
}> => {
  try {
    // First check client-side cookies
    const authToken = getAuthToken();

    if (authToken) {
      const parts = authToken.split('_');
      if (parts.length === 2) {
        return {
          authenticated: true,
          userId: parts[0],
          accountType: parts[1]
        };
      }
    }

    // If client-side check fails, check sessionStorage as fallback
    if (typeof window !== 'undefined') {
      const userId = sessionStorage.getItem('auth_user_id');
      const accountType = sessionStorage.getItem('auth_account_type');

      if (userId && accountType) {
        // Try to restore the cookie from sessionStorage
        setAuthToken(userId, accountType, 30);

        return {
          authenticated: true,
          userId,
          accountType
        };
      }
    }

    // If all client-side checks fail, verify with the server
    const response = await fetch('/api/auth/check');
    const data = await response.json();

    return {
      authenticated: data.authenticated,
      userId: data.userId,
      accountType: data.accountType
    };
  } catch (error) {
    return { authenticated: false };
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
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return defaultState;
    }

    // First try to get from session storage (fastest)
    const userData = JSON.parse(sessionStorage.getItem('user_data') || 'null');
    const adminData = JSON.parse(sessionStorage.getItem('admin_data') || 'null');

    // Get from auth token
    const authToken = getAuthToken();
    if (!authToken) return defaultState;

    const [userId, accountType] = authToken.split('_');

    if (!userId || !accountType) return defaultState;

    // Return the appropriate data based on account type
    if (accountType === 'admin') {
      if (adminData) {
        // If we have cached admin data, use it
        return {
          authenticated: true,
          userId,
          accountType,
          userData: null,
          adminData
        };
      } else {
        // For admin accounts without cached data, still return authenticated
        // The withAdminAuth component will fetch the admin data
        return {
          authenticated: true,
          userId,
          accountType,
          userData: null,
          adminData: null
        };
      }
    } else if (accountType === 'user' && userData) {
      return {
        authenticated: true,
        userId,
        accountType,
        userData,
        adminData: null
      };
    } else if (accountType === 'business') {
      // For business accounts
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
  } catch (error) {
    return defaultState;
  }
};
