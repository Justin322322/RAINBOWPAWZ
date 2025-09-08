import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
    }

    // Get the profile picture from database
    const result = await query(
      'SELECT profile_picture FROM users WHERE user_id = ?',
      [userId]
    ) as any[];

    if (result.length === 0 || !result[0].profile_picture) {
      return NextResponse.json({ error: 'Profile picture not found' }, { status: 404 });
    }

    const profilePicture = result[0].profile_picture;

    // If it's already a data URL, check size and handle appropriately
    if (profilePicture.startsWith('data:')) {
      // Calculate approximate size
      const sizeInBytes = profilePicture.length * 0.75; // Base64 is ~33% larger than binary
      
      // If image is very large (>2MB), suggest using file-based storage instead
      if (sizeInBytes > 2 * 1024 * 1024) {
        console.warn(`Large profile image detected for user ${userId}: ${Math.round(sizeInBytes / 1024 / 1024)}MB`);
        
        // For very large images, return a compressed version or suggest re-upload
        return NextResponse.json({ 
          success: true, 
          imageData: profilePicture,
          warning: 'Image is large and may cause performance issues'
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        imageData: profilePicture 
      });
    }

    // If it's a file path (legacy), return the path
    return NextResponse.json({ 
      success: true, 
      imagePath: profilePicture 
    });

  } catch (error) {
    console.error('Error fetching profile image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile image' },
      { status: 500 }
    );
  }
}
