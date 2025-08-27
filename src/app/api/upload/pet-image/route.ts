import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifySecureAuth } from '@/lib/secureAuth';

// Function to ensure directory exists
async function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Pet image upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });
    
    const userId = user.userId;

    // Parse the form data
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File || formData.get('image') as File;
    const petName = formData.get('petName') as string || '';
    console.log('Form data parsed:', { hasFile: !!file, petName });

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    console.log('File validation:', { type: file.type, size: file.size, maxSize: 5 * 1024 * 1024 });
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Create a unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').toLowerCase();
    const extension = originalName.split('.').pop();
    console.log('File processing:', { timestamp, originalName, extension });

    // Use pet name in filename if available
    const sanitizedPetName = petName ? petName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' : '';
    const filename = `pet_${sanitizedPetName}${userId}_${timestamp}.${extension}`;
    console.log('Generated filename:', filename);

    // Create the uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'pets');
    console.log('Uploads directory:', uploadsDir);
    await ensureDirectoryExists(uploadsDir);
    console.log('Directory ensured');

    // Create file path
    const filePath = join(uploadsDir, filename);
    console.log('File path:', filePath);

    // Convert file to buffer and save
    console.log('Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('Buffer created, size:', buffer.length);

    console.log('Writing file to disk...');
    await writeFile(filePath, buffer);
    console.log('File written successfully');

    // Return the relative path to the image
    const relativePath = `/uploads/pets/${filename}`;
    console.log('Pet image upload completed successfully');

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      imagePath: relativePath,
      imageUrl: relativePath // Add imageUrl for backward compatibility
    });
  } catch (error) {
    console.error('Error in pet image upload:', error);
    
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
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
