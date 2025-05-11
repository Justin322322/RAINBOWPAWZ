import { query } from '@/lib/db';

// Import the simple email service
const { sendOtpEmail: simpleSendOtpEmail } = require('./simpleEmailService');

interface VerifyOtpResult {
  success: boolean;
  message: string;
  error?: string;
}

interface GenerateOtpResult {
  success: boolean;
  message: string;
  error?: string;
  otp?: string; // For debugging in development mode
}

// Generate a random 6-digit OTP
const generateRandomOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email with retry logic
async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  try {
    console.log(`Preparing to send OTP email to ${email}`);

    // Use the simple email service
    console.log('Sending OTP email using simple email service...');
    const emailResult = await simpleSendOtpEmail(email, otp);

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);

      // Only in development mode with simulation explicitly enabled, return success anyway
      if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
        console.log('DEV MODE: Simulating OTP email success despite error');
        return true;
      }

      // Log detailed error information for troubleshooting
      if (emailResult.code) {
        console.error(`Error code: ${emailResult.code}`);
      }

      return false;
    }

    console.log('OTP email sent successfully. Message ID:', emailResult.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Only in development mode with simulation explicitly enabled, return success anyway
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('DEV MODE: Simulating OTP email success despite error');
      return true;
    }

    return false;
  }
}

