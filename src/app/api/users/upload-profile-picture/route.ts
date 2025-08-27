import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function POST(request: NextRequest) {
  try {
    console.log('User profile picture upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });

    // Parse the multipart form data
    const formData = await request.formData();
    console.log('Form data parsed successfully');

    // Get user ID from form data
    const userId = formData.get('userId');
    if (!userId) {
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }

    // Only allow users to update their own profile picture (or admins)
    if (user.userId !== userId.toString() && user.accountType !== 'admin') {
      console.log('Authorization failed:', { tokenUserId: user.userId, requestedUserId: userId, accountType: user.accountType });
      return NextResponse.json({ 
        error: 'You are not authorized to update this profile picture' 
      }, { status: 403 });
    }

    // Get the profile picture file - handle both File and Blob types
    const profilePicture = formData.get('profilePicture');
    console.log('Profile picture file received:', { 
      hasFile: !!profilePicture, 
      isBlob: profilePicture instanceof Blob, 
      size: profilePicture instanceof Blob ? profilePicture.size : 'N/A',
      type: profilePicture instanceof Blob ? profilePicture.type : 'N/A'
    });
    
    if (!profilePicture || !(profilePicture instanceof Blob) || profilePicture.size === 0) {
      console.log('Invalid profile picture file');
      return NextResponse.json({
        error: 'No profile picture file provided'
      }, { status: 400 });
    }

    // Now TypeScript knows profilePicture is a Blob
    const profilePictureBlob = profilePicture as Blob;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(profilePictureBlob.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (profilePictureBlob.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Save the profile picture to file system (similar to package uploads)
    const timestamp = Date.now();
    const fileExtension = profilePictureBlob.type.split('/')[1] || 'jpg';
    const filename = `profile_picture_${timestamp}.${fileExtension}`;
    console.log('Generated filename:', filename);

    // Create the directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-pictures', userId.toString());
    console.log('Uploads directory:', uploadsDir);

    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      console.log('Creating directory:', uploadsDir);
      await mkdir(uploadsDir, { recursive: true });
      console.log('Directory created successfully');
    } else {
      console.log('Directory already exists');
    }

    // Create file path
    const filePath = join(uploadsDir, filename);
    console.log('File path:', filePath);

    // Convert file to buffer and save
    console.log('Converting file to buffer...');
    const bytes = await profilePictureBlob.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('Buffer created, size:', buffer.length);
    
    console.log('Writing file to disk...');
    await writeFile(filePath, buffer);
    console.log('File written successfully');

    // Return the relative path
    const profilePicturePath = `/uploads/profile-pictures/${userId}/${filename}`;

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
        profilePicturePath
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
