import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Get admin details from request body
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      username,
      role
    } = body;

    // SECURITY: Validate all required fields are provided
    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'email, password, firstName, lastName, and username are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({
        error: 'Password too weak',
        message: 'Password must be at least 8 characters long'
      }, { status: 400 });
    }

    // Set default role if not provided
    const adminRole = role || 'admin';

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const result = await withTransaction(async (transaction) => {
      // Check if user already exists
      const existingUserResult = await transaction.query(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      ) as any[];

      let userId;

      if (existingUserResult && existingUserResult.length > 0) {
        // User exists, update role
        userId = existingUserResult[0].user_id;
        await transaction.query(
          'UPDATE users SET role = ?, is_verified = 1, is_otp_verified = 1 WHERE user_id = ?',
          ['admin', userId]
        );
      } else {
        // Create new user
        const userResult = await transaction.query(
          `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_otp_verified)
           VALUES (?, ?, ?, ?, ?, 1, 1)`,
          [email, hashedPassword, firstName, lastName, 'admin']
        ) as any;

        userId = userResult.insertId;
      }

      // Check if admin profile exists
      const existingProfileResult = await transaction.query(
        'SELECT id FROM users WHERE user_id = ?',
        [userId]
      ) as any[];

      if (existingProfileResult && existingProfileResult.length > 0) {
        // Update existing profile
        await transaction.query(
          `UPDATE users
           SET username = ?, full_name = ?, admin_role = ?
           WHERE user_id = ?`,
          [username, `${firstName} ${lastName}`, adminRole, userId]
        );
      } else {
        // Create new admin profile
        await transaction.query(
          `INSERT INTO users (user_id, username, full_name, admin_role)
           VALUES (?, ?, ?, ?)`,
          [userId, username, `${firstName} ${lastName}`, adminRole]
        );
      }

      // Check if old admins table exists
      const tablesResult = await transaction.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'admins'
      `) as any[];

      if (tablesResult && tablesResult.length > 0) {
        // Check if admin exists in old table
        const existingOldAdminResult = await transaction.query(
          'SELECT id FROM admins WHERE email = ?',
          [email]
        ) as any[];

        if (existingOldAdminResult && existingOldAdminResult.length > 0) {
          // Update existing admin
          await transaction.query(
            `UPDATE admins
             SET username = ?, password = ?, full_name = ?, role = ?
             WHERE email = ?`,
            [username, hashedPassword, `${firstName} ${lastName}`, adminRole, email]
          );
        } else {
          // Create new admin in old table
          await transaction.query(
            `INSERT INTO admins (username, password, email, full_name, role)
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, `${firstName} ${lastName}`, adminRole]
          );
        }
      }

      return { userId };
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: result.userId,
        email,
        firstName,
        lastName,
        username,
        role: adminRole
      }
    });

  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
