import { NextRequest, NextResponse } from 'next/server';
import { testSMS, validateTwilioConfig } from '@/lib/smsService';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// Helper function to get user from auth token
async function getUserFromToken(request: NextRequest) {
  const authToken = getAuthTokenFromRequest(request);

  if (!authToken) {
    return { success: false, user: null };
  }

  const [userId, accountType] = authToken.split('_');

  if (!userId || !accountType) {
    return { success: false, user: null };
  }

  // Get user details from database
  const userResult = await query(
    'SELECT user_id, role FROM users WHERE user_id = ?',
    [userId]
  ) as any[];

  if (!userResult || userResult.length === 0) {
    return { success: false, user: null };
  }

  const user = userResult[0];

  return {
    success: true,
    user: {
      id: userId,
      accountType,
      role: user.role
    }
  };
}

/**
 * Test SMS functionality
 * POST /api/sms/test
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from auth token
    const authResult = await getUserFromToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to test SMS
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        error: 'Phone number is required'
      }, { status: 400 });
    }

    // Validate Twilio configuration
    const configValidation = validateTwilioConfig();
    if (!configValidation.isValid) {
      return NextResponse.json({
        error: 'Twilio not configured properly',
        missingVars: configValidation.missingVars
      }, { status: 500 });
    }

    // Test SMS
    const result = await testSMS(phoneNumber);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error testing SMS:', error);
    return NextResponse.json({
      error: 'Failed to test SMS'
    }, { status: 500 });
  }
}

/**
 * Get SMS configuration status
 * GET /api/sms/test
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from auth token
    const authResult = await getUserFromToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to check SMS config
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const configValidation = validateTwilioConfig();

    return NextResponse.json({
      isConfigured: configValidation.isValid,
      missingVars: configValidation.missingVars,
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER
    });

  } catch (error) {
    console.error('Error checking SMS configuration:', error);
    return NextResponse.json({
      error: 'Failed to check SMS configuration'
    }, { status: 500 });
  }
}
