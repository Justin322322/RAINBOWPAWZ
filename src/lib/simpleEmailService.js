// Simple, reliable email service
const nodemailer = require('nodemailer');
const { query } = require('./db');

// Base email template with clean, modern design
const baseEmailTemplate = (title, content) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #10B981;
          text-align: center;
          margin-top: 20px;
          margin-bottom: 20px;
          font-size: 24px;
        }
        .content {
          padding: 0 20px;
        }
        .button {
          display: inline-block;
          background-color: #10B981;
          color: white !important;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: normal;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .code-container {
          text-align: center;
          margin: 30px 0;
        }
        .code {
          background-color: #f3f4f6;
          padding: 15px 20px;
          border-radius: 10px;
          font-size: 24px;
          letter-spacing: 5px;
          font-weight: bold;
          display: inline-block;
        }
        .info-box {
          background-color: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Rainbow Paws - Pet Memorial Services</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Create a transporter with environment variables
const createTransporter = () => {


  // For production, check if SMTP credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {



    throw new Error('Email service not properly configured');
  }

  // Create real transporter for actual email sending

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} [options.text] - Email plain text content
 * @param {string} [options.from] - Sender email
 * @returns {Promise<Object>} - Result object with success flag and message ID
 */
const sendEmail = async (options) => {
  try {

    // Create transporter
    const transporter = createTransporter();

    // Prepare mail options
    const mailOptions = {
      from: options.from || `"Rainbow Paws" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@rainbowpaws.com'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);


    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {



    // Log detailed error information for troubleshooting

    if (error.code === 'EAUTH') {
    } else if (error.code === 'ESOCKET') {
    } else if (error.code === 'ETIMEDOUT') {
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
      code: error.code
    };
  }
};

/**
 * Send a welcome email
 */
const sendWelcomeEmail = async (email, firstName, accountType) => {
  const subject = 'Welcome to Rainbow Paws';
  const title = 'Welcome to Rainbow Paws';

  const content = `
    <p>Hello ${firstName},</p>
    <p>Thank you for joining Rainbow Paws. We're excited to have you as a ${accountType === 'business' ? 'business partner' : 'fur parent'}.</p>
    <p>You can now access all our features and services.</p>
    ${accountType === 'personal' ? `
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?showLogin=true" class="button" style="color: white !important; text-decoration: none;">
        Get Started
      </a>
    </div>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    ` : ''}
  `;

  const html = baseEmailTemplate(title, content);

  return sendEmail({ to: email, subject, html });
};

/**
 * Send a password reset email
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const subject = 'Reset Your Password';
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #10B981;
          text-align: center;
          margin-top: 20px;
          margin-bottom: 20px;
          font-size: 24px;
        }
        .content {
          padding: 0 20px;
        }
        .button {
          display: inline-block;
          background-color: #10B981;
          color: white !important;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: normal;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Reset Your Password</h1>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div class="button-container">
            <a href="${resetLink}" class="button" style="color: white !important; text-decoration: none;">Reset Password</a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour for security reasons.</p>
        </div>
        <div class="footer">
          <p>Rainbow Paws - Pet Memorial Services</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
};

/**
 * Send an OTP verification email
 */
const sendOtpEmail = async (email, otp) => {
  const subject = 'Your Verification Code';
  const title = 'Your Verification Code';

  const content = `
    <p>Hello,</p>
    <p>Thank you for registering with Rainbow Paws. To complete your account verification, please use the following code:</p>
    <div class="code-container">
      <div class="code">${otp}</div>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
  `;

  const html = baseEmailTemplate(title, content);

  return sendEmail({ to: email, subject, html });
};

/**
 * Send a booking confirmation email
 */
const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  const subject = 'Booking Confirmation';
  const title = 'Booking Confirmation';

  const content = `
    <p>Hello ${bookingDetails.customerName},</p>
    <p>Your booking has been confirmed. Here are the details:</p>
    <div class="info-box">
      <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
      <p><strong>Provider:</strong> ${bookingDetails.providerName}</p>
      <p><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
      <p><strong>Time:</strong> ${bookingDetails.bookingTime}</p>
      <p><strong>Pet:</strong> ${bookingDetails.petName}</p>
      <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
    </div>
    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/user/furparent_dashboard/bookings" class="button" style="color: white !important; text-decoration: none;">
        View Booking
      </a>
    </div>
  `;

  const html = baseEmailTemplate(title, content);

  return sendEmail({ to: email, subject, html });
};

/**
 * Send a business verification email
 */
const sendBusinessVerificationEmail = async (email, businessDetails) => {
  let statusText = '';
  let title = 'Business Verification Update';
  let emailType = 'business_verification';

  switch (businessDetails.status) {
    case 'approved':
      title = 'Business Verification Approved';
      statusText = 'has been verified and approved';
      emailType = 'business_approval';
      break;
    case 'rejected':
      title = 'Business Verification Update';
      statusText = 'verification has been declined';
      emailType = 'business_rejection';
      break;
    case 'documents_required':
      title = 'Additional Documents Required';
      statusText = 'requires additional documentation';
      emailType = 'business_documents_required';
      break;
    default:
      title = 'Business Verification Update';
      statusText = 'status has been updated';
      emailType = 'business_verification';
  }

  const subject = title;

  const content = `
    <p>Dear ${businessDetails.contactName},</p>
    <p>Your business <strong>${businessDetails.businessName}</strong> ${statusText} on Rainbow Paws.</p>
    ${businessDetails.notes ? `<p><strong>Notes:</strong> ${businessDetails.notes}</p>` : ''}
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" class="button" style="color: white !important; text-decoration: none;">
        ${businessDetails.status === 'approved' ? 'Login' : 'Go to Dashboard'}
      </a>
    </div>
    <p>If you have any questions, please contact our support team.</p>
  `;

  const html = baseEmailTemplate(title, content);

  // Add metadata to help with logging
  const metadata = {
    businessName: businessDetails.businessName,
    status: businessDetails.status,
    emailType: emailType
  };

  return sendEmail({
    to: email,
    subject,
    html,
    metadata
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendBookingConfirmationEmail,
  sendBusinessVerificationEmail
};

