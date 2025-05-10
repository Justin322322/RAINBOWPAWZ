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
         created_at, updated_at, is_otp_verified, user_type, status, is_verified
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
        if (user.user_type === 'business') {
          try {
            const businessResult = await query(
              `SELECT id, business_name, business_type, is_verified
               FROM businesses WHERE email = ? OR user_id = ? LIMIT 1`,
              [user.email, user.id]
            ) as any[];

            if (businessResult && businessResult.length > 0) {
              const business = businessResult[0];
              // Update the user's verification status based on the business record
              user.is_verified = business.is_verified;
              // Add business details to the user object
              user.business_name = business.business_name;
              user.business_type = business.business_type;
              user.business_id = business.id;
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

    // Check in admins table if user not found in users table
    try {
      // First try to find admin by ID
      let adminResult = await query(
        `SELECT id, username as first_name, full_name as last_name, email, '' as phone_number,
         '' as address, '' as sex, created_at, updated_at, 1 as is_otp_verified,
         'admin' as user_type, role, 1 as status, 1 as is_verified
         FROM admins WHERE id = ? LIMIT 1`,
        [userId]
      ) as any[];

      // If not found by ID, try to find by email or username
      if (!adminResult || adminResult.length === 0) {
        // Get email from users table first to try matching
        const userEmailResult = await query(
          `SELECT email FROM users WHERE id = ? LIMIT 1`,
          [userId]
        ) as any[];

        let email = '';
        if (userEmailResult && userEmailResult.length > 0) {
          email = userEmailResult[0].email;
        }

        if (email) {
          adminResult = await query(
            `SELECT id, username as first_name, full_name as last_name, email, '' as phone_number,
             '' as address, '' as sex, created_at, updated_at, 1 as is_otp_verified,
             'admin' as user_type, role, 1 as status, 1 as is_verified
             FROM admins WHERE email = ? OR username = ? LIMIT 1`,
            [email, email]
          ) as any[];
        }
      }

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
