import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const userId = pathParts[pathParts.length - 1];


  try {
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Try to fetch user data from database
    try {
      const userResult = await query(
        `SELECT user_id as id, first_name, last_name, email, phone, address, gender, profile_picture,
         created_at, updated_at, is_otp_verified, role, status, is_verified
         FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      ) as any[];

      // If user found in database, return it with defaults for missing fields
      if (userResult && userResult.length > 0) {
        const user = userResult[0];

        // Set defaults for missing fields
        if (user.is_otp_verified === undefined || user.is_otp_verified === null) user.is_otp_verified = 1;
        if (!user.first_name) user.first_name = 'User';
        if (!user.last_name) user.last_name = userId;

        // Set user_type based on role for backward compatibility
        if (user.role === 'fur_parent' || user.role === 'user') {
          user.user_type = 'user';
        } else {
          user.user_type = user.role; // 'admin' or 'business'
        }

        // Ensure id field is set correctly
        if (!user.id && user.user_id) {
          user.id = user.user_id;
        }

        // For fur_parent users, get pet count and completed bookings
        if (user.role === 'fur_parent' || user.role === 'user') {
          // Check if pets table exists
          const petsTableExists = await query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = 'pets'`
          ) as any[];

          const hasPetsTable = petsTableExists[0].count > 0;
          
          // Get pet count if the table exists
          if (hasPetsTable) {
            try {
              const petsResult = await query(
                `SELECT COUNT(*) as count FROM pets WHERE user_id = ?`,
                [user.id]
              ) as any[];
              
              user.pets = petsResult[0]?.count || 0;
            } catch (error) {
              console.error(`[User API] Error getting pet count:`, error);
              user.pets = 0;
            }
          } else {
            user.pets = 0;
          }

          // Check if bookings table exists
          const bookingsTableExists = await query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = 'bookings'`
          ) as any[];

          const hasBookingsTable = bookingsTableExists[0].count > 0;
          
          // Get completed bookings count if the table exists
          if (hasBookingsTable) {
            try {
              const bookingsResult = await query(
                `SELECT COUNT(*) as count FROM bookings 
                 WHERE user_id = ? AND status = 'completed'`,
                [user.id]
              ) as any[];
              
              user.completedBookings = bookingsResult[0]?.count || 0;
            } catch (error) {
              console.error(`[User API] Error getting completed bookings:`, error);
              user.completedBookings = 0;
            }
          } else {
            user.completedBookings = 0;
          }
        }

        // For business accounts, fetch additional business details including verification status
        if (user.role === 'business') {
          try {
            // Look up data in service_providers table instead of service_providers
            const serviceProviderResult = await query(
              `SELECT id, name, provider_type, application_status
               FROM service_providers WHERE user_id = ? LIMIT 1`,
              [user.id]
            ) as any[];

            if (serviceProviderResult && serviceProviderResult.length > 0) {
              const provider = serviceProviderResult[0];

              // Set verification status based on actual data from the database
              user.is_verified = provider.application_status === 'approved' ? 1 : 0;

              // Add business details to the user object
              user.business_name = provider.name;
              user.business_type = provider.provider_type;
              user.business_id = provider.id;

              // Include application_status field
              user.application_status = provider.application_status;

              // Add the full service_provider object for complete data access
              user.service_provider = provider;

              // Ensure user_type is set to 'business' for backward compatibility
              user.user_type = 'business';
            } else {
            }
          } catch (businessError) {
            console.error(`[User API] Error fetching business details:`, businessError);
            // Continue with basic user data if service provider details can't be fetched
          }
        }

        // Remove sensitive information
        delete user.password;

        return NextResponse.json(user);
      } else {
      }
    } catch (dbError) {
      console.error(`[User API] Database error:`, dbError);
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
        const userResult = await query(
          `SELECT username, full_name, admin_role
           FROM users
           WHERE user_id = ? LIMIT 1`,
          [userId]
        ) as any[];

        if (userResult && userResult.length > 0) {
          const user = userResult[0];

          // Merge admin profile details with user data
          adminUser.username = user.username;
          adminUser.full_name = user.full_name;
          adminUser.admin_role = user.admin_role;
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
      console.error(`[User API] Admin database error:`, adminDbError);
    }

    // User not found
    return NextResponse.json({
      error: 'User not found',
      message: 'No user found with the provided ID'
    }, { status: 404 });
  } catch (error) {
    console.error(`[User API] Unexpected error:`, error);
    return NextResponse.json({
      error: 'Failed to fetch user data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
