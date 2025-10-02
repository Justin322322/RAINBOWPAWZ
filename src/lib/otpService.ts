import { query } from '@/lib/db';

// Import the consolidated email service
import { sendOtpEmail as simpleSendOtpEmail } from '@/lib/consolidatedEmailService';

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
    const emailResult = await simpleSendOtpEmail(email, otp);

    if (!emailResult.success) {
      return false;
    }

    return true;
  } catch {
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
  try {
    // Check if user exists
    const userResult = await query(
      'SELECT user_id, is_otp_verified FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return { success: false, error: 'User not found', message: 'User not found' };
    }

    const user = userResult[0];

    // Check if user is already verified
    if (user.is_otp_verified === 1) {
      return { success: false, error: 'User is already verified', message: 'User is already verified' };
    }

    // Check for rate limiting (max 15 attempts in 10 minutes); skip gracefully if columns not present
    try {
      const rateLimitResult = await query(
        `SELECT COUNT(*) as count FROM auth_tokens
         WHERE user_id = ? AND attempt_type = 'verify' AND attempt_time > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
        [userId]
      ) as any[];
      if (rateLimitResult[0].count >= 15) {
        return { success: false, error: 'Too many attempts. Please try again later.', message: 'Too many attempts. Please try again later.' };
      }
    } catch {}

    // Record the verification attempt (best-effort; skip if schema lacks columns)
    try {
      await query(
        'INSERT INTO auth_tokens (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
        [userId, 'verify', ipAddress]
      );
    } catch {}

    // Get only the latest valid OTP for the user
    const otpResult = await query(
      `SELECT id, token_value, expires_at, is_used FROM auth_tokens
       WHERE user_id = ? AND token_type = 'otp_code' AND is_used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ) as any[];

    if (!otpResult || otpResult.length === 0) {
      return { success: false, error: 'No valid verification code found. Please request a new code.', message: 'No valid verification code found. Please request a new code.' };
    }

    const storedOtp = otpResult[0];

    // Check if the OTP matches
    if (storedOtp.token_value !== otpCode) {
      return { success: false, error: 'Invalid verification code. Please try again.', message: 'Invalid verification code. Please try again.' };
    }

    // Mark the OTP as used
    await query(
      'UPDATE auth_tokens SET is_used = 1 WHERE id = ?',
      [storedOtp.id]
    );

    // Update user verification status
    await query(
      'UPDATE users SET is_otp_verified = 1 WHERE user_id = ?',
      [userId]
    );

    return { success: true, message: 'Account verified successfully' };
  } catch (error) {
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
    // Check if user exists
    const userResult = await query(
      'SELECT user_id, email, is_otp_verified FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return { success: false, error: 'User not found', message: 'User not found' };
    }

    const user = userResult[0];

    // Check if user is already verified
    if (user.is_otp_verified === 1) {
      return { success: false, error: 'User is already verified', message: 'User is already verified' };
    }

    // Check for rate limiting (max 10 attempts in 10 minutes); skip gracefully if columns not present
    try {
      const rateLimitResult = await query(
        `SELECT COUNT(*) as count FROM auth_tokens
        WHERE user_id = ? AND attempt_type = 'generate' AND attempt_time > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
        [userId]
      ) as any[];
      if (rateLimitResult[0].count >= 10) {
        return { success: false, error: 'Too many attempts. Please try again later.', message: 'Too many attempts. Please try again later.' };
      }
    } catch {}

    // Generate a new OTP
    const otpCode = generateRandomOTP();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // First, invalidate any existing OTPs for this user
    try {
      await query(
        "UPDATE auth_tokens SET is_used = 1 WHERE user_id = ? AND token_type = 'otp_code' AND is_used = 0",
        [userId]
      );
    } catch {
      return {
        success: false,
        error: 'Failed to generate verification code. Please try again.',
        message: 'Failed to generate verification code. Please try again.'
      };
    }

    // Store the new OTP in the database (critical)
    try {
      await query(
        "INSERT INTO auth_tokens (user_id, token_type, token_value, expires_at, ip_address) VALUES (?, 'otp_code', ?, ?, ?)",
        [userId, otpCode, expiresAt, ipAddress]
      );
    } catch {
      return {
        success: false,
        error: 'Failed to generate verification code. Please try again.',
        message: 'Failed to generate verification code. Please try again.'
      };
    }

    // Best-effort attempt logging with optional columns; ignore failures
    try {
      const attemptMeta = JSON.stringify({ otpLength: String(otpCode).length, maskedOtpTail: String(otpCode).slice(-2) });
      // Use a different token_type to avoid unique constraint conflict
      await query(
        "INSERT INTO auth_tokens (user_id, attempt_type, token_type, token_value, expires_at, attempts_data, ip_address) VALUES (?, 'generate', 'verification', NULL, ?, ?, ?)",
        [userId, expiresAt, attemptMeta, ipAddress]
      );
    } catch {}

    // Send the OTP email (with retry logic in the sendOtpEmail function)
    const emailSent = await sendOtpEmail(email, otpCode);

    // Check if email was actually sent
    if (!emailSent) {
      return {
        success: false,
        error: 'Failed to send verification code. Please try again.',
        message: 'Failed to send verification code. Please try again.'
      };
    }

    return {
      success: true,
      message: 'Verification code sent successfully. Please check your email.'
    };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred while generating OTP',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
