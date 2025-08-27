import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { cleanupOldFiles } from '@/utils/fileSystemUtils';

// Function to save profile picture to disk
async function saveProfilePicture(file: File, userId: string): Promise<string> {
  try {

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').toLowerCase();
    const extension = originalName.split('.').pop() || 'jpg';
    const filename = `profile_picture_${timestamp}.${extension}`;

    // Create the directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-pictures', userId);

    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Create file path
    const filePath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the relative path
    const relativePath = `/uploads/profile-pictures/${userId}/${filename}`;

    return relativePath;
  } catch (error) {
    console.error(`Failed to save profile picture:`, error);
    throw new Error(`Failed to save profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('User profile picture upload started');
    
    // Extract user ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // -2 because the last part is 'profile-picture'

    // Validate user ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });

    // Only allow users to update their own profile picture (or admins)
    if (user.userId !== userId.toString() && user.accountType !== 'admin') {
      console.log('Authorization failed:', { tokenUserId: user.userId, requestedUserId: userId, accountType: user.accountType });
      return NextResponse.json({ 
        error: 'You are not authorized to update this profile picture' 
      }, { status: 403 });
    }

    // Parse the multipart form data
    const formData = await request.formData();

    // Get the profile picture file
    const profilePicture = formData.get('profilePicture') as File | null;
    console.log('Profile picture file received:', { 
      hasFile: !!profilePicture, 
      isFile: profilePicture instanceof File, 
      size: profilePicture instanceof File ? profilePicture.size : 'N/A',
      type: profilePicture instanceof File ? profilePicture.type : 'N/A'
    });
    
    if (!profilePicture || !(profilePicture instanceof File) || profilePicture.size === 0) {
      console.log('Invalid profile picture file');
      return NextResponse.json({
        error: 'No profile picture file provided'
      }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(profilePicture.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (profilePicture.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Save the profile picture
    const profilePicturePath = await saveProfilePicture(profilePicture, userId.toString());

    // Clean up old profile pictures in the directory (keep the new one)
    try {
      // First save, then clean up to ensure we always have at least one picture
      await cleanupOldFiles(userId.toString(), 'profile-pictures', true);
    } catch (cleanupError) {
      console.error('Error cleaning up old profile pictures:', cleanupError);
      // Continue with the process even if cleanup fails
    }

    // Update the database with the new profile picture path
    try {
      console.log('Checking database schema...');
      // First, check if the profile_picture column exists and add it if it doesn't
      const columnCheck = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'profile_picture'
      `) as any[];

      if (columnCheck.length === 0) {
        console.log('Adding profile_picture column to users table...');
        await query(`ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL AFTER gender`);
        console.log('Column added successfully');
      } else {
        console.log('profile_picture column already exists');
      }

      // Update the user's profile picture in the database
      console.log('Updating profile picture in database for user:', userId);
      const updateResult = await query(
        `UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE user_id = ?`,
        [profilePicturePath, userId]
      ) as any;
      console.log('Database update result:', updateResult);

      if (updateResult.affectedRows === 0) {
        console.log('No rows affected - user not found or no changes made');
        return NextResponse.json({
          error: 'User not found or no changes made'
        }, { status: 404 });
      }
      
      console.log('Profile picture updated successfully in database');


      console.log('Profile picture upload completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicture: profilePicturePath
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database error while updating profile picture:', dbError);
      return NextResponse.json({
        error: 'Failed to update profile picture in database',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in profile picture upload:', error);
    
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
