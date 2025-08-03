/**
 * Comprehensive image utility functions for handling image paths, package images, and fallbacks
 */

// Constants
const DEFAULT_FALLBACK_IMAGE = '/bg_4.png';
const API_IMAGE_PREFIX = '/api/image/';
const UPLOADS_PREFIX = '/uploads/';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ProfilePictureUploadResult {
  success: boolean;
  profilePicturePath?: string;
  error?: string;
}

interface ProfilePictureUpdateEvent {
  profilePicturePath: string;
  userType: 'user' | 'admin' | 'business';
  timestamp: number;
}

/**
 * Converts a standard image path to an API-served path for production
 * This ensures images are properly served in both development and production
 *
 * @param path The original image path
 * @param addCacheBust Whether to add cache busting for profile pictures
 * @returns The converted path
 */
export function getImagePath(path: string, addCacheBust: boolean = false): string {
  if (!path) return DEFAULT_FALLBACK_IMAGE;

  const convertedPath = convertToApiPath(path);
  return addCacheBust ? addCacheBuster(convertedPath) : convertedPath;
}

/**
 * Convert various path formats to API paths
 */
function convertToApiPath(path: string): string {
  // If it's already an API path, return as is
  if (path.startsWith(API_IMAGE_PREFIX)) {
    return path;
  }

  // Handle uploads paths
  if (path.startsWith(UPLOADS_PREFIX)) {
    return convertUploadsPath(path);
  }

  // Handle package images
  if (path.includes('packages/') && !path.startsWith(API_IMAGE_PREFIX)) {
    return convertPackagePath(path);
  }

  // Handle pet images
  if (path.includes('pets/') && !path.startsWith(API_IMAGE_PREFIX)) {
    return convertPetPath(path);
  }

  // Handle document paths for business applications
  if (isDocumentPath(path)) {
    return convertDocumentPath(path);
  }

  // For other paths (like public images), return as is
  return path;
}

/**
 * Convert uploads path to API path
 */
function convertUploadsPath(path: string): string {
  const uploadPath = path.substring(UPLOADS_PREFIX.length);
  return `${API_IMAGE_PREFIX}${uploadPath}`;
}

/**
 * Convert package image path to API path
 */
function convertPackagePath(path: string): string {
  const parts = path.split('packages/');
  if (parts.length > 1) {
    return `${API_IMAGE_PREFIX}packages/${parts[1]}`;
  }
  return path;
}

/**
 * Convert pet image path to API path
 */
function convertPetPath(path: string): string {
  const parts = path.split('pets/');
  if (parts.length > 1) {
    return `${API_IMAGE_PREFIX}pets/${parts[1]}`;
  }

  // Try alternative approach
  const pathParts = path.split('/');
  const petIndex = pathParts.findIndex(part => part === 'pets');
  if (petIndex >= 0 && petIndex < pathParts.length - 1) {
    const petPath = pathParts.slice(petIndex).join('/');
    return `${API_IMAGE_PREFIX}${petPath}`;
  }

  return path;
}

/**
 * Check if path is a document path
 */
function isDocumentPath(path: string): boolean {
  return (path.includes('documents/') || 
          path.includes('business/') || 
          path.includes('businesses/')) && 
         !path.startsWith(API_IMAGE_PREFIX);
}

/**
 * Convert document path to API path
 */
function convertDocumentPath(path: string): string {
  const parts = path.split('/');
  const relevantIndex = parts.findIndex(part =>
    part === 'documents' || part === 'business' || part === 'businesses'
  );

  if (relevantIndex >= 0) {
    const relevantPath = parts.slice(relevantIndex).join('/');
    return `${API_IMAGE_PREFIX}${relevantPath}`;
  }

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
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${timestamp}`;
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
    return DEFAULT_FALLBACK_IMAGE;
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
  target.src = fallback || DEFAULT_FALLBACK_IMAGE;
  target.classList.remove('error');
  target.classList.add('fallback-image');
}

/**
 * Get storage key based on user type
 */
function getStorageKey(userType: 'user' | 'admin' | 'business'): string {
  switch (userType) {
    case 'admin':
      return 'admin_data';
    case 'business':
      return 'business_data';
    default:
      return 'user_data';
  }
}

/**
 * Update session storage with new profile picture
 */
function updateSessionStorage(newProfilePicturePath: string, userType: 'user' | 'admin' | 'business'): void {
  try {
    const storageKey = getStorageKey(userType);
    const userData = sessionStorage.getItem(storageKey);
    
    if (userData) {
      const user = JSON.parse(userData);
      user.profile_picture = newProfilePicturePath;
      sessionStorage.setItem(storageKey, JSON.stringify(user));
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to update session storage:', error);
    }
  }
}

/**
 * Dispatch profile picture update event
 */
function dispatchProfilePictureEvent(newProfilePicturePath: string, userType: 'user' | 'admin' | 'business'): void {
  if (typeof window === 'undefined') return;

  const event: ProfilePictureUpdateEvent = {
    profilePicturePath: newProfilePicturePath,
    userType,
    timestamp: Date.now()
  };

  window.dispatchEvent(new CustomEvent('profilePictureUpdated', { detail: event }));
}

/**
 * Trigger a profile picture update event to refresh all components
 * @param newProfilePicturePath The new profile picture path
 * @param userType The type of user (user, admin, business)
 */
function triggerProfilePictureUpdate(newProfilePicturePath: string, userType: 'user' | 'admin' | 'business' = 'user'): void {
  updateSessionStorage(newProfilePicturePath, userType);
  dispatchProfilePictureEvent(newProfilePicturePath, userType);
}

/**
 * Validate uploaded file
 */
function validateUploadedFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Profile picture must be less than 5MB');
  }
}

/**
 * Create form data for upload
 */
function createUploadFormData(file: File, additionalData?: Record<string, string>): FormData {
  const formData = new FormData();
  formData.append('profilePicture', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return formData;
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
): Promise<ProfilePictureUploadResult> {
  try {
    validateUploadedFile(file);
    const formData = createUploadFormData(file, additionalData);

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
      triggerProfilePictureUpdate(result.profilePicturePath, userType);

      return {
        success: true,
        profilePicturePath: result.profilePicturePath
      };
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Profile picture upload error:', error);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}
