import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Get admin details from request body
    const body = await request.json();
    const { 
      email = 'admin@example.com', 
      password = 'Admin123!', 
      firstName = 'Admin', 
      lastName = 'User',
      username = 'admin',
      role = 'super_admin'
    } = body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Start a transaction
    await query('START TRANSACTION');

    try {
      // Check if user already exists
      const existingUserResult = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      ) as any[];

      let userId;

      if (existingUserResult && existingUserResult.length > 0) {
        // User exists, update role
        userId = existingUserResult[0].id;
        await query(
          'UPDATE users SET role = ?, is_verified = 1, is_otp_verified = 1 WHERE id = ?',
          ['admin', userId]
        );
      } else {
        // Create new user
        const userResult = await query(
          `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_otp_verified)
           VALUES (?, ?, ?, ?, ?, 1, 1)`,
          [email, hashedPassword, firstName, lastName, 'admin']
        ) as any;

        userId = userResult.insertId;
      }

      // Check if admin profile exists
      const existingProfileResult = await query(
        'SELECT id FROM admin_profiles WHERE user_id = ?',
        [userId]
      ) as any[];

      if (existingProfileResult && existingProfileResult.length > 0) {
        // Update existing profile
        await query(
          `UPDATE admin_profiles 
           SET username = ?, full_name = ?, admin_role = ?
           WHERE user_id = ?`,
          [username, `${firstName} ${lastName}`, role, userId]
        );
      } else {
        // Create new admin profile
        await query(
          `INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
           VALUES (?, ?, ?, ?)`,
          [userId, username, `${firstName} ${lastName}`, role]
        );
      }

      // Check if old admins table exists
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'admins'
      `) as any[];

      if (tablesResult && tablesResult.length > 0) {
        // Check if admin exists in old table
        const existingOldAdminResult = await query(
          'SELECT id FROM admins WHERE email = ?',
          [email]
        ) as any[];

        if (existingOldAdminResult && existingOldAdminResult.length > 0) {
          // Update existing admin
          await query(
            `UPDATE admins 
             SET username = ?, password = ?, full_name = ?, role = ?
             WHERE email = ?`,
            [username, hashedPassword, `${firstName} ${lastName}`, role, email]
          );
        } else {
          // Create new admin in old table
          await query(
            `INSERT INTO admins (username, password, email, full_name, role)
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, `${firstName} ${lastName}`, role]
          );
        }
      }

      // Commit the transaction
      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        admin: {
          id: userId,
          email,
          firstName,
          lastName,
          username,
          role
        }
      });
    } catch (error) {
      // Rollback the transaction if something failed
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to create admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
