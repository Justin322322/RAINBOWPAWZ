/**
 * Utility functions for handling profile images efficiently
 * Simplified for better performance - no caching needed
 */

export interface ProfileImageResult {
  success: boolean;
  imageData?: string;
  imagePath?: string;
  error?: string;
}

/**
 * Fetch profile image directly from API - no caching for simplicity
 */
export async function fetchProfileImage(userId: string): Promise<ProfileImageResult> {
  try {
    // Fetch from API directly
    const response = await fetch(`/api/image/profile/${userId}`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Profile picture not found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching profile image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Clear profile image cache for a specific user (no-op for now)
 */
export function clearProfileImageCache(_userId: string): void {
  // No caching, so nothing to clear
}

/**
 * Convert profile image result to usable image source
 */
export function getProfileImageSrc(result: ProfileImageResult, fallback: string = '/bg_4.png'): string {
  if (!result.success) {
    return fallback;
  }

  if (result.imageData && result.imageData.startsWith('data:image/')) {
    return result.imageData;
  }

  if (result.imagePath) {
    // Convert path to API route if needed
    if (result.imagePath.startsWith('/uploads/')) {
      return `/api/image${result.imagePath}`;
    }
    if (result.imagePath.startsWith('/api/image/')) {
      return result.imagePath;
    }
    return result.imagePath;
  }

  return fallback;
}

/**
 * Utility functions for handling profile picture operations
 */

/**
 * Safely store profile picture data in sessionStorage without causing quota exceeded errors
 * @param profilePicturePath The profile picture path or data
 * @param userType The type of user (user, admin, business)
 * @param userId The user ID for creating a unique key
 */
export function safelyStoreProfilePicture(
  profilePicturePath: string, 
  userType: string, 
  userId: string
): void {
  try {
    // Create a unique key for this user's profile picture
    const profilePictureKey = `${userType}_profile_picture_${userId}`;
    
    // Store the profile picture data in a separate key to avoid quota issues
    sessionStorage.setItem(profilePictureKey, profilePicturePath);
    
    // Also update the user data cache, but only if it's not too large
    try {
      const userDataCache = sessionStorage.getItem('user_data');
      if (userDataCache) {
        const user = JSON.parse(userDataCache);
        // Only store a reference to the profile picture, not the full data
        user.profile_picture_key = profilePictureKey;
        user.profile_picture_timestamp = Date.now();
        sessionStorage.setItem('user_data', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error updating user data cache:', error);
      // If we get a quota error, clear the user_data to make room
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          sessionStorage.removeItem('user_data');
          console.log('Cleared user_data due to quota exceeded');
        } catch (clearError) {
          console.error('Failed to clear storage:', clearError);
        }
      }
    }
  } catch (error) {
    console.error('Error storing profile picture:', error);
  }
}

/**
 * Retrieve profile picture data from sessionStorage
 * @param userType The type of user (user, admin, business)
 * @param userId The user ID
 * @returns The profile picture data or null if not found
 */
export function getStoredProfilePicture(userType: string, userId: string): string | null {
  try {
    const profilePictureKey = `${userType}_profile_picture_${userId}`;
    return sessionStorage.getItem(profilePictureKey);
  } catch (error) {
    console.error('Error retrieving profile picture:', error);
    return null;
  }
}

/**
 * Clear profile picture data from sessionStorage
 * @param userType The type of user (user, admin, business)
 * @param userId The user ID
 */
export function clearStoredProfilePicture(userType: string, userId: string): void {
  try {
    const profilePictureKey = `${userType}_profile_picture_${userId}`;
    sessionStorage.removeItem(profilePictureKey);
  } catch (error) {
    console.error('Error clearing profile picture:', error);
  }
}