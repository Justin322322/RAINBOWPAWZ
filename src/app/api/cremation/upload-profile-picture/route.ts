import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { query } from '@/lib/db';

// Function to save profile picture to disk
async function saveProfilePicture(file: File, userId: string): Promise<string> {
  try {
    console.log(`Saving profile picture: ${file.name} for user ${userId}`);

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
    console.log(`Profile picture saved successfully at: ${relativePath}`);

    return relativePath;
  } catch (error) {
    console.error(`Failed to save profile picture:`, error);
    throw new Error(`Failed to save profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();

    // Get user ID from form data
    const userId = formData.get('userId');
    if (!userId) {
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }

    // Get the profile picture file
    const profilePicture = formData.get('profilePicture') as File | null;
    if (!profilePicture || !(profilePicture instanceof File) || profilePicture.size === 0) {
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

    // Update the database with the new profile picture path
    try {
      await query(
        'UPDATE users SET profile_picture = ? WHERE user_id = ?',
        [profilePicturePath, userId]
      );
      console.log(`Profile picture updated in database for user ${userId}: ${profilePicturePath}`);
    } catch (dbError) {
      console.error('Failed to update profile picture in database:', dbError);
      throw new Error('Failed to save profile picture to database');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicturePath
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json({
      error: 'Failed to upload profile picture',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
