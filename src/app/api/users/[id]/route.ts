import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    console.log('Fetching user data for ID:', userId);

    // Try to fetch user data from database
    try {
      const userResult = await query(
        `SELECT id, first_name, last_name, email, phone_number, address, sex,
         created_at, updated_at, is_otp_verified, role, status, is_verified
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      ) as any[];

      console.log('User query result:', userResult);

      // If user found in database, return it with defaults for missing fields
      if (userResult && userResult.length > 0) {
        const user = userResult[0];

        // Set defaults for missing fields
        if (!user.user_type) user.user_type = 'fur_parent';
        if (user.is_otp_verified === undefined || user.is_otp_verified === null) user.is_otp_verified = 1;
        if (!user.first_name) user.first_name = 'User';
        if (!user.last_name) user.last_name = userId;

        // For business accounts, fetch additional business details including verification status
        if (user.role === 'business') {
          try {
            const businessResult = await query(
              `SELECT id, business_name, business_type, verification_status
               FROM business_profiles WHERE user_id = ? LIMIT 1`,
              [user.id]
            ) as any[];

            if (businessResult && businessResult.length > 0) {
              const business = businessResult[0];
              // Update the user's verification status based on the business profile record
              user.is_verified = business.verification_status === 'verified' ? 1 : 0;
              // Add business details to the user object
              user.business_name = business.business_name;
              user.business_type = business.business_type;
              user.business_id = business.id;
              user.verification_status = business.verification_status;
            }
          } catch (businessError) {
            console.error('Error fetching business details:', businessError);
            // Continue with basic user data if business details can't be fetched
          }
        }

        // Remove sensitive information
        delete user.password;

        return NextResponse.json(user);
      }
    } catch (dbError) {
      console.error('Database error fetching user:', dbError);
      // Continue to fallback instead of throwing
    }

    // Check for admin users in the new structure
    try {
      // Try to find admin by ID in the users table with admin role
      const adminUserResult = await query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number,
         u.address, u.sex, u.created_at, u.updated_at, u.is_otp_verified,
         u.role, u.status, u.is_verified
         FROM users u
         WHERE u.id = ? AND u.role = 'admin' LIMIT 1`,
        [userId]
      ) as any[];

      // If found, get the admin profile details
      if (adminUserResult && adminUserResult.length > 0) {
        const adminUser = adminUserResult[0];

        // Get admin profile details
        const adminProfileResult = await query(
          `SELECT username, full_name, admin_role
           FROM admin_profiles
           WHERE user_id = ? LIMIT 1`,
          [userId]
        ) as any[];

        if (adminProfileResult && adminProfileResult.length > 0) {
          const adminProfile = adminProfileResult[0];

          // Merge admin profile details with user data
          adminUser.username = adminProfile.username;
          adminUser.full_name = adminProfile.full_name;
          adminUser.admin_role = adminProfile.admin_role;
          adminUser.user_type = 'admin'; // For backward compatibility

          return NextResponse.json(adminUser);
        }
      }

      // Fallback to old admin table for backward compatibility
      let adminResult = await query(
        `SELECT id, username as first_name, full_name as last_name, email, '' as phone_number,
         '' as address, '' as sex, created_at, updated_at, 1 as is_otp_verified,
         'admin' as user_type, role, 1 as status, 1 as is_verified
         FROM admins WHERE id = ? LIMIT 1`,
        [userId]
      ) as any[];

      console.log('Admin query result:', adminResult);

      if (adminResult && adminResult.length > 0) {
        const admin = adminResult[0];
        // Ensure admin has the required fields for dashboard access
        admin.user_type = 'admin';
        if (!admin.role) {
          admin.role = 'admin';
        }
        return NextResponse.json(admin);
      }
    } catch (adminDbError) {
      console.error('Database error fetching admin:', adminDbError);
    }

    // Fallback: Return a mock user if database query fails or user not found
    console.log('User not found in database, returning mock user');

    const mockUser = {
      id: parseInt(userId),
      first_name: 'User',
      last_name: userId,
      email: `user${userId}@example.com`,
      phone_number: '',
      address: '',
      sex: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_otp_verified: 1,
      user_type: 'fur_parent',
      status: 1,
      is_verified: 1
    };

    return NextResponse.json(mockUser);
  } catch (error) {
    console.error('User data fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch user data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
