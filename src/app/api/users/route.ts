import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

// GET endpoint to fetch users with filtering and pagination


export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to access this endpoint
    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'You are not authorized to access this resource'
      }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';


    // Calculate offset
    const offset = (page - 1) * limit;

    try {
      // Check if the users table exists and has the required columns
      const tablesResult = await query(
        `SELECT COUNT(*) as count
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
         AND table_name = 'users'`
      ) as any[];

      if (!tablesResult || tablesResult[0].count === 0) {
        return NextResponse.json({
          error: 'Database schema error',
          message: 'Users table does not exist'
        }, { status: 500 });
      }

      // Get column information to check what fields are available
      const columnsResult = await query(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
         AND table_name = 'users'`
      ) as any[];

      const columns = columnsResult.map((col: any) => col.COLUMN_NAME.toLowerCase());

      const hasUserType = columns.includes('user_type');
      const hasRole = columns.includes('role');
      const hasLastLogin = columns.includes('last_login');

      // Check for profile_picture column
      const hasProfilePicture = columns.includes('profile_picture');

      // Build the query dynamically based on available columns
      let selectFields = 'user_id, first_name, last_name, email, phone, address, gender, created_at, updated_at, is_otp_verified, status, is_verified';

      if (hasRole) selectFields += ', role';
      if (hasUserType) selectFields += ', user_type';
      if (hasLastLogin) selectFields += ', last_login';
      if (hasProfilePicture) selectFields += ', profile_picture';

      // SECURITY FIX: Build the query with safe field selection
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      const selectFieldsStr = selectFields;
      let usersQuery = `
        SELECT ${selectFieldsStr}
        FROM users
      `;

      // Add WHERE clauses for filtering
      const whereConditions = [];
      const queryParams = [];

      if (role) {
        // Check for valid role values
        if (role === 'fur_parent') {
          if (hasRole && hasUserType) {
            // Either explicitly set as fur_parent or using older user_type=user
            whereConditions.push('(role = ? OR (role IS NULL AND user_type = "user"))');
            queryParams.push(role);
          } else if (hasRole) {
            whereConditions.push('role = ?');
            queryParams.push(role);
          } else if (hasUserType) {
            whereConditions.push('user_type = "user"');
          }
        } else {
          if (hasRole) {
            whereConditions.push('role = ?');
            queryParams.push(role);
          }
        }
      }

      if (status) {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      if (search) {
        whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      // SECURITY FIX: Add WHERE clause to queries if there are conditions
      if (whereConditions.length > 0) {
        const safeWhereClause = `WHERE ${whereConditions.join(' AND ')}`;
        countQuery += ` ${safeWhereClause}`;
        usersQuery += ` ${safeWhereClause}`;
      }

      // Add ORDER BY and LIMIT clauses to users query
      const validSortColumns = ['id', 'first_name', 'last_name', 'email', 'created_at', 'updated_at', 'status'];
      const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

      usersQuery += ` ORDER BY ${finalSortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      usersQuery += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

      // Build params for users query (without limit/offset as they are inlined)
      const usersParams = [...queryParams];

      // Execute count query
      const countResult = await query(countQuery, queryParams.slice(0, queryParams.length)) as any[];
      const total = countResult[0].total;

      // Execute users query
      const usersResult = await query(usersQuery, usersParams) as any[];

      // Get appeals for all users in one query for better performance
      let userAppeals: { [key: string]: any[] } = {};
      try {
        const userIds = usersResult.map(u => u.user_id).filter(id => id);
        if (userIds.length > 0) {
          const appealsQuery = `
            SELECT
              appeal_id,
              user_id,
              business_id,
              subject,
              message,
              status,
              submitted_at
            FROM appeals
            WHERE user_id IN (${userIds.map(() => '?').join(',')})
            ORDER BY submitted_at DESC
          `;

          const appeals = await query(appealsQuery, userIds) as any[];

          // Group appeals by user ID
          appeals.forEach(appeal => {
            if (!userAppeals[appeal.user_id]) {
              userAppeals[appeal.user_id] = [];
            }
            userAppeals[appeal.user_id].push(appeal);
          });
        }
      } catch (error) {
        console.error('Error fetching user appeals:', error);
        // Continue without appeals data
      }

      // Check for pets and bookings tables existence
      const [petsTableExists, bookingsTableExists] = await Promise.all([
        query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_name = 'pets'`
        ) as Promise<any[]>,
        query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_name = 'bookings'`
        ) as Promise<any[]>
      ]);

      const hasPetsTable = petsTableExists[0].count > 0;
      const hasBookingsTable = bookingsTableExists[0].count > 0;

      // Process users to add additional information
      const users = await Promise.all(usersResult.map(async (user) => {
        try {
          // Set defaults for missing fields
          if (!hasRole) user.role = user.user_type === 'user' ? 'fur_parent' : user.user_type || 'unknown';
          if (!hasUserType) user.user_type = user.role === 'fur_parent' ? 'user' : user.role || 'unknown';
          if (!hasLastLogin) user.last_login = null;

          // Set user_type based on role for backward compatibility
          if (user.role === 'fur_parent' || (user.role === null && user.user_type === 'user')) {
            user.user_type = 'user';
            // Ensure the role is set to fur_parent for consistency
            if (!user.role) user.role = 'fur_parent';
          } else {
            user.user_type = user.role || user.user_type || 'unknown'; // 'admin' or 'business'
          }

          // For business users, fetch additional business profile information
          if (user.role === 'business') {
            try {
              const businessResult = await query(
                `SELECT provider_id as id, name as business_name, provider_type as business_type, application_status as verification_status
                FROM service_providers
                WHERE user_id = ? LIMIT 1`,
                [user.user_id]
              ) as any[];

              if (businessResult && businessResult.length > 0) {
                const business = businessResult[0];
                user.business_name = business.business_name;
                user.business_type = business.business_type;
                user.business_id = business.id;
                user.verification_status = business.verification_status;
              }
            } catch {
              // Silently handle error and continue
            }
          }

          // For fur_parent users, get pet count and completed bookings
          if (user.role === 'fur_parent') {
            // Get pet count if pets table exists
            if (hasPetsTable) {
              try {
                const petsResult = await query(
                  `SELECT COUNT(*) as count FROM pets WHERE user_id = ?`,
                  [user.user_id]
                ) as any[];
                
                user.pets = petsResult[0]?.count || 0;
              } catch (error) {
                console.error(`Error getting pet count for user ${user.user_id}:`, error);
                user.pets = 0;
              }
            } else {
              user.pets = 0;
            }

            // Get completed bookings count if bookings table exists
            if (hasBookingsTable) {
              try {
                const bookingsResult = await query(
                  `SELECT COUNT(*) as count FROM bookings 
                   WHERE user_id = ? AND status = 'completed'`,
                  [user.user_id]
                ) as any[];
                
                user.completedBookings = bookingsResult[0]?.count || 0;
              } catch (error) {
                console.error(`Error getting completed bookings for user ${user.user_id}:`, error);
                user.completedBookings = 0;
              }
            } else {
              user.completedBookings = 0;
            }
          }

          // Add appeals data
          user.appeals = userAppeals[user.user_id] || [];

          // Remove sensitive information
          delete user.password;

          return user;
        } catch {
          // Return the user with basic info to avoid breaking the entire list
          return {
            ...user,
            user_type: user.user_type || 'unknown',
            role: user.role || 'unknown',
            appeals: userAppeals[user.user_id] || [],
            _error: 'User processing error'
          };
        }
      }));

      // Calculate pagination information
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return NextResponse.json({
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (queryError) {
      return NextResponse.json({
        error: 'Database query failed',
        message: queryError instanceof Error ? queryError.message : 'Unknown database error',
        details: JSON.stringify(queryError)
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: JSON.stringify(error)
    }, { status: 500 });
  }
}

