import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
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

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

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

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

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

    // **🔥 FIX: Validate password change outside transaction to return proper status codes**
    let hashedNewPassword: string | null = null;
    if (new_password) {
      if (!current_password) {
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
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, passwordResult[0].password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Hash new password
      hashedNewPassword = await bcrypt.hash(new_password, 10);
    }

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const _result = await withTransaction(async (transaction) => {
      // Update user data
      if (hashedNewPassword) {
        // Update user with new password
        await transaction.query(
          `UPDATE users
           SET first_name = ?, last_name = ?, email = ?, password = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [first_name, last_name, email, hashedNewPassword, userId]
        );
      } else {
        // Update user without password change
        await transaction.query(
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
      const existingProfileResult = await transaction.query(
        'SELECT id FROM admin_profiles WHERE user_id = ?',
        [userId]
      ) as any[];

      if (existingProfileResult && existingProfileResult.length > 0) {
        // Update existing admin profile
        await transaction.query(
          `UPDATE admin_profiles
           SET username = ?, full_name = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [username, full_name, userId]
        );
      } else {
        // Create new admin profile
        await transaction.query(
          `INSERT INTO admin_profiles (user_id, username, full_name, admin_role, created_at, updated_at)
           VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
          [userId, username, full_name]
        );
      }

      return { success: true };
    });

    // **🔥 FIX: Fetch updated profile data outside transaction**
    const updatedAdminResult = await query(`
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

    if (!updatedAdminResult || updatedAdminResult.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve updated profile' }, { status: 500 });
    }

    const admin = updatedAdminResult[0];

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
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
    console.error('Error updating admin profile:', error);
    return NextResponse.json({
      error: 'Failed to update admin profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
