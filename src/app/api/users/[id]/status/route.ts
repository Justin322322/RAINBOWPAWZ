import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function PUT(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // -2 because the last part is 'status'

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

    let tokenUserId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      tokenUserId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        tokenUserId = parts[0];
        accountType = parts[1];
      }
    }

    // Only allow admins to update user status
    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'You are not authorized to update user status'
      }, { status: 403 });
    }

    // Get status from request body
    const body = await request.json();
    const { status } = body;

    // Validate status - allow active, pending, or restricted
    if (!status || !['active', 'pending', 'restricted'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status. Status must be one of: "active", "pending", "restricted"'
      }, { status: 400 });
    }

    // Update user status in database (simplified for now)
    const updateResult = await query(
      `UPDATE users
       SET status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [status, userId]
    ) as any;

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({
        error: 'User not found or no changes made'
      }, { status: 404 });
    }

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
      message: `User status updated to ${status}`,
      user
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update user status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
