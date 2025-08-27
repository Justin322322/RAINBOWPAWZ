export interface UploadResult {
  url: string;
}

/**
 * Convert file to base64 data URL for database storage
 * Works on Vercel serverless environment
 * @param file - The file to upload
 * @param folder - The folder type (for identification)
 * @param userId - User ID for organizing uploads
 * @returns Promise resolving to upload result
 */
export async function uploadFile(
  file: File,
  folder: string,
  userId: string
): Promise<UploadResult> {
  try {
    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // Create data URL with proper MIME type
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    console.log(`File converted to base64 for ${folder}/${userId}:`, {
      originalSize: file.size,
      base64Size: base64.length,
      mimeType: file.type
    });
    
    return { url: dataUrl };
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}