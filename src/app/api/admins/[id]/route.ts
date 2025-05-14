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

    // First, check if the user exists in the users table with role='admin'
    console.log('Admin API: Checking users table for admin with ID:', id);
    const userResult = await query(
      `SELECT id, first_name, last_name, email, role
       FROM users
       WHERE id = ? AND role = 'admin'`,
      [id]
    ) as any[];

    if (userResult && userResult.length > 0) {
      console.log('Admin API: Found admin user in users table');
      const user = userResult[0];

      // Check if there's a corresponding entry in admin_profiles
      console.log('Admin API: Checking admin_profiles for user_id:', id);
      const profileResult = await query(
        `SELECT username, full_name, admin_role
         FROM admin_profiles
         WHERE user_id = ?`,
        [id]
      ) as any[];

      // Create admin data object
      const adminData = {
        id: user.id,
        email: user.email,
        user_type: 'admin',
        role: user.role
      };

      // Add profile data if available
      if (profileResult && profileResult.length > 0) {
        console.log('Admin API: Found admin profile data');
        const profile = profileResult[0];
        adminData.username = profile.username;
        adminData.full_name = profile.full_name;
        adminData.admin_role = profile.admin_role;
      } else {
        // Use user data if profile not available
        console.log('Admin API: No admin profile found, using user data');
        adminData.username = user.first_name.toLowerCase();
        adminData.full_name = `${user.first_name} ${user.last_name}`;
      }

      console.log('Admin API: Returning admin data:', adminData);
      return NextResponse.json(adminData);
    }

    // If not found in users table, try the legacy admins table
    console.log('Admin API: Checking legacy admins table for ID:', id);
    const adminResult = await query(
      'SELECT id, username, email, full_name, role FROM admins WHERE id = ?',
      [id]
    ) as any[];

    // Check if admin exists in legacy table
    if (!adminResult || adminResult.length === 0) {
      console.log('Admin API: Admin not found in legacy admins table');

      // Try to find admin by looking up the corresponding user record for email
      const userEmailResult = await query(
        'SELECT email FROM users WHERE id = ?',
        [id]
      ) as any[];

      if (userEmailResult && userEmailResult.length > 0) {
        const userEmail = userEmailResult[0].email;
        console.log('Admin API: Found user email:', userEmail, 'trying to find admin with same email');

        const adminByEmailResult = await query(
          'SELECT id, username, email, full_name, role FROM admins WHERE email = ?',
          [userEmail]
        ) as any[];

        if (adminByEmailResult && adminByEmailResult.length > 0) {
          const admin = adminByEmailResult[0];
          console.log('Admin API: Found admin by email match in legacy table');

          // Add user_type field to ensure dashboard access works
          admin.user_type = 'admin';

          // Return the admin data
          return NextResponse.json(admin);
        }
      }

      console.log('Admin API: No admin found in any table');
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get the admin data from legacy table
    const admin = adminResult[0];
    console.log('Admin API: Found admin data in legacy table:', admin);

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
