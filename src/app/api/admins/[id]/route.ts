import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  try {

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Invalid admin ID' },
        { status: 400 }
      );
    }

    // Check if the user exists in the users table with role='admin'
    const userResult = await query(
      `SELECT user_id, first_name, last_name, email, role, profile_picture
       FROM users
       WHERE user_id = ? AND role = 'admin'`,
      [id]
    ) as any[];

    if (userResult && userResult.length > 0) {
      const user = userResult[0];

      // Create admin data object
      const adminData: any = {
        id: user.user_id,
        email: user.email,
        user_type: 'admin',
        role: user.role,
        username: user.first_name.toLowerCase(),
        full_name: `${user.first_name} ${user.last_name}`,
        profile_picture: user.profile_picture
      };

      return NextResponse.json(adminData);
    }

    // Admin not found
    return NextResponse.json(
      { error: 'Admin not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error in admin API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
