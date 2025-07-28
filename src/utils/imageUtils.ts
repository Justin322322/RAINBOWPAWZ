/**
 * Comprehensive image utility functions for handling image paths, package images, and fallbacks
 */

/**
 * Converts a standard image path to an API-served path for production
 * This ensures images are properly served in both development and production
 *
 * @param path The original image path
 * @param addCacheBust Whether to add cache busting for profile pictures
 * @returns The converted path
 */
export function getImagePath(path: string, addCacheBust: boolean = false): string {
  if (!path) return '/bg_4.png'; // Default fallback

  // If it's already an API path, return as is (unless cache busting is requested)
  if (path.startsWith('/api/image/')) {
    return addCacheBust ? addCacheBuster(path) : path;
  }

  // If it's an uploads path, convert to API path
  if (path.startsWith('/uploads/')) {
    // Extract the path after /uploads/
    const uploadPath = path.substring('/uploads/'.length);
    // Use the API route instead
    const apiPath = `/api/image/${uploadPath}`;
    return addCacheBust ? addCacheBuster(apiPath) : apiPath;
  }

  // If it's a package image path that doesn't start with /uploads/ but contains 'packages'
  if (path.includes('packages/') && !path.startsWith('/api/')) {
    // Extract the path after packages/
    const parts = path.split('packages/');
    if (parts.length > 1) {
      return `/api/image/packages/${parts[1]}`;
    }
  }

  // Handle pet image paths
  if (path.includes('pets/') && !path.startsWith('/api/')) {
    // Extract the path after pets/
    const parts = path.split('pets/');
    if (parts.length > 1) {
      return `/api/image/pets/${parts[1]}`;
    }

    // Try to extract using a different approach if the above didn't work
    const pathParts = path.split('/');
    const petIndex = pathParts.findIndex(part => part === 'pets');
    if (petIndex >= 0 && petIndex < pathParts.length - 1) {
      const petPath = pathParts.slice(petIndex).join('/');
      return `/api/image/${petPath}`;
    }
  }

  // Handle document paths for business applications
  if ((path.includes('documents/') || path.includes('business/') || path.includes('businesses/'))
      && !path.startsWith('/api/')) {
    // Try to extract the relevant path
    const parts = path.split('/');
    const relevantIndex = parts.findIndex(part =>
      part === 'documents' || part === 'business' || part === 'businesses'
    );

    if (relevantIndex >= 0) {
      const relevantPath = parts.slice(relevantIndex).join('/');
      return `/api/image/${relevantPath}`;
    }
  }

  // For other paths (like public images), return as is
  return path;
}

/**
 * Adds a cache-busting parameter to an image URL
 *
 * @param url The image URL
 * @returns The URL with a cache-busting parameter
 */
export function addCacheBuster(url: string): string {
  const timestamp = Date.now();
  return `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
}

/**
 * Gets a production-ready image path with cache busting
 *
 * @param path The original image path
 * @returns The production-ready path
 */
export function getProductionImagePath(path: string): string {
  return addCacheBuster(getImagePath(path));
}





/**
 * Get profile picture URL without cache busting to prevent flickering during navigation
 * @param profilePicturePath The profile picture path from database
 * @param userId Optional user ID for fallback
 * @returns The profile picture URL without cache busting
 */
export function getProfilePictureUrl(profilePicturePath: string | null | undefined, _userId?: string | number): string {
  if (!profilePicturePath) {
    return '/bg_4.png'; // Default fallback
  }

  // Don't add cache busting for profile pictures to prevent flickering during navigation
  // Cache busting will only be used when profile picture is actually updated
  return getImagePath(profilePicturePath, false);
}

/**
 * Handle image loading errors by setting a fallback
 * @param event The error event from the image
 * @param fallback Optional custom fallback URL
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>, fallback?: string) {
  const target = event.target as HTMLImageElement;
  // Instead of hiding, replace with fallback
  target.src = fallback || '/bg_4.png';
  // Remove any error styling
  target.classList.remove('error');
  // Add fallback styling if needed
  target.classList.add('fallback-image');
}



/**
 * Trigger a profile picture update event to refresh all components
 * @param newProfilePicturePath The new profile picture path
 * @param userType The type of user (user, admin, business)
 */
function triggerProfilePictureUpdate(newProfilePicturePath: string, userType: 'user' | 'admin' | 'business' = 'user'): void {
  if (typeof window === 'undefined') return;

  // Update session storage based on user type
  try {
    let storageKey = 'user_data';
    if (userType === 'admin') {
      storageKey = 'admin_data';
    } else if (userType === 'business') {
      storageKey = 'business_data';
    }

    const userData = sessionStorage.getItem(storageKey);
    if (userData) {
      const user = JSON.parse(userData);
      user.profile_picture = newProfilePicturePath;
      sessionStorage.setItem(storageKey, JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to update session storage:', error);
  }

  // Dispatch custom event to notify all components
  window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
    detail: {
      profilePicturePath: newProfilePicturePath,
      userType: userType,
      timestamp: Date.now()
    }
  }));
}

/**
 * Upload profile picture with AJAX (no page refresh)
 * @param file The image file to upload
 * @param apiEndpoint The API endpoint for upload
 * @param userType The type of user
 * @param additionalData Any additional form data
 * @returns Promise with upload result
 */
export async function uploadProfilePictureAjax(
  file: File,
  apiEndpoint: string,
  userType: 'user' | 'admin' | 'business' = 'user',
  additionalData?: Record<string, string>
): Promise<{ success: boolean; profilePicturePath?: string; error?: string }> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Profile picture must be less than 5MB');
    }

    // Create form data
    const formData = new FormData();
    formData.append('profilePicture', file);

    // Add additional data if provided
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Upload file
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload profile picture');
    }

    const result = await response.json();

    if (result.success && result.profilePicturePath) {
      // Trigger update event to refresh all components
      triggerProfilePictureUpdate(result.profilePicturePath, userType);

      return {
        success: true,
        profilePicturePath: result.profilePicturePath
      };
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Profile picture upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}
