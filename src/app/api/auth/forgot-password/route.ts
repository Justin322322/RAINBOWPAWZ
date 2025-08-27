import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

// Import the consolidated email service
import { sendPasswordResetEmail } from '@/lib/consolidatedEmailService';

// Specify that this route should use the Node.js runtime, not the Edge runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 });
    }

    try {
      // Check if the user exists
      const userResult = await query(
        'SELECT user_id, email FROM users WHERE email = ?',
        [email]
      ) as any[];

      if (!userResult || userResult.length === 0) {
        // Return a specific error message that no account exists with this email
        return NextResponse.json({
          error: 'No account exists with this email address.',
          message: 'No account exists with this email address.'
        }, { status: 404 });
      }

      const userId = userResult[0].user_id;
      console.log(`Processing password reset for user ID: ${userId}, email: ${email}`);

      // Generate a secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');

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
          console.log('Creating password_reset_tokens table...');
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
              FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          console.log('password_reset_tokens table created successfully');
        } else {
          console.log('password_reset_tokens table already exists');
        }
      } catch (tableError) {
        console.error('Error ensuring password reset table exists:', tableError);
        throw new Error('Failed to ensure password reset table exists');
      }

      // Mark any existing tokens for this user as used instead of deleting them
      try {
        await query(
          'UPDATE password_reset_tokens SET is_used = 1 WHERE user_id = ?',
          [userId]
        );
        console.log(`Marked existing tokens as used for user ID: ${userId}`);
      } catch (updateError) {
        console.warn('Failed to mark existing tokens as used:', updateError);
        // Continue even if this fails
      }

      // Store the new token with is_used set to 0 (not used)
      try {
        await query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used) VALUES (?, ?, ?, 0)',
          [userId, resetToken, expiresAt]
        );
        console.log(`Stored new reset token for user ID: ${userId}`);
      } catch (insertError) {
        console.error('Failed to store reset token:', insertError);
        throw new Error('Failed to store reset token');
      }

      // Send the password reset email using the simple email service
      try {
        console.log(`Attempting to send password reset email to: ${email}`);
        // Send email using simple email service
        const emailResult = await sendPasswordResetEmail(email, resetToken);

        if (!emailResult.success) {
          console.error('Email service returned error:', emailResult.error);
          throw new Error(emailResult.error || 'Failed to send email');
        }

        console.log(`Password reset email sent successfully to: ${email}`);
        return NextResponse.json({
          success: true,
          message: 'Password reset instructions have been sent to your email.'
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // For production, be honest about the error
        return NextResponse.json({
          error: 'Failed to send password reset email. Please try again later.'
        }, { status: 500 });
      }
    } catch (dbError) {
      console.error('Database error in forgot password:', dbError);
      return NextResponse.json({
        error: 'Database error occurred while processing your request. Please try again later.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error in forgot password:', error);
    return NextResponse.json({
      error: 'Failed to process password reset request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
