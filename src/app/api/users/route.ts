import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// GET endpoint to fetch users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify admin access
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tokenUserId, accountType] = authToken.split('_');
    
    // Only allow admins to access this endpoint
    if (accountType !== 'admin') {
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

    // Build the query
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let usersQuery = `
      SELECT id, first_name, last_name, email, phone_number, address, 
      sex, created_at, updated_at, is_otp_verified, role, status, is_verified
      FROM users
    `;

    // Add WHERE clauses for filtering
    const whereConditions = [];
    const queryParams = [];

    if (role) {
      whereConditions.push('role = ?');
      queryParams.push(role);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Add WHERE clause to queries if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      countQuery += ` ${whereClause}`;
      usersQuery += ` ${whereClause}`;
    }

    // Add ORDER BY and LIMIT clauses to users query
    usersQuery += ` ORDER BY ${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    usersQuery += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Execute count query
    const countResult = await query(countQuery, queryParams.slice(0, queryParams.length - 2)) as any[];
    const total = countResult[0].total;

    // Execute users query
    const usersResult = await query(usersQuery, queryParams) as any[];

    // Process users to add additional information
    const users = await Promise.all(usersResult.map(async (user) => {
      // Set user_type based on role for backward compatibility
      if (user.role === 'fur_parent') {
        user.user_type = 'user';
      } else {
        user.user_type = user.role; // 'admin' or 'business'
      }

      // For business users, fetch additional business profile information
      if (user.role === 'business') {
        try {
          const businessResult = await query(
            `SELECT id, business_name, business_type, verification_status
             FROM business_profiles
             WHERE user_id = ? LIMIT 1`,
            [user.id]
          ) as any[];

          if (businessResult && businessResult.length > 0) {
            const business = businessResult[0];
            user.business_name = business.business_name;
            user.business_type = business.business_type;
            user.business_id = business.id;
            user.verification_status = business.verification_status;
          }
        } catch (error) {
          console.error('Error fetching business details:', error);
        }
      }

      // Remove sensitive information
      delete user.password;

      return user;
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
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
