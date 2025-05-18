// Email templates for various notifications

// Base email template with common styling
const baseEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RainbowPaws Notification</title>
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
    .header {
      background-color: #10B981;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
      background-color: #fff;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .button {
      display: inline-block;
      background-color: #10B981;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 25px;
      margin: 20px 0;
      font-weight: normal;
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
    <div class="header">
      <h1>RainbowPaws</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} RainbowPaws - Pet Memorial Services</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

// Welcome email template
export const createWelcomeEmail = (firstName: string, accountType: 'personal' | 'business') => {
  const subject = 'Welcome to Rainbow Paws! 🌈';

  let accountSpecificContent = '';
  if (accountType === 'personal') {
    accountSpecificContent = `
      <p>With your account, you can:</p>
      <ul>
        <li>Create beautiful memorials for your beloved pets</li>
        <li>Connect with compassionate service providers</li>
        <li>Share memories with family and friends</li>
      </ul>
    `;
  } else {
    accountSpecificContent = `
      <p>As a service provider, you can now:</p>
      <ul>
        <li>List your memorial services</li>
        <li>Connect with pet owners in your area</li>
        <li>Manage bookings and appointments</li>
      </ul>
      <p>Your account is currently under review. We'll notify you once your business is verified.</p>
    `;
  }

  const content = `
    <h2>Welcome to Rainbow Paws</h2>
    <p>Dear ${firstName},</p>
    <p>Thank you for joining Rainbow Paws! We're honored to have you as part of our community.</p>
    ${accountSpecificContent}
    ${accountType === 'personal' ? `
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/?showLogin=true" class="button">Get Started</a>
    </div>
    <p>If you have any questions, our support team is here to help.</p>
    ` : ''}
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Password reset email template
export const createPasswordResetEmail = (resetToken: string) => {
  // Make sure we have a valid app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  // Log the link in development mode
  if (process.env.NODE_ENV === 'development') {
  }

  const subject = 'Reset Your Password';

  // Custom template that exactly matches the reference image
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

  return {
    subject,
    html
  };
};

// OTP verification email template
export const createOTPEmail = (otp: string) => {
  const subject = 'Your Verification Code - Rainbow Paws';

  const content = `
    <h2>Your Verification Code</h2>
    <p>Hello,</p>
    <p>Thank you for registering with Rainbow Paws. To complete your account verification, please use the following code:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
        ${otp}
      </div>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <p>If you're having trouble with the verification process, please try the following:</p>
    <ul>
      <li>Make sure you're entering the code exactly as shown above</li>
      <li>Refresh the verification page and try again</li>
      <li>If the code has expired, you can request a new one</li>
    </ul>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Booking confirmation email template
export const createBookingConfirmationEmail = (bookingDetails: {
  customerName: string;
  serviceName: string;
  providerName: string;
  bookingDate: string;
  bookingTime: string;
  petName: string;
  bookingId: string | number;
}) => {
  const subject = 'Booking Confirmation - Rainbow Paws';

  const content = `
    <h2>Booking Confirmation</h2>
    <p>Dear ${bookingDetails.customerName},</p>
    <p>Your booking has been successfully created and is now pending confirmation from the service provider.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Booking Details</h3>
      <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
      <p><strong>Provider:</strong> ${bookingDetails.providerName}</p>
      <p><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
      <p><strong>Time:</strong> ${bookingDetails.bookingTime}</p>
      <p><strong>Pet:</strong> ${bookingDetails.petName}</p>
      <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
    </div>

    <p>You will receive another email once the service provider confirms your booking.</p>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>

    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Booking status update email template
export const createBookingStatusUpdateEmail = (bookingDetails: {
  customerName: string;
  serviceName: string;
  providerName: string;
  bookingDate: string;
  bookingTime: string;
  petName: string;
  bookingId: string | number;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}) => {
  let statusText = '';
  let additionalInfo = '';

  switch (bookingDetails.status) {
    case 'confirmed':
      statusText = 'confirmed';
      additionalInfo = 'Please arrive on time for your appointment.';
      break;
    case 'completed':
      statusText = 'completed';
      additionalInfo = 'Thank you for choosing our services.';
      break;
    case 'cancelled':
      statusText = 'cancelled';
      additionalInfo = 'If you have any questions about this cancellation, please contact us.';
      break;
  }

  const subject = `Booking ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - Rainbow Paws`;

  const content = `
    <h2>Booking ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
    <p>Dear ${bookingDetails.customerName},</p>
    <p>Your booking has been ${statusText}.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Booking Details</h3>
      <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
      <p><strong>Provider:</strong> ${bookingDetails.providerName}</p>
      <p><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
      <p><strong>Time:</strong> ${bookingDetails.bookingTime}</p>
      <p><strong>Pet:</strong> ${bookingDetails.petName}</p>
      <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
      ${bookingDetails.notes ? `<p><strong>Notes:</strong> ${bookingDetails.notes}</p>` : ''}
    </div>

    <p>${additionalInfo}</p>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>

    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Business verification status email templates
export const createBusinessVerificationEmail = (businessDetails: {
  businessName: string;
  contactName: string;
  status: 'approved' | 'rejected' | 'pending' | 'documents_required';
  notes?: string;
}) => {
  let subject = '';
  let statusContent = '';

  switch (businessDetails.status) {
    case 'approved':
      subject = 'Business Verification Approved - Rainbow Paws';
      statusContent = `
        <h2>Business Verification Approved</h2>
        <p>Dear ${businessDetails.contactName},</p>
        <p>Congratulations! Your business <strong>${businessDetails.businessName}</strong> has been verified and approved on Rainbow Paws.</p>
        <p>You can now start managing your services and receiving bookings from pet owners.</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/login" class="button">Login</a>
        </div>
      `;
      break;
    case 'rejected':
      subject = 'Business Verification Update - Rainbow Paws';
      statusContent = `
        <h2>Business Verification Update</h2>
        <p>Dear ${businessDetails.contactName},</p>
        <p>We regret to inform you that your business verification for <strong>${businessDetails.businessName}</strong> has not been approved at this time.</p>
        ${businessDetails.notes ? `
          <div class="info-box">
            <h3 style="margin-top: 0;">Reason</h3>
            <p>${businessDetails.notes}</p>
          </div>
        ` : ''}
        <p>If you have any questions or would like to submit additional information, please contact our support team.</p>
      `;
      break;
    case 'pending':
      subject = 'Business Verification in Progress - Rainbow Paws';
      statusContent = `
        <h2>Business Verification in Progress</h2>
        <p>Dear ${businessDetails.contactName},</p>
        <p>Your business verification for <strong>${businessDetails.businessName}</strong> is currently being reviewed by our team.</p>
        <p>This process typically takes 1-3 business days. We'll notify you once the review is complete.</p>
        <p>Thank you for your patience.</p>
      `;
      break;
    case 'documents_required':
      subject = 'Documents Required for Business Verification - Rainbow Paws';
      statusContent = `
        <h2>Documents Required</h2>
        <p>Dear ${businessDetails.contactName},</p>
        <p>To complete the verification process for <strong>${businessDetails.businessName}</strong>, we need additional documents from you.</p>
        ${businessDetails.notes ? `
          <div class="info-box">
            <h3 style="margin-top: 0;">Required Documents</h3>
            <p>${businessDetails.notes}</p>
          </div>
        ` : ''}
        <p>Please log in to your account and upload the required documents as soon as possible.</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/cremation/documents" class="button">Upload Documents</a>
        </div>
      `;
      break;
  }

  return {
    subject,
    html: baseEmailTemplate(statusContent)
  };
};
