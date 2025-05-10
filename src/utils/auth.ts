/**
 * Authentication utility functions
 */

// Get the auth token from cookies
export const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

    if (!authCookie) {
      return null;
    }

    // Extract the token value and decode it
    const encodedToken = authCookie.split('=')[1];
    if (!encodedToken) {
      return null;
    }

    // Decode the URI component
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

  const expirationMs = expirationDays * 24 * 60 * 60 * 1000;
  const expirationDate = new Date(Date.now() + expirationMs);

  // Set the cookie with more secure attributes
  // Note: Secure flag is only added in production (https) environments
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';

  // Make sure the cookie value is properly encoded
  const cookieValue = encodeURIComponent(`${userId}_${accountType}`);

  // Set the cookie with domain attribute to ensure it's available across the site
  const domain = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

  document.cookie = `auth_token=${cookieValue}; path=/; domain=${domain}; expires=${expirationDate.toUTCString()}; SameSite=Lax${secureFlag}`;

  // Also store in sessionStorage as a backup
  sessionStorage.setItem('auth_user_id', userId.toString());
  sessionStorage.setItem('auth_account_type', accountType);

  // If the cookie doesn't get set with domain, try without domain
  setTimeout(() => {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

    if (!authCookie) {
      // Try an alternative method without domain
      document.cookie = `auth_token=${cookieValue}; path=/; expires=${expirationDate.toUTCString()}; SameSite=Lax${secureFlag}`;
    }
  }, 100);
};

// Clear auth token (logout)
export const clearAuthToken = async (): Promise<void> => {
  if (typeof document === 'undefined') return;

  // Clear sessionStorage backup
  sessionStorage.removeItem('auth_user_id');
  sessionStorage.removeItem('auth_account_type');

  // Set secure flag based on protocol
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';

  // Try multiple approaches to clear the cookie

  // Approach 1: Set with expires in the past
  document.cookie = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;

  // Approach 2: Set with max-age=0
  document.cookie = `auth_token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;

  // Approach 3: Try with domain
  const domain = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  document.cookie = `auth_token=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;

  // Approach 4: Call the server-side logout API
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Ignore errors during logout
  }
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
