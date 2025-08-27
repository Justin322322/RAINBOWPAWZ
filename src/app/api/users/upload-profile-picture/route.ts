import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import * as fs from 'fs';

// Helper function to ensure directory exists with proper error handling
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      console.log('Creating directory:', dirPath);
      await mkdir(dirPath, { recursive: true });
      console.log('Directory created successfully');
    } else {
      console.log('Directory already exists:', dirPath);
    }
    
    // Test write permissions
    const testFile = join(dirPath, '.write-test');
    try {
      await writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
      console.log('Directory is writable:', dirPath);
    } catch (permError) {
      console.error('Directory write permission test failed:', permError);
      throw new Error(`Directory ${dirPath} is not writable: ${permError instanceof Error ? permError.message : 'Permission denied'}`);
    }
  } catch (error) {
    console.error('Error ensuring directory exists:', dirPath, error);
    throw new Error(`Failed to create/verify directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Profile picture upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });
    
    const { userId, accountType } = user;

    // Parse the form data
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File || formData.get('image') as File;
    console.log('Form data parsed:', { hasFile: !!file });

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    console.log('File validation:', { type: file.type, size: file.size });
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

    const filename = `profile_${userId}_${timestamp}.${extension}`;
    console.log('Generated filename:', filename);

    // Determine the appropriate upload directory based on account type
    let uploadsDir: string;
    let relativePath: string;
    
    if (accountType === 'admin') {
      uploadsDir = join(process.cwd(), 'public', 'uploads', 'admin-profile-pictures', userId);
      relativePath = `/uploads/admin-profile-pictures/${userId}/${filename}`;
    } else {
      uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-pictures', userId);
      relativePath = `/uploads/profile-pictures/${userId}/${filename}`;
    }
    
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

    // Verify file was written successfully
    if (!fs.existsSync(filePath)) {
      throw new Error('File was not saved successfully after write operation');
    }

    // Save the profile picture path to the database
    try {
      console.log('Updating profile picture in database...');
      
      if (accountType === 'admin') {
        // Update admin profile picture
        const adminResult = await query(
          'UPDATE admins SET profile_picture = ? WHERE admin_id = ?',
          [relativePath, userId]
        );
        console.log('Admin profile picture updated:', adminResult);
      } else {
        // Update user profile picture
        const userResult = await query(
          'UPDATE users SET profile_picture = ? WHERE user_id = ?',
          [relativePath, userId]
        );
        console.log('User profile picture updated:', userResult);
      }
      
      console.log('Profile picture updated successfully in database');

      console.log('Profile picture upload completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicturePath: relativePath
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database error while updating profile picture:', dbError);
      return NextResponse.json({
        error: 'Failed to update profile picture in database',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Profile picture upload error:', error);
    
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json({
      error: 'Failed to upload profile picture',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
