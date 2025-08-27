import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function POST(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow business accounts to use this endpoint
    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
    }

    // Parse the multipart form data
    const formData = await request.formData();

    // Get user ID from form data
    const userId = formData.get('userId');
    if (!userId) {
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }

    // Only allow users to update their own profile picture
    if (user.userId !== userId.toString()) {
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
      await query(
        'UPDATE users SET profile_picture = ? WHERE user_id = ?',
        [profilePicturePath, userId]
      );
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

