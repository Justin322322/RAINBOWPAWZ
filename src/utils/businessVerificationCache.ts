/**
 * Utility functions for managing business verification cache
 * This file provides centralized cache management for business verification status
 */

// Cache duration in milliseconds (30 minutes)
export const VERIFICATION_CACHE_DURATION = 30 * 60 * 1000;

// Cache key constants
export const CACHE_KEYS = {
  BUSINESS_VERIFICATION: 'business_verification_cache',
  VERIFIED_BUSINESS: 'verified_business',
  USER_DATA: 'user_data'
} as const;

/**
 * Clear business verification cache
 * Use this when business status changes or user logs out
 */
export const clearBusinessVerificationCache = (): void => {
  try {
    // Clear memory cache first
    memoryCache = null;

    if (typeof sessionStorage !== 'undefined') {
      // Clear primary cache keys
      sessionStorage.removeItem(CACHE_KEYS.BUSINESS_VERIFICATION);
      sessionStorage.removeItem(CACHE_KEYS.VERIFIED_BUSINESS);
      sessionStorage.removeItem(CACHE_KEYS.USER_DATA);
      
      // Clear additional cremation-related keys that might exist
      sessionStorage.removeItem('cremation_user_name');
      sessionStorage.removeItem('user_full_name');
      sessionStorage.removeItem('business_data');
      sessionStorage.removeItem('service_provider_data');
    }
    
    // Also clear localStorage cremation-specific items
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cremation_user_name');
    }
  } catch (error) {
    console.error('Error clearing business verification cache:', error);
  }
};

// In-memory cache for even faster access
let memoryCache: {
  userData: any;
  verified: boolean;
  timestamp: number;
} | null = null;

/**
 * Get cached business verification data
 * Returns null if cache is invalid or doesn't exist
 */
export const getCachedBusinessVerification = () => {
  try {
    // First check in-memory cache (fastest)
    if (memoryCache) {
      const now = Date.now();
      if (memoryCache.timestamp && (now - memoryCache.timestamp) < VERIFICATION_CACHE_DURATION) {
        return memoryCache;
      }
      // Memory cache expired
      memoryCache = null;
    }

    if (typeof sessionStorage === 'undefined') return null;

    const cachedData = sessionStorage.getItem(CACHE_KEYS.BUSINESS_VERIFICATION);
    if (!cachedData) return null;

    const parsed = JSON.parse(cachedData);
    const now = Date.now();

    // Check if cache is still valid
    if (parsed.timestamp && (now - parsed.timestamp) < VERIFICATION_CACHE_DURATION) {
      // Update memory cache
      memoryCache = parsed;
      return parsed;
    }

    // Cache expired, remove it
    sessionStorage.removeItem(CACHE_KEYS.BUSINESS_VERIFICATION);
    return null;
  } catch (error) {
    console.error('Error reading business verification cache:', error);
    return null;
  }
};

/**
 * Set business verification cache
 * Stores verification data with timestamp for expiration
 */
export const setCachedBusinessVerification = (userData: any, verified: boolean): void => {
  try {
    const cacheData = {
      userData,
      verified,
      timestamp: Date.now()
    };

    // Update memory cache first (fastest access)
    memoryCache = cacheData;

    if (typeof sessionStorage === 'undefined') return;

    sessionStorage.setItem(CACHE_KEYS.BUSINESS_VERIFICATION, JSON.stringify(cacheData));

    // Keep legacy session storage for backward compatibility
    if (verified) {
      sessionStorage.setItem(CACHE_KEYS.VERIFIED_BUSINESS, 'true');
      sessionStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(userData));
    }
  } catch (error) {
    console.error('Error setting business verification cache:', error);
  }
};

/**
 * Check if business verification cache is valid
 */
export const isBusinessVerificationCacheValid = (): boolean => {
  // Quick check using memory cache first
  if (memoryCache) {
    const now = Date.now();
    return !!(memoryCache.timestamp &&
           (now - memoryCache.timestamp) < VERIFICATION_CACHE_DURATION &&
           memoryCache.verified === true);
  }

  const cached = getCachedBusinessVerification();
  return cached !== null && cached.verified === true;
};

/**
 * Update profile picture in cached business verification data
 */
export const updateCachedProfilePicture = (profilePicturePath: string): void => {
  try {
    // Update memory cache
    if (memoryCache && memoryCache.userData) {
      memoryCache.userData.profile_picture = profilePicturePath;
    }

    if (typeof sessionStorage === 'undefined') return;

    // Update session storage cache
    const cachedData = sessionStorage.getItem(CACHE_KEYS.BUSINESS_VERIFICATION);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed.userData) {
        parsed.userData.profile_picture = profilePicturePath;
        sessionStorage.setItem(CACHE_KEYS.BUSINESS_VERIFICATION, JSON.stringify(parsed));
      }
    }

    // Update legacy user data cache
    const userData = sessionStorage.getItem(CACHE_KEYS.USER_DATA);
    if (userData) {
      const user = JSON.parse(userData);
      user.profile_picture = profilePicturePath;
      sessionStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(user));
    }

    // Also dispatch event to update navbar immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
        detail: { profilePicturePath }
      }));
    }
  } catch (error) {
    console.error('Error updating cached profile picture:', error);
  }
};

/**
 * Force refresh business verification
 * Clears cache and forces a new verification check
 */
export const forceBusinessVerificationRefresh = (): void => {
  clearBusinessVerificationCache();

  // Trigger a page reload to force re-verification
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};
