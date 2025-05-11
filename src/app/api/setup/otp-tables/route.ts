import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface SetupResults {
  otpCodesTableExists: boolean;
  otpAttemptsTableExists: boolean;
  isOtpVerifiedColumnExists: boolean;
  otpCodesTableCreated?: boolean;
  otpAttemptsTableCreated?: boolean;
  isOtpVerifiedColumnAdded?: boolean;
}

export async function GET() {
  try {
    // Check if the otp_codes table exists
    const otpCodesTableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'otp_codes'`
    ) as any[];

    // Check if the otp_attempts table exists
    const otpAttemptsTableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'otp_attempts'`
    ) as any[];

    // Check if the users table has the is_otp_verified column
    const isOtpVerifiedColumnExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'is_otp_verified'`
    ) as any[];

    const results: SetupResults = {
      otpCodesTableExists: otpCodesTableExists[0].count > 0,
      otpAttemptsTableExists: otpAttemptsTableExists[0].count > 0,
      isOtpVerifiedColumnExists: isOtpVerifiedColumnExists[0].count > 0
    };

    // Create the tables if they don't exist
    if (!results.otpCodesTableExists) {
      await query(`
        CREATE TABLE otp_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (user_id),
          INDEX (otp_code)
        )
      `);
      results.otpCodesTableCreated = true;
    }

    if (!results.otpAttemptsTableExists) {
      await query(`
        CREATE TABLE otp_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          attempt_type ENUM('generate', 'verify') NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (user_id),
          INDEX (attempt_time)
        )
      `);
      results.otpAttemptsTableCreated = true;
    }

    if (!results.isOtpVerifiedColumnExists) {
      await query(`
        ALTER TABLE users ADD COLUMN is_otp_verified TINYINT(1) DEFAULT 0
      `);
      results.isOtpVerifiedColumnAdded = true;
    }

    return NextResponse.json({
      success: true,
      message: 'OTP tables setup completed',
      results
    });
  } catch (error) {
    console.error('OTP tables setup error:', error);
    return NextResponse.json({
      error: 'Failed to set up OTP tables',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
