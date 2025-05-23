/**
 * Utility functions for handling image paths in the application
 */

import { getAppBaseUrl } from './appUrl';

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

/**
 * Extracts the filename from a path
 * @param path - The path containing the filename
 * @returns The extracted filename
 */
export function getFilenameFromPath(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Generates a placeholder image URL for when an image is not available
 * @param type - The type of placeholder (e.g., 'package', 'pet', 'user')
 * @param id - Optional ID to generate a consistent placeholder
 * @returns URL to a placeholder image
 */
export function getPlaceholderImage(type: 'package' | 'pet' | 'user' = 'package', id?: number): string {
  const baseUrl = getAppBaseUrl();
  const index = id ? (id % 5) + 1 : Math.floor(Math.random() * 5) + 1;
  return `${baseUrl}/images/sample-${type}-${index}.jpg`;
}
