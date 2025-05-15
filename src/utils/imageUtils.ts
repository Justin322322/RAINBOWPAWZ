/**
 * Image utility functions for handling package images and fallbacks
 */

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
      return data.imagesFound[index];
    }
    
    // Fallback to a reliable fallback image
    return `/bg_4.png`;
  } catch (error) {
    console.error('Error fetching package image:', error);
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
      return data.imagesFound;
    }
    
    // Fallback to a reliable fallback image
    return [`/bg_4.png`];
  } catch (error) {
    console.error('Error fetching package images:', error);
    // Default fallback
    return [`/bg_4.png`];
  }
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