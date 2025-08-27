import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
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

    // If it's already a data URL, return it as JSON
    if (profilePicture.startsWith('data:')) {
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
    console.error('Error fetching profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile picture' },
      { status: 500 }
    );
  }
}