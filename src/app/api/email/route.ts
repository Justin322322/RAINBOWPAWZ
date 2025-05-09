import { NextResponse } from 'next/server';
import { sendEmail, createPasswordResetEmail, createWelcomeEmail } from './serverEmailService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, email, firstName, resetToken, accountType } = body;

    console.log('Email request received:', {
      type,
      email,
      firstName,
      resetToken,
      accountType
    });

    let emailResult;

    // Send the appropriate email based on type
    if (type === 'reset' && email && resetToken) {
      const { to, subject, html } = createPasswordResetEmail(email, resetToken);
      emailResult = await sendEmail(to, subject, html);
    }
    else if (type === 'welcome' && email && firstName) {
      const { to, subject, html } = createWelcomeEmail(email, firstName, accountType || 'personal');
      emailResult = await sendEmail(to, subject, html);
    }
    else {
      return NextResponse.json({
        error: 'Invalid email type or missing required parameters'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Email sent to ${email} (${type})`,
      messageId: emailResult.messageId
    });
  } catch (error) {
    console.error('Email processing error:', error);
    return NextResponse.json({
      error: 'Failed to process email request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}