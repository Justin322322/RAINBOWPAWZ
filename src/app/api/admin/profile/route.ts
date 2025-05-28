import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import bcrypt from 'bcryptjs';
import { ensureAdminProfilesTableExists } from './ensure-table';

// GET - Retrieve admin profile data
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Ensure admin_profiles table exists
    await ensureAdminProfilesTableExists();

    // Get admin profile data
    const adminResult = await query(`
      SELECT
        u.user_id as id,
        u.email,
        u.first_name,
        u.last_name,
        u.profile_picture,
        u.created_at,
        u.updated_at,
        ap.username,
        ap.full_name,
        ap.admin_role
      FROM users u
      LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id
      WHERE u.user_id = ? AND u.role = 'admin'
    `, [userId]) as any[];

    if (!adminResult || adminResult.length === 0) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    const admin = adminResult[0];

    // Format response
    return NextResponse.json({
      success: true,
      profile: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        username: admin.username || admin.first_name.toLowerCase(),
        full_name: admin.full_name || `${admin.first_name} ${admin.last_name}`,
        admin_role: admin.admin_role || 'admin',
        profile_picture: admin.profile_picture,
        created_at: admin.created_at,
        updated_at: admin.updated_at
      }
    });

  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin profile' },
      { status: 500 }
    );
  }
}

// PUT - Update admin profile data
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { first_name, last_name, email, current_password, new_password } = body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Ensure admin_profiles table exists
    await ensureAdminProfilesTableExists();

    // Start transaction
    await query('START TRANSACTION');

    try {
      // If password change is requested, verify current password
      if (new_password) {
        if (!current_password) {
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'Current password is required to set a new password' },
            { status: 400 }
          );
        }

        // Get current password hash
        const passwordResult = await query(
          'SELECT password FROM users WHERE user_id = ?',
          [userId]
        ) as any[];

        if (!passwordResult || passwordResult.length === 0) {
          await query('ROLLBACK');
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, passwordResult[0].password);
        if (!isValidPassword) {
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        // Update user with new password
        await query(
          `UPDATE users
           SET first_name = ?, last_name = ?, email = ?, password = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [first_name, last_name, email, hashedNewPassword, userId]
        );
      } else {
        // Update user without password change
        await query(
          `UPDATE users
           SET first_name = ?, last_name = ?, email = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [first_name, last_name, email, userId]
        );
      }

      // Update or create admin profile
      const username = first_name.toLowerCase();
      const full_name = `${first_name} ${last_name}`;

      // Check if admin profile exists
      const existingProfileResult = await query(
        'SELECT id FROM admin_profiles WHERE user_id = ?',
        [userId]
      ) as any[];

      if (existingProfileResult && existingProfileResult.length > 0) {
        // Update existing profile
        await query(
          `UPDATE admin_profiles
           SET username = ?, full_name = ?
           WHERE user_id = ?`,
          [username, full_name, userId]
        );
      } else {
        // Create new admin profile
        await query(
          `INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
           VALUES (?, ?, ?, ?)`,
          [userId, username, full_name, 'admin']
        );
      }

      // Commit transaction
      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json(
      { error: 'Failed to update admin profile' },
      { status: 500 }
    );
  }
}
