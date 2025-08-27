import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { createRailwayTransporter, createRailwaySSLTransporter } from '@/lib/railwayEmailConfig';

export async function POST(request: Request) {
  try {
    const { email, method = 'default' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Test email configuration
    const config = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
      SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
      SMTP_FROM: process.env.SMTP_FROM,
      NODE_ENV: process.env.NODE_ENV,
      DEV_EMAIL_MODE: process.env.DEV_EMAIL_MODE
    };

    console.log('Testing SMTP with config:', config);

    let result;

    if (method === 'railway-starttls') {
      // Test with Railway-specific STARTTLS configuration
      const transporter = createRailwayTransporter();
      const info = await transporter.sendMail({
        from: `"Rainbow Paws" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'SMTP Test - Railway STARTTLS - Rainbow Paws',
        html: '<h1>Railway STARTTLS Test Successful!</h1><p>Your Railway STARTTLS email configuration is working correctly.</p>',
        text: 'Railway STARTTLS Test Successful! Your email configuration is working correctly.'
      });
      result = { success: true, messageId: info.messageId, method: 'railway-starttls' };
    } else if (method === 'railway-ssl') {
      // Test with Railway-specific SSL configuration
      const transporter = createRailwaySSLTransporter();
      const info = await transporter.sendMail({
        from: `"Rainbow Paws" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'SMTP Test - Railway SSL - Rainbow Paws',
        html: '<h1>Railway SSL Test Successful!</h1><p>Your Railway SSL email configuration is working correctly.</p>',
        text: 'Railway SSL Test Successful! Your email configuration is working correctly.'
      });
      result = { success: true, messageId: info.messageId, method: 'railway-ssl' };
    } else {
      // Test with default consolidated email service
      result = await sendEmail({
        to: email,
        subject: 'SMTP Test - Default - Rainbow Paws',
        html: '<h1>Default SMTP Test Successful!</h1><p>Your default email configuration is working correctly.</p>',
        text: 'Default SMTP Test Successful! Your email configuration is working correctly.'
      });
      result.method = 'default';
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? `Test email sent successfully using ${result.method} method` : 'Failed to send test email',
      error: result.error,
      messageId: result.messageId,
      method: result.method,
      config
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
        SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
        SMTP_FROM: process.env.SMTP_FROM,
        NODE_ENV: process.env.NODE_ENV,
        DEV_EMAIL_MODE: process.env.DEV_EMAIL_MODE
      }
    }, { status: 500 });
  }
}