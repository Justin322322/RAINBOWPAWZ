import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
}

/**
 * Upload a file to Cloudinary
 * @param file - The file to upload
 * @param folder - The folder to upload to (e.g., 'profile-pictures', 'documents')
 * @param userId - User ID for organizing uploads
 * @returns Promise resolving to upload result
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
  userId: string
): Promise<CloudinaryUploadResult> {
  try {
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique public_id
    const timestamp = Date.now();
    const publicId = `${folder}/${userId}/${timestamp}`;

    // Upload to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: publicId,
          folder: `rainbow-paws/${folder}`,
          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result as CloudinaryUploadResult);
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      ).end(buffer);
    });

    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file to delete
 * @returns Promise resolving to deletion result
 */
export async function deleteFromCloudinary(publicId: string): Promise<any> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if Cloudinary is configured
 * @returns boolean indicating if Cloudinary is properly configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}