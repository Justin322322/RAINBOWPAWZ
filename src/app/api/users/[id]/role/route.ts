import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function PUT(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // -2 because the last part is 'role'

    // Validate user ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Get auth token to verify admin access
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tokenUserId, accountType] = authToken.split('_');
    
    // Only allow admins to update user roles
    if (accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'You are not authorized to update user roles' 
      }, { status: 403 });
    }

    // Get role from request body
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !['fur_parent', 'business', 'admin'].includes(role)) {
      return NextResponse.json({
        error: 'Invalid role. Role must be one of: "fur_parent", "business", "admin"'
      }, { status: 400 });
    }

    // Get current user data
    const currentUserResult = await query(
      'SELECT role FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (!currentUserResult || currentUserResult.length === 0) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    const currentRole = currentUserResult[0].role;

    // Start a transaction
    await query('START TRANSACTION');

    try {
      // Update user role in database
      await query(
        'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
        [role, userId]
      );

      // If changing to admin role, create admin profile if it doesn't exist
      if (role === 'admin') {
        // Check if admin profile exists
        const adminProfileResult = await query(
          'SELECT id FROM admin_profiles WHERE user_id = ? LIMIT 1',
          [userId]
        ) as any[];

        if (!adminProfileResult || adminProfileResult.length === 0) {
          // Get user details
          const userDetailsResult = await query(
            'SELECT first_name, last_name FROM users WHERE user_id = ? LIMIT 1',
            [userId]
          ) as any[];

          if (userDetailsResult && userDetailsResult.length > 0) {
            const { first_name, last_name } = userDetailsResult[0];
            
            // Create admin profile
            await query(
              `INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
               VALUES (?, ?, ?, ?)`,
              [userId, `${first_name.toLowerCase()}${last_name.toLowerCase()}`, `${first_name} ${last_name}`, 'admin']
            );
          }
        }
      }

      // If changing from business role to another role, handle business profile
      if (currentRole === 'business' && role !== 'business') {
        // We could either delete the business profile or just leave it
        // For now, we'll leave it in case the user is changed back to business role later
      }

      // Commit the transaction
      await query('COMMIT');

      // Get updated user data to return
      const userResult = await query(
        `SELECT user_id, first_name, last_name, email, phone_number, address, sex,
         created_at, updated_at, is_otp_verified, role, status, is_verified
         FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      ) as any[];

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({
          error: 'Failed to retrieve updated user data'
        }, { status: 500 });
      }

      const user = userResult[0];
      
      // Set user_type based on role for backward compatibility
      if (user.role === 'fur_parent') {
        user.user_type = 'user';
      } else {
        user.user_type = user.role; // 'admin' or 'business'
      }

      // Remove sensitive information
      delete user.password;

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role}`,
        user
      });
    } catch (error) {
      // Rollback the transaction in case of error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update user role',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
