import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  try {
    console.log('Admin API: Fetching admin data for ID:', id);

    // Validate ID
    if (!id || isNaN(Number(id))) {
      console.log('Admin API: Invalid admin ID format');
      return NextResponse.json(
        { error: 'Invalid admin ID' },
        { status: 400 }
      );
    }

    // Query the database for the admin
    const adminResult = await query(
      'SELECT id, username, email, full_name, role FROM admins WHERE id = ?',
      [id]
    ) as any[];

    // Check if admin exists
    if (!adminResult || adminResult.length === 0) {
      console.log('Admin API: Admin not found in database for ID:', id);

      // Try to find admin by looking up the corresponding user record
      const userResult = await query(
        'SELECT email FROM users WHERE id = ?',
        [id]
      ) as any[];

      if (userResult && userResult.length > 0) {
        const userEmail = userResult[0].email;
        console.log('Admin API: Found user email:', userEmail, 'trying to find admin with same email');

        const adminByEmailResult = await query(
          'SELECT id, username, email, full_name, role FROM admins WHERE email = ?',
          [userEmail]
        ) as any[];

        if (adminByEmailResult && adminByEmailResult.length > 0) {
          const admin = adminByEmailResult[0];
          console.log('Admin API: Found admin by email match');

          // Add user_type field to ensure dashboard access works
          admin.user_type = 'admin';

          // Return the admin data
          return NextResponse.json(admin);
        }
      }

      console.log('Admin API: No admin found with matching email');
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get the admin data
    const admin = adminResult[0];
    console.log('Admin API: Found admin data:', admin);

    // Add user_type field to ensure dashboard access works
    admin.user_type = 'admin';

    // Return the admin data
    return NextResponse.json(admin);
  } catch (error) {
    console.error('Admin API: Error fetching admin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin data' },
      { status: 500 }
    );
  }
}
