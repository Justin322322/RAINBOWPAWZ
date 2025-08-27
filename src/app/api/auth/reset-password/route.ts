import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validatePasswordStrength } from '@/utils/passwordValidation';

// Specify that this route should use the Node.js runtime, not the Edge runtime


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json({
        error: 'Token and password are required'
      }, { status: 400 });
    }

    // Validate password strength using the same criteria as registration
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        error: 'Password does not meet requirements',
        message: passwordValidation.message,
        requirements: passwordValidation.requirements
      }, { status: 400 });
    }

    try {
      // First, check if the password_reset_tokens table exists
      try {
        // Check if the table exists
        const tableExists = await query(
          `SELECT COUNT(*) as count FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
        ) as any[];

        if (tableExists[0].count === 0) {
          // If the table doesn't exist, the token is invalid
          return NextResponse.json({
            error: 'Invalid token. Please request a new password reset.'
          }, { status: 400 });
        }
      } catch (tableCheckError) {
        console.error('Error checking password_reset_tokens table:', tableCheckError);
        return NextResponse.json({
          error: 'An error occurred while validating your token. Please try again later.'
        }, { status: 500 });
      }

      // Check if the token exists at all
      const tokenExistsResult = await query(
        `SELECT * FROM password_reset_tokens WHERE token = ?`,
        [token]
      ) as any[];

      if (!tokenExistsResult || tokenExistsResult.length === 0) {
        return NextResponse.json({
          error: 'Invalid token'
        }, { status: 400 });
      }

      // If token exists, check if it's already been used
      if (tokenExistsResult[0].is_used === 1) {
        return NextResponse.json({
          error: 'This reset link has already been used. Please request a new password reset.'
        }, { status: 400 });
      }

      // Check if the token is valid and hasn't expired
      const tokenResult = await query(
        `SELECT * FROM password_reset_tokens
         WHERE token = ? AND expires_at > NOW() AND is_used = 0`,
        [token]
      ) as any[];

      if (!tokenResult || tokenResult.length === 0) {
        return NextResponse.json({
          error: 'This reset link has expired. Please request a new password reset.'
        }, { status: 400 });
      }

      const resetToken = tokenResult[0];
      const userId = resetToken.user_id;

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password
      await query(
        'UPDATE users SET password = ? WHERE user_id = ?',
        [hashedPassword, userId]
      );

      // Mark the token as used instead of deleting it
      // This allows us to keep track of used tokens and prevents token reuse
      await query(
        'UPDATE password_reset_tokens SET is_used = 1 WHERE token = ?',
        [token]
      );

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (dbError) {
      console.error('Database error in password reset:', dbError);
      
      // In a production environment, we should not simulate success on database errors
      // Instead, return a proper error message
      return NextResponse.json({
        error: 'Database error occurred while resetting password. Please try again later.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error in password reset:', error);
    return NextResponse.json({
      error: 'Failed to reset password',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
