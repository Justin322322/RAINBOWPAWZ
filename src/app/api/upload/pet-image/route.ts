import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Function to ensure directory exists
async function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File || formData.get('image') as File;
    const petName = formData.get('petName') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Create a unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').toLowerCase();
    const extension = originalName.split('.').pop();

    // Use pet name in filename if available
    const sanitizedPetName = petName ? petName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' : '';
    const filename = `pet_${sanitizedPetName}${userId}_${timestamp}.${extension}`;

    // Create the uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'pets');
    await ensureDirectoryExists(uploadsDir);

    // Create file path
    const filePath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    // Return the relative path to the image
    const relativePath = `/uploads/pets/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      imagePath: relativePath,
      imageUrl: relativePath // Add imageUrl for backward compatibility
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
