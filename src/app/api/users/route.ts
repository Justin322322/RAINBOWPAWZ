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

      // DEBUG: Log column availability
      console.log('[Users API DEBUG] Column availability:', {
        hasUserType,
        hasRole,
        hasLastLogin,
        hasProfilePicture
      });

      // DEBUG: Show all users in database before filtering
      try {
        const allUsersDebug = await query('SELECT user_id, role, user_type, email FROM users ORDER BY user_id') as any[];
        console.log(`[Users API DEBUG] Total users in database: ${allUsersDebug.length}`);
        console.log('[Users API DEBUG] All users in DB:');
        allUsersDebug.forEach((u: any) => {
          console.log(`  - User ID ${u.user_id}: role="${u.role || 'NULL'}", user_type="${u.user_type || 'NULL'}", email="${u.email}"`);
        });
        
        // Count by role
        const roleCount: { [key: string]: number } = {};
        allUsersDebug.forEach((u: any) => {
          const roleKey = u.role || 'NULL';
          roleCount[roleKey] = (roleCount[roleKey] || 0) + 1;
        });
        console.log('[Users API DEBUG] Users grouped by role:', roleCount);
      } catch (debugError) {
        console.error('[Users API DEBUG] Error fetching all users for debug:', debugError);
      }

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

      console.log('[Users API DEBUG] Filtering by role:', role);

      if (role) {
        // Check for valid role values
        if (role === 'fur_parent') {
          if (hasRole && hasUserType) {
            // Match users who are fur_parents in multiple ways:
            // 1. role = 'fur_parent' explicitly
            // 2. role IS NULL AND user_type = 'user' (legacy users)
            // 3. user_type = 'user' (catch-all for user accounts)
            const condition = '(role = ? OR role = "user" OR (role IS NULL AND user_type = "user") OR user_type = "user")';
            whereConditions.push(condition);
            queryParams.push(role);
            console.log('[Users API DEBUG] Fur parent condition (both columns):', condition);
          } else if (hasRole) {
            // If we only have role column, check for both 'fur_parent' and 'user'
            const condition = '(role = ? OR role = "user")';
            whereConditions.push(condition);
            queryParams.push(role);
            console.log('[Users API DEBUG] Fur parent condition (role only):', condition);
          } else if (hasUserType) {
            const condition = 'user_type = "user"';
            whereConditions.push(condition);
            console.log('[Users API DEBUG] Fur parent condition (user_type only):', condition);
          }
        } else {
          if (hasRole) {
            whereConditions.push('role = ?');
            queryParams.push(role);
            console.log('[Users API DEBUG] Other role condition:', `role = '${role}'`);
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
      console.log('[Users API DEBUG] Count query:', countQuery);
      console.log('[Users API DEBUG] Count query params:', queryParams);
      const countResult = await query(countQuery, queryParams.slice(0, queryParams.length)) as any[];
      const total = countResult[0].total;
      console.log(`[Users API DEBUG] Total users matching filter: ${total}`);

      // Execute users query
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`[Users API DEBUG] Fetching users with role filter: "${role || 'ALL'}"`);
      console.log('[Users API DEBUG] Full SQL Query:', usersQuery);
      console.log('[Users API DEBUG] Query params:', usersParams);
      const usersResult = await query(usersQuery, usersParams) as any[];
      console.log(`[Users API DEBUG] Query returned ${usersResult?.length || 0} users out of ${total} total`);
      
      // DEBUG: Show ALL returned user IDs with their roles
      if (usersResult.length > 0) {
        console.log('[Users API DEBUG] ALL user IDs returned:');
        usersResult.forEach((u: any, index: number) => {
          console.log(`  ${index + 1}. User ID ${u.user_id}: role="${u.role || 'NULL'}", user_type="${u.user_type || 'NULL'}", email="${u.email}"`);
        });
        
        console.log('[Users API DEBUG] Sample user data:', {
          first: {
            user_id: usersResult[0].user_id,
            role: usersResult[0].role,
            user_type: usersResult[0].user_type,
            email: usersResult[0].email
          },
          ...(usersResult.length > 1 && {
            last: {
              user_id: usersResult[usersResult.length - 1].user_id,
              role: usersResult[usersResult.length - 1].role,
              user_type: usersResult[usersResult.length - 1].user_type,
              email: usersResult[usersResult.length - 1].email
            }
          })
        });
      }
      console.log('═══════════════════════════════════════════════════════════');

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

