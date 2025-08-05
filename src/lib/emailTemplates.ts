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
      <a href="${getServerAppUrl()}/?showLogin=true" class="button">Get Started</a>
    </div>
    <p>If you have any questions, our support team is here to help.</p>
    ` : ''}
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

import { getServerAppUrl } from '@/utils/appUrl';

// Password reset email template
export const createPasswordResetEmail = (resetToken: string) => {
  // Use dynamic app URL detection
  const appUrl = getServerAppUrl();
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
      <a href="${getServerAppUrl()}/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>

    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Booking status update email template with timeline dots
export const createBookingStatusUpdateEmail = (bookingDetails: {
  customerName: string;
  serviceName: string;
  providerName: string;
  bookingDate: string;
  bookingTime: string;
  petName: string;
  bookingId: string | number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}) => {
  let statusText = '';
  let additionalInfo = '';
  let timelineHtml = '';

  switch (bookingDetails.status) {
    case 'pending':
      statusText = 'pending confirmation';
      additionalInfo = 'Your booking has been submitted and is awaiting confirmation from the service provider.';
      timelineHtml = createTimelineHtml('pending');
      break;
    case 'confirmed':
      statusText = 'confirmed';
      additionalInfo = 'We have confirmed your booking. Please arrive on time for your appointment.';
      timelineHtml = createTimelineHtml('confirmed');
      break;
    case 'in_progress':
      statusText = 'in progress';
      additionalInfo = 'Your pet is being cared for with the utmost respect and compassion.';
      timelineHtml = createTimelineHtml('in_progress');
      break;
    case 'completed':
      statusText = 'completed';
      additionalInfo = 'Your service has been completed. Thank you for choosing our services during this difficult time.';
      timelineHtml = createTimelineHtml('completed');
      break;
    case 'cancelled':
      statusText = 'cancelled';
      additionalInfo = 'If you have any questions about this cancellation, please contact us.';
      timelineHtml = ''; // No timeline for cancelled bookings
      break;
  }

  const subject = `Booking ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - Rainbow Paws`;

  const content = `
    <h2>Booking ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
    <p>Dear ${bookingDetails.customerName},</p>
    <p>Your booking has been ${statusText}.</p>

    ${timelineHtml}

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
      <a href="${getServerAppUrl()}/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>

    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Helper function to create timeline HTML for email
