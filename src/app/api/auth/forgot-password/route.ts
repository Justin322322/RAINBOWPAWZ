import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

// Import the simple email service
const { sendPasswordResetEmail } = require('@/lib/simpleEmailService');

// Specify that this route should use the Node.js runtime, not the Edge runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log('Password reset request received for email:', email);

    // Validate required fields
    if (!email) {
      console.log('Email is missing in the request');
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 });
    }

    try {
      // Check if the user exists
      const userResult = await query(
        'SELECT id, email FROM users WHERE email = ?',
        [email]
      ) as any[];

      if (!userResult || userResult.length === 0) {
        console.log(`User with email ${email} not found.`);
        // Return a specific error message that no account exists with this email
        return NextResponse.json({
          error: 'No account exists with this email address.',
          message: 'No account exists with this email address.'
        }, { status: 404 });
      }

      console.log(`User found with ID: ${userResult[0].id}`);
      const userId = userResult[0].id;

      // Generate a secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      console.log(`Generated reset token for user ${userId}: ${resetToken}`);
      console.log(`Reset link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

      // Set expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // First, check if the password_reset_tokens table exists
      try {
        // Check if the table exists
        const tableExists = await query(
          `SELECT COUNT(*) as count FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
        ) as any[];

        if (tableExists[0].count === 0) {
          console.log('password_reset_tokens table does not exist. Creating now...');
          // Create the table if it doesn't exist
          await query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              token VARCHAR(100) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              expires_at DATETIME NOT NULL,
              is_used TINYINT(1) DEFAULT 0,
              UNIQUE KEY unique_token (token),
              INDEX idx_user_id (user_id),
              INDEX idx_token (token),
              INDEX idx_expires_at (expires_at),
              INDEX idx_is_used (is_used),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          console.log('Password reset tokens table created');
        } else {
          console.log('password_reset_tokens table exists');
        }
      } catch (tableError) {
        console.error('Error checking/creating password_reset_tokens table:', tableError);
        throw new Error('Failed to ensure password reset table exists');
      }

      // Mark any existing tokens for this user as used instead of deleting them
      try {
        console.log(`Invalidating existing tokens for user ${userId}`);
        await query(
          'UPDATE password_reset_tokens SET is_used = 1 WHERE user_id = ?',
          [userId]
        );
      } catch (updateError) {
        console.error('Error updating existing tokens:', updateError);
      }

      // Store the new token with is_used set to 0 (not used)
      try {
        console.log(`Storing new token for user ${userId} with expiration: ${expiresAt.toISOString()}`);
        await query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used) VALUES (?, ?, ?, 0)',
          [userId, resetToken, expiresAt]
        );
        console.log('Token successfully stored in database');
      } catch (insertError) {
        console.error('Error inserting token into database:', insertError);
        throw new Error('Failed to store reset token');
      }

      // Send the password reset email using the simple email service
      try {
        console.log('Sending password reset email to:', email);

        // In development mode, always log the reset token for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('DEV MODE: Reset token:', resetToken);
          console.log(`DEV MODE: Reset link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
        }

        // Send email using simple email service
        const emailResult = await sendPasswordResetEmail(email, resetToken);

        if (!emailResult.success) {
          console.error('Email service reported failure:', emailResult.error);

          // In development mode with simulation enabled, still return success
          if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
            console.log('DEV MODE: Simulating success despite email error');
            return NextResponse.json({
              success: true,
              message: 'Password reset instructions have been sent to your email.',
              // Include token in development mode for easier testing
              ...(process.env.NODE_ENV === 'development' ? { resetToken } : {})
            });
          }

          throw new Error(emailResult.error || 'Failed to send email');
        }

        console.log('Email sending completed. Message ID:', emailResult.messageId);

        return NextResponse.json({
          success: true,
          message: 'Password reset instructions have been sent to your email.',
          // Include token in development mode for easier testing
          ...(process.env.NODE_ENV === 'development' ? { resetToken } : {})
        });
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);

        // For development environments, still return success
        if (process.env.NODE_ENV === 'development') {
          console.log('DEV MODE: Simulating success despite email error');
          return NextResponse.json({
            success: true,
            message: 'Password reset instructions have been sent to your email.',
            // Include token in development mode for easier testing
            resetToken
          });
        }

        // For production, be honest about the error
        return NextResponse.json({
          error: 'Failed to send password reset email. Please try again later.'
        }, { status: 500 });
      }
    } catch (dbError) {
      console.error('Database error during forgot password:', dbError);

      return NextResponse.json({
        error: 'Database error occurred while processing your request. Please try again later.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      error: 'Failed to process password reset request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
