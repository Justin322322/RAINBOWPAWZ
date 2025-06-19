import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function PUT(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // -2 because the last part is 'restrict'

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

    const [_tokenUserId, accountType] = authToken.split('_');

    // Only allow admins to restrict/unrestrict users
    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'You are not authorized to restrict/unrestrict users'
      }, { status: 403 });
    }

    // Get restriction details from request body
    const body = await request.json();
    const {
      restricted,
      reason = '',
      duration = 'indefinite',
      reportCount = 0
    } = body;

    // Validate restricted flag
    if (restricted === undefined || typeof restricted !== 'boolean') {
      return NextResponse.json({
        error: 'The "restricted" field is required and must be a boolean'
      }, { status: 400 });
    }

    // Start a transaction
    await query('START TRANSACTION');

    try {
      // Check if user exists
      const userResult = await query(
        'SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1',
        [userId]
      ) as any[];

      if (!userResult || userResult.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json({
          error: 'User not found'
        }, { status: 404 });
      }

      // Check if user_restrictions table exists, create if not
      const tablesResult = await query(
        "SHOW TABLES LIKE 'user_restrictions'"
      ) as any[];

      if (!tablesResult || tablesResult.length === 0) {
        await query(`
          CREATE TABLE user_restrictions (
            restriction_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            reason TEXT,
            restriction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration VARCHAR(50) DEFAULT 'indefinite',
            report_count INT DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          )
        `);
      }

      if (restricted) {
        // Check if user is already restricted
        const restrictionResult = await query(
          'SELECT restriction_id FROM user_restrictions WHERE user_id = ? AND is_active = 1 LIMIT 1',
          [userId]
        ) as any[];

        if (restrictionResult && restrictionResult.length > 0) {
          // Update existing restriction
          await query(
            `UPDATE user_restrictions
             SET reason = ?,
                 duration = ?,
                 report_count = ?,
                 restriction_date = NOW()
             WHERE user_id = ? AND is_active = 1`,
            [reason, duration, reportCount, userId]
          );
        } else {
          // Create new restriction
          await query(
            `INSERT INTO user_restrictions (user_id, reason, duration, report_count)
             VALUES (?, ?, ?, ?)`,
            [userId, reason, duration, reportCount]
          );
        }

        // Update user status to restricted (only use status field for now)
        await query(
          `UPDATE users
           SET status = 'restricted',
               updated_at = NOW()
           WHERE user_id = ?`,
          [userId]
        );
      } else {
        // Remove restriction
        await query(
          'UPDATE user_restrictions SET is_active = 0 WHERE user_id = ? AND is_active = 1',
          [userId]
        );

        // Update user status to active (only use status field for now)
        await query(
          `UPDATE users
           SET status = 'active',
               updated_at = NOW()
           WHERE user_id = ?`,
          [userId]
        );
      }

      // Commit the transaction
      await query('COMMIT');

      // Get updated user data to return
      const updatedUserResult = await query(
        `SELECT user_id, first_name, last_name, email, phone, address, gender,
         created_at, updated_at, is_otp_verified, role, status, is_verified
         FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      ) as any[];

      if (!updatedUserResult || updatedUserResult.length === 0) {
        return NextResponse.json({
          error: 'Failed to retrieve updated user data'
        }, { status: 500 });
      }

      const user = updatedUserResult[0];

      // Set user_type based on role for backward compatibility
      if (user.role === 'fur_parent') {
        user.user_type = 'user';
      } else {
        user.user_type = user.role; // 'admin' or 'business'
      }

      // Get restriction details if user is restricted
      if (restricted) {
        const restrictionResult = await query(
          `SELECT restriction_id, reason, restriction_date, duration, report_count, is_active
           FROM user_restrictions
           WHERE user_id = ? AND is_active = 1
           LIMIT 1`,
          [userId]
        ) as any[];

        if (restrictionResult && restrictionResult.length > 0) {
          user.restriction = restrictionResult[0];
        }
      }

      // Remove sensitive information
      delete user.password;

      return NextResponse.json({
        success: true,
        message: restricted ? 'User has been restricted' : 'User restriction has been removed',
        user
      });
    } catch (error) {
      // Rollback the transaction in case of error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update user restriction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
