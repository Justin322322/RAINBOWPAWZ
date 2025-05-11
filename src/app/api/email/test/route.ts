import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/unifiedEmailService';

/**
 * API endpoint to test email functionality
 * 
 * This endpoint allows testing the email service by sending a test email.
 * It's useful for verifying that your email configuration is working correctly.
 * 
 * POST /api/email/test
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get the recipient email from the request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        error: 'Email address is required'
      }, { status: 400 });
    }

    // Create the test email content
    const emailData = {
      to: email,
      subject: 'Test Email from Rainbow Paws',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1B4D3E; text-align: center;">Rainbow Paws Email Test</h2>
          <p>Hello,</p>
          <p>This is a test email from Rainbow Paws to verify that the email service is working correctly.</p>
          <p>If you received this email, it means that your email configuration is working properly.</p>
          <p>Email details:</p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT || '587'}</li>
            <li>SMTP Secure: ${process.env.SMTP_SECURE === 'true' ? 'Yes' : 'No'}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px; text-align: center;">
            Rainbow Paws - Pet Memorial Services
          </p>
        </div>
      `
    };

    // Send the test email
    const result = await sendEmail(emailData);

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to send test email',
        message: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also allow GET requests with query parameters for easier testing
export async function GET(request: NextRequest) {
  try {
    // Get the recipient email from the query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        error: 'Email address is required as a query parameter'
      }, { status: 400 });
    }

    // Create the test email content
    const emailData = {
      to: email,
      subject: 'Test Email from Rainbow Paws',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1B4D3E; text-align: center;">Rainbow Paws Email Test</h2>
          <p>Hello,</p>
          <p>This is a test email from Rainbow Paws to verify that the email service is working correctly.</p>
          <p>If you received this email, it means that your email configuration is working properly.</p>
          <p>Email details:</p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT || '587'}</li>
            <li>SMTP Secure: ${process.env.SMTP_SECURE === 'true' ? 'Yes' : 'No'}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px; text-align: center;">
            Rainbow Paws - Pet Memorial Services
          </p>
        </div>
      `
    };

    // Send the test email
    const result = await sendEmail(emailData);

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to send test email',
        message: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
