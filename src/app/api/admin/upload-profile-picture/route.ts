import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    console.log('Admin profile picture upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });
    
    // Only allow admin accounts to use this endpoint
    if (user.accountType !== 'admin') {
      console.log('Non-admin access attempt:', user.accountType);
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    console.log('Form data parsed successfully');

    // Get user ID from form data
    const userId = formData.get('userId');
    if (!userId) {
      console.log('No userId in form data');
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }
    console.log('UserId from form:', userId);

    // Only allow admins to update their own profile picture
    if (user.userId !== userId.toString()) {
      console.log('UserId mismatch:', { tokenUserId: user.userId, formUserId: userId });
      return NextResponse.json({ 
        error: 'You are not authorized to update this profile picture' 
      }, { status: 403 });
    }

    // Get the profile picture file - handle both File and Blob types
    const profilePicture = formData.get('profilePicture');
    if (!profilePicture || !(profilePicture instanceof Blob) || profilePicture.size === 0) {
      console.log('Invalid profile picture file:', { 
        hasFile: !!profilePicture, 
        isBlob: profilePicture instanceof Blob, 
        size: profilePicture instanceof Blob ? profilePicture.size : 'N/A'
      });
      return NextResponse.json({
        error: 'No profile picture file provided'
      }, { status: 400 });
    }
    
    // Now TypeScript knows profilePicture is a Blob
    const profilePictureBlob = profilePicture as Blob;
    console.log('Profile picture file received:', { 
      type: profilePictureBlob.type, 
      size: profilePictureBlob.size 
    });

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(profilePictureBlob.type)) {
      console.log('Invalid file type:', profilePictureBlob.type);
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (profilePictureBlob.size > maxSize) {
      console.log('File too large:', profilePictureBlob.size);
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Save the profile picture to file system (similar to package uploads)
    const timestamp = Date.now();
    const fileExtension = profilePictureBlob.type.split('/')[1] || 'jpg';
    const filename = `admin_profile_picture_${timestamp}.${fileExtension}`;
    console.log('Generated filename:', filename);

    // Create the directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'admin-profile-pictures', userId.toString());
    console.log('Uploads directory:', uploadsDir);

    // Ensure directory exists using the same approach as package uploads
    try {
      if (!fs.existsSync(uploadsDir)) {
        console.log('Creating directory:', uploadsDir);
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Directory created successfully');
      } else {
        console.log('Directory already exists');
      }
    } catch (dirError) {
      console.error('Error creating directory:', dirError);
      return NextResponse.json({ 
        error: 'Failed to create upload directory',
        details: dirError instanceof Error ? dirError.message : 'Unknown directory error'
      }, { status: 500 });
    }

    // Full file path
    const filePath = join(uploadsDir, filename);
    console.log('Full file path:', filePath);

    // Convert file to buffer and save
    try {
      const bytes = await profilePictureBlob.arrayBuffer();
      const buffer = Buffer.from(bytes);
      console.log('File converted to buffer, size:', buffer.length);
      
      await writeFile(filePath, buffer);
      console.log('File written successfully');
    } catch (fileError) {
      console.error('Error writing file:', fileError);
      return NextResponse.json({ 
        error: 'Failed to save file',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      }, { status: 500 });
    }

    // Return the relative path for database storage
    const profilePicturePath = `/uploads/admin-profile-pictures/${userId}/${filename}`;
    console.log('Profile picture path for DB:', profilePicturePath);

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

      console.log('Checking if admin exists in database...');
      // Check if admin exists
      const adminCheck = await query('SELECT 1 FROM users WHERE user_id = ? AND role = "admin"', [userId]);
      console.log('Admin check result:', adminCheck);
      
      if (Array.isArray(adminCheck) && adminCheck.length === 0) {
        console.log('Admin not found in database');
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
      }

      console.log('Updating profile picture in database...');
      // Update profile picture
      const updateResult = await query(
        'UPDATE users SET profile_picture = ? WHERE user_id = ?',
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

      return NextResponse.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicturePath
      });
      
    } catch (dbError) {
      console.error('Error updating profile picture in database:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : 'Unknown database error' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in admin profile picture upload:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
