import nodemailer from 'nodemailer';

// This file is only imported on the server side
// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // Check if SMTP credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials are not properly configured');
      throw new Error('Email service not properly configured');
    }

    // Log the email attempt
    console.log('Attempting to send email with transporter:', {
      service: 'gmail',
      user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '...' : 'not set',
      to,
      subject
    });

    const info = await transporter.sendMail({
      from: `"Rainbow Paws" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Don't throw the error, just return a failure object
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const createPasswordResetEmail = (email: string, resetToken: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your Password - Rainbow Paws';
  const html = `
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
      <h2 style='color: #10B981; text-align: center;'>Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style='text-align: center; margin: 30px 0;'>
        <a href='${resetLink}'
           style='background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block;'>
          Reset Password
        </a>
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour for security reasons.</p>
      <hr style='border: 1px solid #eee; margin: 30px 0;' />
      <p style='color: #666; font-size: 12px; text-align: center;'>
        Rainbow Paws - Pet Memorial Services
      </p>
    </div>
  `;

  return { to: email, subject, html };
};

export const createWelcomeEmail = (email: string, firstName: string, accountType: 'personal' | 'business') => {
  const subject = 'Welcome to Rainbow Paws! 🌈';
  const accountTypeText = accountType === 'business' ? ' of pet memorial service providers' : '';

  let accountSpecificContent = '';
  if (accountType === 'personal') {
    accountSpecificContent = `
      <p>With your account, you can:</p>
      <ul style='color: #444;'>
        <li>Create beautiful memorials for your beloved pets</li>
        <li>Connect with compassionate service providers</li>
        <li>Share memories with family and friends</li>
      </ul>
    `;
  } else {
    accountSpecificContent = `
      <p>As a service provider, you can now:</p>
      <ul style='color: #444;'>
        <li>List your memorial services</li>
        <li>Connect with pet owners in your area</li>
        <li>Manage bookings and appointments</li>
      </ul>
    `;
  }

  const html = `
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
      <h2 style='color: #10B981; text-align: center;'>Welcome to Rainbow Paws</h2>
      <p>Dear ${firstName},</p>
      <p>Thank you for joining Rainbow Paws! We're honored to have you as part of our community${accountTypeText}.</p>
      ${accountSpecificContent}
      <div style='text-align: center; margin: 30px 0;'>
        <a href='${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/login'
           style='background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block;'>
          Get Started
        </a>
      </div>
      <p>If you have any questions, our support team is here to help.</p>
      <hr style='border: 1px solid #eee; margin: 30px 0;' />
      <p style='color: #666; font-size: 12px; text-align: center;'>
        Rainbow Paws - Pet Memorial Services<br>
        Providing dignified and compassionate memorial services for your beloved companions
      </p>
    </div>
  `;

  return { to: email, subject, html };
};
