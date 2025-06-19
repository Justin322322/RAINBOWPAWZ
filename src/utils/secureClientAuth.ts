/**
 * Secure Client-Side Authentication Utilities
 * 
 * This replaces the insecure auth.ts utilities that used localStorage/sessionStorage.
 * All authentication state is now managed through secure httpOnly cookies and server-side APIs.
 */

// Client-side auth state interface
interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  accountType: string | null;
  email: string | null;
  loading: boolean;
}

/**
 * Check authentication status from server (replaces client-side token parsing)
 */
export async function checkAuthStatus(): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.authenticated) {
        return {
          isAuthenticated: true,
          userId: data.userId,
          accountType: data.accountType,
          email: data.email,
          loading: false
        };
      }
    }
    
    return {
      isAuthenticated: false,
      userId: null,
      accountType: null,
      email: null,
      loading: false
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    return {
      isAuthenticated: false,
      userId: null,
      accountType: null,
      email: null,
      loading: false
    };
  }
}

/**
 * Get CSRF token from cookie for secure API requests
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrf_token='));
  
  if (csrfCookie) {
    return csrfCookie.split('=')[1];
  }
  
  return null;
}

/**
 * Secure login function
 */
export async function secureLogin(email: string, password: string): Promise<{
  success: boolean;
  message: string;
  user?: any;
  account_type?: string;
}> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Network error occurred during login'
    };
  }
}

/**
 * Secure logout function
 */
export async function secureLogout(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // After successful logout, optionally redirect to login page
    if (data.success) {
      // Clear any remaining client-side state if needed
      // No more localStorage/sessionStorage clearing needed
    }
    
    return data;
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: 'Network error occurred during logout'
    };
  }
}

/**
 * Make secure API requests with CSRF protection
 */
export async function secureApiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCSRFToken();
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add CSRF token for non-GET requests
  if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase())) {
    if (csrfToken) {
      defaultHeaders['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return fetch(url, {
    ...options,
    credentials: 'include', // Include httpOnly cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
}

/**
 * Check if user has specific account type (replaces hasAccountType)
 */
export async function hasAccountType(type: 'user' | 'admin' | 'business'): Promise<boolean> {
  const authState = await checkAuthStatus();
  return authState.isAuthenticated && authState.accountType === type;
}

/**
 * Check if user is admin (replaces isAdmin)
 */
export async function isAdmin(): Promise<boolean> {
  return hasAccountType('admin');
}

/**
 * Check if user is business (replaces isBusiness)
 */
export async function isBusiness(): Promise<boolean> {
  return hasAccountType('business');
}

/**
 * Check if user is fur parent (replaces isFurParent)
 */
export async function isFurParent(): Promise<boolean> {
  return hasAccountType('user');
}

/**
 * DEPRECATED CLIENT-SIDE FUNCTIONS
 * These are no longer available for security reasons
 */

export function getAuthToken(): never {
  throw new Error('SECURITY: getAuthToken() is deprecated. Tokens are now stored in secure httpOnly cookies.');
}

export function setAuthToken(): never {
  throw new Error('SECURITY: setAuthToken() is deprecated. Use secureLogin() instead.');
}

export function clearAuthToken(): never {
  throw new Error('SECURITY: clearAuthToken() is deprecated. Use secureLogout() instead.');
}

export function getUserId(): never {
  throw new Error('SECURITY: getUserId() is deprecated. Use checkAuthStatus() instead.');
}

export function getAccountType(): never {
  throw new Error('SECURITY: getAccountType() is deprecated. Use checkAuthStatus() instead.');
} 