import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';
import { testPhoneNumberFormatting } from '@/lib/httpSmsService';

export async function PUT(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // -2 because the last part is 'update'

    // Validate user ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Get auth token to verify the user is updating their own profile
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse auth token to get user ID and account type
    const authData = await parseAuthToken(authToken);
    if (!authData) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const { userId: tokenUserId, accountType } = authData;

    // Only allow users to update their own profile (or admins to update any profile)
    if (tokenUserId !== userId && accountType !== 'admin') {
      return NextResponse.json({
        error: 'You are not authorized to update this profile'
      }, { status: 403 });
    }

    // Get update data from request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      sex
    } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json({
        error: 'First name and last name are required'
      }, { status: 400 });
    }

    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({
          error: 'Invalid email format'
        }, { status: 400 });
      }
    }

    // Format phone number if provided
    let formattedPhone = null;
    if (phoneNumber && phoneNumber.trim()) {
      const formatResult = testPhoneNumberFormatting(phoneNumber.trim());
      if (formatResult.success && formatResult.formatted) {
        formattedPhone = formatResult.formatted;
      } else {
        return NextResponse.json({
          error: 'Invalid phone number format. Please enter a valid Philippine mobile number.'
        }, { status: 400 });
      }
    }

    // Get current user data to preserve profile picture
    const currentUserResult = await query(
      'SELECT profile_picture FROM users WHERE user_id = ?',
      [userId]
    ) as any[];

    const currentProfilePicture = currentUserResult.length > 0 ? currentUserResult[0].profile_picture : null;

    // Update user in database (preserve existing profile_picture)
    const updateResult = await query(
      `UPDATE users
       SET first_name = ?,
           last_name = ?,
           email = ?,
           phone = ?,
           address = ?,
           gender = ?,
           profile_picture = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [firstName, lastName, email || null, formattedPhone, address || null, sex || null, currentProfilePicture, userId]
    ) as any;

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({
        error: 'User not found or no changes made'
      }, { status: 404 });
    }

    // Get updated user data to return
    const userResult = await query(
      `SELECT user_id, first_name, last_name, email, phone, address, gender, profile_picture,
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
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
