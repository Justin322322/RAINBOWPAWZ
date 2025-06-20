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
 * Get the correct image URL with fallback for a package
 * @param packageId The package ID
 * @param imageIndex Optional index if multiple images are available
 * @returns The image URL to use
 */
export async function getPackageImageUrl(packageId: number | string, imageIndex: number = 0): Promise<string> {
  try {
    // Try to fetch available images from our API
    const response = await fetch(`/api/packages/available-images?id=${packageId}`);
    const data = await response.json();

    // If we found images, return the requested one or the first one
    if (data.success && data.imagesFound && data.imagesFound.length > 0) {
      // If requested index is out of bounds, use the first image
      const index = imageIndex < data.imagesFound.length ? imageIndex : 0;
      return getImagePath(data.imagesFound[index]);
    }

    // Fallback to a reliable fallback image
    return `/bg_4.png`;
  } catch {
    // Default fallback
    return `/bg_4.png`;
  }
}

/**
 * Get all available images for a package
 * @param packageId The package ID
 * @returns Array of image URLs
 */
export async function getAllPackageImages(packageId: number | string): Promise<string[]> {
  try {
    // Try to fetch available images from our API
    const response = await fetch(`/api/packages/available-images?id=${packageId}`);
    const data = await response.json();

    // If we found images, return them all
    if (data.success && data.imagesFound && data.imagesFound.length > 0) {
      // Ensure all images use the API route for better production compatibility
      return data.imagesFound.map((img: string) => getImagePath(img));
    }

    // Fallback to a reliable fallback image
    return [`/bg_4.png`];
  } catch {
    // Default fallback
    return [`/bg_4.png`];
  }
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
 * Preload an image to check if it exists
 * @param src The image source URL
 * @returns Promise that resolves if image loads, rejects if it fails
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = src;
  });
}

/**
 * Trigger a profile picture update event to refresh all components
 * @param newProfilePicturePath The new profile picture path
 */
export function triggerProfilePictureUpdate(newProfilePicturePath: string): void {
  if (typeof window === 'undefined') return;

  // Update session storage
  try {
    const userData = sessionStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      user.profile_picture = newProfilePicturePath;
      sessionStorage.setItem('user_data', JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to update session storage:', error);
  }

  // Dispatch custom event to notify all components
  window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
    detail: { profilePicturePath: newProfilePicturePath }
  }));
}