// Simple, reliable email service
const nodemailer = require('nodemailer');

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
  // Check if SMTP credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ ERROR: SMTP credentials are not properly configured');
    throw new Error('Email service not properly configured');
  }

  // Check if we're in simulation mode (only for development/testing)
  if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
    console.log('🔔 SIMULATION MODE: Creating simulated email transporter');
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 SIMULATION: Would send email to:', mailOptions.to);
        console.log('📑 SIMULATION: Subject:', mailOptions.subject);

        // For OTP emails, extract and log the code
        if (mailOptions.subject.includes('Verification Code')) {
          const otpMatch = mailOptions.html.match(/(\d{6})/);
          if (otpMatch) {
            console.log('🔑 SIMULATION: OTP code is', otpMatch[1]);
          }
        }

        // For password reset emails, extract and log the token
        if (mailOptions.subject.includes('Reset Your Password')) {
          const tokenMatch = mailOptions.html.match(/token=([a-zA-Z0-9_-]{64})/);
          if (tokenMatch) {
            console.log('🔑 SIMULATION: Reset token is', tokenMatch[1]);
            console.log(`🔗 SIMULATION: Reset link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${tokenMatch[1]}`);
          } else {
            // Try a more general pattern if the specific one fails
            const generalMatch = mailOptions.html.match(/token=([^"&'\s]+)/);
            if (generalMatch) {
              console.log('🔑 SIMULATION: Reset token is', generalMatch[1]);
              console.log(`🔗 SIMULATION: Reset link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${generalMatch[1]}`);
            }
          }
        }

        return {
          messageId: `simulated-${Date.now()}`,
          accepted: [mailOptions.to],
          rejected: []
        };
      }
    };
  }

  // Create real transporter for actual email sending
  console.log('📧 Creating real email transporter with SMTP settings:');
  console.log(`- Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`- Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`- Secure: ${process.env.SMTP_SECURE === 'true'}`);
  console.log(`- User: ${process.env.SMTP_USER.substring(0, 3)}...`);

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
    console.log(`Attempting to send email to ${options.to}`);

    // Create transporter
    const transporter = createTransporter();

    // Prepare mail options
    const mailOptions = {
      from: options.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);

    // Only in development mode with simulation explicitly enabled, return success anyway
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('DEV MODE: Simulating email success despite error');
      return {
        success: true,
        messageId: `simulated-error-${Date.now()}`
      };
    }

    // Log detailed error information for troubleshooting
    console.error('Email sending failed with details:');
    console.error('- To:', options.to);
    console.error('- Subject:', options.subject);
    console.error('- Error:', error.message);

    if (error.code === 'EAUTH') {
      console.error('Authentication error. Check your SMTP credentials.');
    } else if (error.code === 'ESOCKET') {
      console.error('Socket error. Check your SMTP host and port settings.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. Check your network and SMTP server settings.');
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
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button" style="color: white !important; text-decoration: none;">
        Go to Dashboard
      </a>
    </div>
    <p>If you have any questions, please don't hesitate to contact us.</p>
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

  switch (businessDetails.status) {
    case 'approved':
      title = 'Business Verification Approved';
      statusText = 'has been verified and approved';
      break;
    case 'rejected':
      title = 'Business Verification Update';
      statusText = 'verification has been declined';
      break;
    case 'documents_required':
      title = 'Additional Documents Required';
      statusText = 'requires additional documentation';
      break;
    default:
      title = 'Business Verification Update';
      statusText = 'status has been updated';
  }

  const subject = title;

  const content = `
    <p>Dear ${businessDetails.contactName},</p>
    <p>Your business <strong>${businessDetails.businessName}</strong> ${statusText} on Rainbow Paws.</p>
    ${businessDetails.notes ? `<p><strong>Notes:</strong> ${businessDetails.notes}</p>` : ''}
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cremation/dashboard" class="button" style="color: white !important; text-decoration: none;">
        Go to Dashboard
      </a>
    </div>
    <p>If you have any questions, please contact our support team.</p>
  `;

  const html = baseEmailTemplate(title, content);

  return sendEmail({ to: email, subject, html });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendBookingConfirmationEmail,
  sendBusinessVerificationEmail
};
