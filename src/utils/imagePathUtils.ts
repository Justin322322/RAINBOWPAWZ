/**
 * Utility functions for handling image paths consistently across environments
 */

/**
 * Converts a standard image path to an API-served path for production
 * This ensures images are properly served in both development and production
 *
 * @param path The original image path
 * @returns The converted path
 */
export function getImagePath(path: string): string {
  if (!path) return '/bg_4.png'; // Default fallback

  // If it's already an API path, return as is
  if (path.startsWith('/api/image/')) {
    return path;
  }

  // If it's an uploads path, convert to API path
  if (path.startsWith('/uploads/')) {
    // Extract the path after /uploads/
    const uploadPath = path.substring('/uploads/'.length);
    // Use the API route instead
    return `/api/image/${uploadPath}`;
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