function createTimelineHtml(currentStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed'): string {
  const steps = [
    { id: 'pending', title: 'Booking Created', description: 'Your booking has been submitted', icon: '●' },
    { id: 'confirmed', title: 'Booking Confirmed', description: 'We have confirmed your booking', icon: '●' },
    { id: 'in_progress', title: 'Service in Progress', description: 'Your pet is being cared for', icon: '●' },
    { id: 'completed', title: 'Service Completed', description: 'Your service has been completed', icon: '●' }
  ];

  const currentIndex = steps.findIndex(step => step.id === currentStatus);

  return `
    <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; font-family: Arial, sans-serif;">
      <h3 style="margin-top: 0; color: #1f2937; text-align: center; font-size: 18px;">Service Progress</h3>

      <!-- Email-safe table layout for timeline -->
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 500px; margin: 20px auto;">
        <!-- Progress line row -->
        <tr>
          <td colspan="${steps.length}" style="height: 40px; padding: 0;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 20px;">
              <tr>
                <td style="width: 50px;"></td>
                <td style="height: 3px; background-color: #e5e7eb;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: ${currentIndex > 0 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0}%; height: 3px; background-color: #10b981;">
                    <tr><td></td></tr>
                  </table>
                </td>
                <td style="width: 50px;"></td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Steps row -->
        <tr>
          ${steps.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const stepWidth = Math.floor(100 / steps.length);

            return `
              <td style="width: ${stepWidth}%; text-align: center; vertical-align: top; padding: 10px 5px;">
                <!-- Circle using table for better email compatibility -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 50px; height: 50px; margin: 0 auto 15px; background-color: ${isCompleted ? '#10b981' : '#ffffff'}; border: ${isCompleted ? 'none' : '2px solid #d1d5db'}; border-radius: 50px;">
                  <tr>
                    <td style="text-align: center; vertical-align: middle; color: ${isCompleted ? 'white' : '#6b7280'}; font-weight: bold; font-size: 16px; line-height: 1;">
                      ${isCompleted ? '✓' : step.icon}
                    </td>
                  </tr>
                </table>

                <!-- Text -->
                <div style="font-size: 14px; font-weight: 600; color: ${isCompleted ? '#10b981' : '#6b7280'}; margin-bottom: 8px; line-height: 1.2;">
                  ${step.title}
                </div>
                <div style="font-size: 12px; color: #6b7280; line-height: 1.3;">
                  ${step.description}
                </div>
              </td>
            `;
          }).join('')}
        </tr>
      </table>
    </div>
  `;
}

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
          <a href="${getServerAppUrl()}/login" class="button">Login</a>
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
          <a href="${getServerAppUrl()}/cremation/documents" class="button">Upload Documents</a>
        </div>
      `;
      break;
  }

  return {
    subject,
    html: baseEmailTemplate(statusContent)
  };
};

// Refund notification email template
export const createRefundNotificationEmail = (refundDetails: {
  customerName: string;
  bookingId: string | number;
  petName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
  paymentMethod: string;
  estimatedDays?: number;
  notes?: string;
}) => {
  let subject = '';
  let statusContent = '';
  let additionalInfo = '';

  switch (refundDetails.status) {
    case 'pending':
      subject = 'Refund Request Received - Rainbow Paws';
      statusContent = `
        <h2>Refund Request Received</h2>
        <p>Dear ${refundDetails.customerName},</p>
        <p>We have received your refund request for booking #${refundDetails.bookingId}.</p>
        <p>Your request is currently being reviewed by our team.</p>
      `;
      additionalInfo = 'We will process your refund request within 1-2 business days and notify you of the outcome.';
      break;
    case 'processing':
      subject = 'Refund Being Processed - Rainbow Paws';
      statusContent = `
        <h2>Refund Being Processed</h2>
        <p>Dear ${refundDetails.customerName},</p>
        <p>Your refund request for booking #${refundDetails.bookingId} has been approved and is now being processed.</p>
      `;
      if (refundDetails.paymentMethod === 'gcash') {
        additionalInfo = `Your refund will be processed back to your GCash account within ${refundDetails.estimatedDays || '5-10'} business days.`;
      } else {
        additionalInfo = 'Our support team will contact you regarding the refund arrangements for your cash payment.';
      }
      break;
    case 'processed':
      subject = 'Refund Completed - Rainbow Paws';
      statusContent = `
        <h2>Refund Completed</h2>
        <p>Dear ${refundDetails.customerName},</p>
        <p>Your refund for booking #${refundDetails.bookingId} has been successfully processed.</p>
      `;
      if (refundDetails.paymentMethod === 'gcash') {
        additionalInfo = 'The refund amount has been credited back to your GCash account. Please allow up to 24 hours for the amount to reflect in your account.';
      } else {
        additionalInfo = 'Please check with our support team for the status of your cash refund arrangement.';
      }
      break;
    case 'failed':
      subject = 'Refund Processing Failed - Rainbow Paws';
      statusContent = `
        <h2>Refund Processing Issue</h2>
        <p>Dear ${refundDetails.customerName},</p>
        <p>We encountered an issue while processing your refund for booking #${refundDetails.bookingId}.</p>
      `;
      additionalInfo = 'Our support team will contact you within 24 hours to resolve this issue and complete your refund.';
      break;
    case 'cancelled':
      subject = 'Refund Request Cancelled - Rainbow Paws';
      statusContent = `
        <h2>Refund Request Cancelled</h2>
        <p>Dear ${refundDetails.customerName},</p>
        <p>Your refund request for booking #${refundDetails.bookingId} has been cancelled.</p>
      `;
      additionalInfo = 'If you have any questions about this cancellation, please contact our support team.';
      break;
  }

  const content = `
    ${statusContent}

    <div class="info-box">
      <h3 style="margin-top: 0;">Refund Details</h3>
      <p><strong>Booking ID:</strong> #${refundDetails.bookingId}</p>
      <p><strong>Pet Name:</strong> ${refundDetails.petName}</p>
      <p><strong>Refund Amount:</strong> ₱${parseFloat(refundDetails.amount.toString()).toFixed(2)}</p>
      <p><strong>Payment Method:</strong> ${refundDetails.paymentMethod.toUpperCase()}</p>
      <p><strong>Reason:</strong> ${refundDetails.reason}</p>
      ${refundDetails.notes ? `<p><strong>Notes:</strong> ${refundDetails.notes}</p>` : ''}
    </div>

    <p>${additionalInfo}</p>

    ${refundDetails.status !== 'failed' ? `
    <div style="text-align: center;">
      <a href="${getServerAppUrl()}/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>
    ` : ''}

    <p>If you have any questions about your refund, please don't hesitate to contact our support team.</p>
    <p>Thank you for your understanding.</p>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};

// Application decline email template
export const createApplicationDeclineEmail = (applicationDetails: {
  businessName: string;
  contactName: string;
  reason: string;
}) => {
  const subject = 'Application Status Update - Rainbow Paws';

  const content = `
    <h2>Application Status Update</h2>
    <p>Dear ${applicationDetails.contactName},</p>
    <p>Thank you for your interest in joining Rainbow Paws as a service provider.</p>
    <p>After careful review of your application for <strong>${applicationDetails.businessName}</strong>, we regret to inform you that we are unable to approve it at this time.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Reason for Decline</h3>
      <p>${applicationDetails.reason}</p>
    </div>

    <p>If you believe this decision was made in error or if you would like to provide additional information, please feel free to contact our support team.</p>
    <p>We appreciate your understanding and wish you the best in your future endeavors.</p>

    <p>Sincerely,<br>The Rainbow Paws Team</p>
  `;

  return {
    subject,
    html: baseEmailTemplate(content)
  };
};
