/**
 * Utility functions for handling image paths in the application
 */

import { getAppBaseUrl } from '@/utils/appUrl';

/**
 * Converts a relative image path to an absolute URL
 * @param path - The relative path of the image
 * @returns The absolute URL of the image
 */
export function getImagePath(path: string): string {
  // If the path is already an absolute URL, return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = getAppBaseUrl();

  // If the path starts with a slash, it's a relative path from the root
  if (path.startsWith('/')) {
    return `${baseUrl}${path}`;
  }

  // Otherwise, assume it's a relative path and prepend the base URL
  return `${baseUrl}/${path}`;
}


