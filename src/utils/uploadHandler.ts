import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinaryUpload';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface UploadResult {
  url: string;
  publicId?: string;
  isCloudinary: boolean;
}

/**
 * Upload a file using the best available method
 * @param file - The file to upload
 * @param folder - The folder to upload to
 * @param userId - User ID for organizing uploads
 * @returns Promise resolving to upload result
 */
export async function uploadFile(
  file: File,
  folder: string,
  userId: string
): Promise<UploadResult> {
  // Try Cloudinary first if configured (for production)
  if (isCloudinaryConfigured()) {
    try {
      const result = await uploadToCloudinary(file, folder, userId);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        isCloudinary: true
      };
    } catch (error) {
      console.error('Cloudinary upload failed, falling back to local storage:', error);
      // Fall through to local storage
    }
  }

  // Fallback to local storage (for development or when Cloudinary fails)
  try {
    const localUrl = await saveToLocalStorage(file, folder, userId);
    return {
      url: localUrl,
      isCloudinary: false
    };
  } catch (error) {
    console.error('Local storage upload failed:', error);
    throw new Error('All upload methods failed');
  }
}

/**
 * Save file to local storage (development fallback)
 */
async function saveToLocalStorage(
  file: File,
  folder: string,
  userId: string
): Promise<string> {
  // Create a unique filename with timestamp
  const timestamp = Date.now();
  const originalName = file.name.replace(/\s+/g, '_').toLowerCase();
  const extension = originalName.split('.').pop() || 'jpg';
  const filename = `${folder}_${timestamp}.${extension}`;

  // Create the directory path
  const uploadsDir = join(process.cwd(), 'public', 'uploads', folder, userId);

  // Ensure directory exists
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Full file path
  const filePath = join(uploadsDir, filename);

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  // Return the relative path for database storage
  const relativePath = `/uploads/${folder}/${userId}/${filename}`;
  
  return relativePath;
}