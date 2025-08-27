import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify the user
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use parseAuthToken to handle both JWT and legacy token formats
    const tokenData = await parseAuthToken(authToken);
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const { userId: tokenUserId, accountType } = tokenData;

    // Parse the multipart form data
    const formData = await request.formData();

    // Get user ID from form data
    const userId = formData.get('userId');
    if (!userId) {
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }

    // Only allow users to update their own profile picture (or admins)
    if (tokenUserId !== userId.toString() && accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'You are not authorized to update this profile picture' 
      }, { status: 403 });
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

    // Save the profile picture to file system (similar to package uploads)
    const timestamp = Date.now();
    const originalName = profilePicture.name.replace(/\s+/g, '_').toLowerCase();
    const extension = originalName.split('.').pop() || 'jpg';
    const filename = `profile_picture_${timestamp}.${extension}`;

    // Create the directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-pictures', userId.toString());

    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Create file path
    const filePath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await profilePicture.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the relative path
    const profilePicturePath = `/uploads/profile-pictures/${userId}/${filename}`;

    // Update the database with the new profile picture path
    try {
      // First, check if the profile_picture column exists and add it if it doesn't
      const columnCheck = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'profile_picture'
      `) as any[];

      if (columnCheck.length === 0) {
        await query(`ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL AFTER gender`);
      }

      // Update the user's profile picture in the database
      const updateResult = await query(
        `UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE user_id = ?`,
        [profilePicturePath, userId]
      ) as any;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json({
          error: 'User not found or no changes made'
        }, { status: 404 });
      }


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
    return NextResponse.json({
      error: 'Failed to upload profile picture',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
