import { query } from '@/lib/db';
import { sendEmail } from '../app/api/email/serverEmailService';

interface VerifyOtpResult {
  success: boolean;
  message: string;
  error?: string;
}

interface GenerateOtpResult {
  success: boolean;
  message: string;
  error?: string;
}

// Generate a random 6-digit OTP
const generateRandomOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create OTP email template
const createOTPEmail = (email: string, otp: string) => {
  const subject = 'Your Verification Code - Rainbow Paws';
  const html = `
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
      <h2 style='color: #10B981; text-align: center;'>Your Verification Code</h2>
      <p>Hello,</p>
      <p>Thank you for registering with Rainbow Paws. To complete your account verification, please use the following code:</p>
      <div style='text-align: center; margin: 30px 0;'>
        <div style='background-color: #f3f4f6; padding: 20px; border-radius: 10px; font-size: 24px; letter-spacing: 5px; font-weight: bold;'>
          ${otp}
        </div>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <hr style='border: 1px solid #eee; margin: 30px 0;' />
      <p style='color: #666; font-size: 12px; text-align: center;'>
        Rainbow Paws - Pet Memorial Services
      </p>
    </div>
  `;

  return { to: email, subject, html };
};

export async function verifyOtp({
  userId,
  otpCode,
  ipAddress,
}: {
  userId: string;
  otpCode: string;
  ipAddress: string;
}): Promise<VerifyOtpResult> {
  // Check if user exists
  const userResult = await query(
    'SELECT id, is_otp_verified FROM users WHERE id = ? LIMIT 1',
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

  // Check for rate limiting (max 5 attempts in 10 minutes)
  const rateLimitResult = await query(
    `SELECT COUNT(*) as count FROM otp_attempts
     WHERE user_id = ? AND attempt_type = 'verify' AND attempt_time > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
    [userId]
  ) as any[];

  if (rateLimitResult[0].count >= 5) {
    return { success: false, error: 'Too many attempts. Please try again later.', message: 'Too many attempts. Please try again later.' };
  }

  // Record the verification attempt
  await query(
    'INSERT INTO otp_attempts (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
    [userId, 'verify', ipAddress]
  );

  // Get the latest valid OTP for the user
  const otpResult = await query(
    `SELECT id, otp_code, expires_at, is_used FROM otp_codes
     WHERE user_id = ? AND is_used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  ) as any[];

  if (!otpResult || otpResult.length === 0) {
    return { success: false, error: 'No valid verification code found. Please request a new code.', message: 'No valid verification code found. Please request a new code.' };
  }

  const storedOtp = otpResult[0];

  // Check if the OTP matches
  if (storedOtp.otp_code !== otpCode) {
    return { success: false, error: 'Invalid verification code. Please try again.', message: 'Invalid verification code. Please try again.' };
  }

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

  return { success: true, message: 'Account verified successfully' };
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

    // Check for rate limiting (max 3 attempts in 10 minutes)
    const rateLimitResult = await query(
      `SELECT COUNT(*) as count FROM otp_attempts
      WHERE user_id = ? AND attempt_type = 'generate' AND attempt_time > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
      [userId]
    ) as any[];

    if (rateLimitResult[0].count >= 3) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return { success: false, error: 'Too many attempts. Please try again later.', message: 'Too many attempts. Please try again later.' };
    }

    // Always generate and send a new OTP - don't check for existing ones
    // This change ensures that refreshing the page will generate a new OTP
    // NOTE: We're removing the check for existing OTPs here to ensure new codes are generated

    // Generate a new OTP
    const otpCode = generateRandomOTP();
    console.log(`Generated new OTP code for user ${userId}`);

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store the OTP in the database
    await query(
      'INSERT INTO otp_codes (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );

    // Record the attempt
    await query(
      'INSERT INTO otp_attempts (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
      [userId, 'generate', ipAddress]
    );

    // Send the OTP via email
    try {
      console.log(`Sending OTP email to ${email}`);
      const { to, subject, html } = createOTPEmail(email, otpCode);
      await sendEmail(to, subject, html);
      console.log('OTP email sent successfully');
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return { success: false, error: 'Failed to send verification code. Please try again.', message: 'Failed to send verification code. Please try again.' };
    }

    return { success: true, message: 'Verification code sent successfully. Please check your email.' };
    
  } catch (error) {
    console.error('Unexpected error in generateOtp:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred while generating OTP', 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
} 