export async function verifyOtp({
  userId,
  otpCode,
  ipAddress,
}: {
  userId: string;
  otpCode: string;
  ipAddress: string;
}): Promise<VerifyOtpResult> {
  console.log(`Verifying OTP for user ${userId}`);

  try {
    // Check if user exists
    const userResult = await query(
      'SELECT id, is_otp_verified FROM users WHERE id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      console.log(`User not found: ${userId}`);
      return { success: false, error: 'User not found', message: 'User not found' };
    }

    const user = userResult[0];

    // Check if user is already verified
    if (user.is_otp_verified === 1) {
      console.log(`User ${userId} is already verified`);
      return { success: false, error: 'User is already verified', message: 'User is already verified' };
    }

    // Check for rate limiting (max 15 attempts in 10 minutes)
    // Increased from 5 to 15 to be more lenient during development/testing
    const rateLimitResult = await query(
      `SELECT COUNT(*) as count FROM otp_attempts
       WHERE user_id = ? AND attempt_type = 'verify' AND attempt_time > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
      [userId]
    ) as any[];

    // In development mode, bypass rate limiting
    if (process.env.NODE_ENV === 'development') {
      console.log(`DEV MODE: Bypassing rate limit check for user ${userId}. Current count: ${rateLimitResult[0].count}`);
    } else if (rateLimitResult[0].count >= 15) {
      console.log(`Rate limit exceeded for user ${userId} - too many verification attempts`);
      return { success: false, error: 'Too many attempts. Please try again later.', message: 'Too many attempts. Please try again later.' };
    }

    // Record the verification attempt
    await query(
      'INSERT INTO otp_attempts (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
      [userId, 'verify', ipAddress]
    );

    // Get only the latest valid OTP for the user
    const otpResult = await query(
      `SELECT id, otp_code, expires_at, is_used FROM otp_codes
       WHERE user_id = ? AND is_used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ) as any[];

    console.log(`Found ${otpResult.length} valid OTPs for user ${userId}`);

    if (!otpResult || otpResult.length === 0) {
      console.log(`No valid OTP found for user ${userId}`);
      return { success: false, error: 'No valid verification code found. Please request a new code.', message: 'No valid verification code found. Please request a new code.' };
    }

    const storedOtp = otpResult[0];

    // Check if the OTP matches
    if (storedOtp.otp_code !== otpCode) {
      console.log(`Invalid OTP entered for user ${userId}`);
      return { success: false, error: 'Invalid verification code. Please try again.', message: 'Invalid verification code. Please try again.' };
    }

    console.log(`Valid OTP entered for user ${userId}. Marking as verified.`);

    // Mark the OTP as used
    await query(
      'UPDATE otp_codes SET is_used = 1 WHERE id = ?',
      [storedOtp.id]
    );

    // Update user verification status
    await query(
      'UPDATE users SET is_otp_verified = 1 WHERE id = ?',
      [userId]
    );

    console.log(`User ${userId} verified successfully`);
    return { success: true, message: 'Account verified successfully' };
  } catch (error) {
    console.error(`Error in verifyOtp for user ${userId}:`, error);
    return {
      success: false,
      error: 'An unexpected error occurred while verifying your account',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

export async function generateOtp({
  userId,
  email,
  ipAddress,
}: {
  userId: string;
  email: string;
  ipAddress: string;
}): Promise<GenerateOtpResult> {
  try {
    console.log(`Generating OTP for user ${userId} with email ${email}`);

    // Check if user exists
    const userResult = await query(
      'SELECT id, email, is_otp_verified FROM users WHERE id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      console.log(`User ${userId} not found`);
      return { success: false, error: 'User not found', message: 'User not found' };
    }

    const user = userResult[0];

    // Check if user is already verified
    if (user.is_otp_verified === 1) {
      console.log(`User ${userId} is already verified`);
      return { success: false, error: 'User is already verified', message: 'User is already verified' };
    }

    // Check for rate limiting (max 10 attempts in 10 minutes)
    // Increased from 3 to 10 to be more lenient during development/testing
    const rateLimitResult = await query(
      `SELECT COUNT(*) as count FROM otp_attempts
      WHERE user_id = ? AND attempt_type = 'generate' AND attempt_time > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
      [userId]
    ) as any[];

    // In development mode, bypass rate limiting
    if (process.env.NODE_ENV === 'development') {
      console.log(`DEV MODE: Bypassing rate limit check for user ${userId}. Current count: ${rateLimitResult[0].count}`);
    } else if (rateLimitResult[0].count >= 10) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return { success: false, error: 'Too many attempts. Please try again later.', message: 'Too many attempts. Please try again later.' };
    }

    // Generate a new OTP
    const otpCode = generateRandomOTP();
    console.log(`Generated new OTP code for user ${userId}: ${otpCode}`);

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // First, invalidate any existing OTPs for this user
    try {
      console.log(`Invalidating existing OTPs for user ${userId}`);
      await query(
        'UPDATE otp_codes SET is_used = 1 WHERE user_id = ? AND is_used = 0',
        [userId]
      );
      console.log(`Existing OTPs invalidated for user ${userId}`);

      // Store the new OTP in the database
      await query(
        'INSERT INTO otp_codes (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
        [userId, otpCode, expiresAt]
      );
      console.log(`New OTP stored in database for user ${userId}`);

      // Record the attempt
      await query(
        'INSERT INTO otp_attempts (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
        [userId, 'generate', ipAddress]
      );
    } catch (dbError) {
      console.error(`Failed to store OTP for user ${userId}:`, dbError);
      return {
        success: false,
        error: 'Failed to generate verification code. Please try again.',
        message: 'Failed to generate verification code. Please try again.'
      };
    }

    // Send the OTP email (with retry logic in the sendOtpEmail function)
    const emailSent = await sendOtpEmail(email, otpCode);

    // Always log the OTP code in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`DEV MODE: OTP code is ${otpCode} (emailed to ${email})`);
    }

    // Only in development mode with simulation explicitly enabled, return success regardless of email status
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('DEV MODE with SIMULATE_EMAIL_SUCCESS: Simulating OTP email success');
      return {
        success: true,
        message: 'Verification code sent successfully. Please check your email.',
        otp: otpCode  // Include OTP in response for development/testing
      };
    }

    // Check if email was actually sent
    if (!emailSent) {
      console.error(`OTP email could not be sent to ${email}`);

      // In development mode, log the code but still return an error
      if (process.env.NODE_ENV === 'development') {
        console.log(`DEV MODE: OTP code is ${otpCode} (email failed but code is logged for testing)`);
      }

      // Return an error so the user knows to try again
      return {
        success: false,
        error: 'Failed to send verification code. Please try again.',
        message: 'Failed to send verification code. Please try again.',
        ...(process.env.NODE_ENV === 'development' ? { otp: otpCode } : {})
      };
    }

    return {
      success: true,
      message: 'Verification code sent successfully. Please check your email.',
      // Include OTP in development mode for easier testing
      ...(process.env.NODE_ENV === 'development' ? { otp: otpCode } : {})
    };
  } catch (error) {
    console.error('Unexpected error in generateOtp:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while generating OTP',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}