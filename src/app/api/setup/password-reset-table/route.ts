import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type SetupResults = {
  passwordResetTableExists?: boolean;
  passwordResetTableCreated?: boolean;
};

export async function GET() {
  try {
    // Check if the password_reset_tokens table exists
    const passwordResetTableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
    ) as any[];

    const results: SetupResults = {
      passwordResetTableExists: passwordResetTableExists[0].count > 0
    };

    // Create the table if it doesn't exist
    if (!results.passwordResetTableExists) {
      await query(`
        CREATE TABLE password_reset_tokens (
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
      results.passwordResetTableCreated = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset table setup completed',
      results
    });
  } catch (error) {
    console.error('Error setting up password reset table:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to set up password reset table',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
