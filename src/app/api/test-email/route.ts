import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/consolidatedEmailService';



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, testToken } = body;

    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 });
    }

    // Use provided test token or generate one
    const token = testToken || 'test-token-' + Date.now();

    console.log('Testing email service with:', {
      email,
      token,
      smtpUser: process.env.SMTP_USER ? 'configured' : 'missing',
      smtpPass: process.env.SMTP_PASS ? 'configured' : 'missing',
      smtpHost: process.env.SMTP_HOST || 'default',
      smtpPort: process.env.SMTP_PORT || 'default',
      nodeEnv: process.env.NODE_ENV
    });

    // Test the password reset email function
    const result = await sendPasswordResetEmail(email, token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
        details: {
          email,
          token,
          environment: process.env.NODE_ENV,
          smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        code: result.code,
        details: {
          email,
          environment: process.env.NODE_ENV,
          smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test email service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Return current email configuration status
  return NextResponse.json({
    emailServiceStatus: {
      smtpUser: process.env.SMTP_USER ? 'configured' : 'missing',
      smtpPass: process.env.SMTP_PASS ? 'configured' : 'missing',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpSecure: process.env.SMTP_SECURE || 'false',
      nodeEnv: process.env.NODE_ENV || 'development',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
      railwayUrl: process.env.RAILWAY_STATIC_URL || 'not set'
    },
    instructions: [
      'Set SMTP_USER and SMTP_PASS environment variables',
      'Ensure SMTP_HOST and SMTP_PORT are correct',
      'For Gmail, use app-specific password',
      'Set NEXT_PUBLIC_APP_URL or RAILWAY_STATIC_URL for proper reset links'
    ]
  });
}