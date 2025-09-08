/**
 * Utility functions to handle logout state and prevent API calls during logout
 */

/**
 * Check if the user is currently in the process of logging out
 * This prevents API calls from continuing after logout which would cause 401 error toasts
 */
export function isLoggingOut(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('is_logging_out') === 'true';
}

/**
 * Check if an error is a 401/Unauthorized error during logout
 * This prevents showing error toasts for expected 401 errors during logout
 */
export function isUnauthorizedDuringLogout(error: any): boolean {
  if (!isLoggingOut()) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes('401') || 
         errorMessage.includes('Unauthorized') || 
         errorMessage.includes('Forbidden');
}

/**
 * Safe API call wrapper that checks logout state before making requests
 * Returns a promise that resolves immediately if user is logging out
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  if (isLoggingOut()) {
    return fallbackValue;
  }
  
  try {
    return await apiCall();
  } catch (error) {
    if (isUnauthorizedDuringLogout(error)) {
      return fallbackValue;
    }
    throw error;
  }
}
