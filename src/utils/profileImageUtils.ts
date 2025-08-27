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