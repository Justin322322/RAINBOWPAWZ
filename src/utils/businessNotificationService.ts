import { query } from '@/lib/db';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { getServerAppUrl } from '@/utils/appUrl';

// Import the standardized base email template
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
    .business-badge {
      background-color: #10B981;
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 15px;
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

interface BusinessNotificationParams {
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

/**
 * Create a new notification for business users (cremation providers)
 */
export async function createBusinessNotification({
  userId,
  title,
  message,
  type = 'info',
  link = null,
  shouldSendEmail = true,
  emailSubject
}: BusinessNotificationParams): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    // Ensure the notifications table exists
    await ensureNotificationsTable();

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    // Send email notification if requested and user has email notifications enabled
    if (shouldSendEmail) {
      await sendBusinessEmailNotification(userId, title, message, type, link, emailSubject);
    }

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send email notification to business user if they have email notifications enabled
 */
async function sendBusinessEmailNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  link: string | null,
  emailSubject?: string
): Promise<void> {
  try {
    // Get user email and notification preferences - safely handle email_notifications column
    let userResult: any[];
    
    try {
      userResult = await query(`
        SELECT 
          email, 
          first_name, 
          sp.name AS business_name,
          COALESCE(email_notifications, 1) as email_notifications
        FROM users u
        LEFT JOIN service_providers sp ON u.user_id = sp.user_id
        WHERE u.user_id = ? AND u.role = 'business'
      `, [userId]) as any[];
    } catch (queryError) {
      // Fallback query without email_notifications column if it doesn't exist
      console.warn('Error querying email_notifications, falling back to basic query:', queryError);
      userResult = await query(`
        SELECT 
          email, 
          first_name, 
          sp.name AS business_name,
          1 as email_notifications
        FROM users u
        LEFT JOIN service_providers sp ON u.user_id = sp.user_id
        WHERE u.user_id = ? AND u.role = 'business'
      `, [userId]) as any[];
    }

    if (!userResult || userResult.length === 0) {
      console.warn('Business user not found for email notification');
      return;
    }

    const user = userResult[0];

    // Check if user has email notifications enabled (default to true)
    const emailNotificationsEnabled = user.email_notifications !== null ? Boolean(user.email_notifications) : true;

    if (!emailNotificationsEnabled) {
      return;
    }

    if (!user.email) {
      console.warn(`No email address found for business user ${userId}`);
      return;
    }

    // Send the email notification
    await sendEmail({
      to: user.email,
      subject: emailSubject || `[Rainbow Paws] ${title}`,
      html: createBusinessEmailHtml(user.first_name, user.business_name, title, message, type, link),
      text: createBusinessEmailText(user.first_name, user.business_name, title, message, link)
    });

  } catch (error) {
    console.error('Error sending business email notification:', error);
  }
}

/**
 * Create HTML email content for business notification using the Rainbow Paws base template
 */
function createBusinessEmailHtml(
  firstName: string,
  businessName: string,
  title: string,
  message: string,
  type: string,
  link: string | null
): string {
  // Button text based on notification type
  const getButtonText = () => {
    if (title.includes('Booking')) return 'View Booking';
    if (title.includes('Application')) return 'View Application';
    if (title.includes('Document')) return 'View Documents';
    if (title.includes('Review')) return 'View Reviews';
    return 'View Details';
  };

  const appUrl = getServerAppUrl();

  const content = `
    <h2>Business Notification</h2>
    <p>Hello ${firstName},</p>
    ${businessName ? `<span class="business-badge">${businessName}</span>` : '<span class="business-badge">Business Alert</span>'}
    <h3>${title}</h3>
    <p>${message}</p>
    ${link ? `<div style="text-align: center;"><a href="${appUrl}${link}" class="button">${getButtonText()}</a></div>` : ''}
    <div class="info-box">
      <p><strong>Note:</strong> This notification is related to your business activities on Rainbow Paws.</p>
    </div>
  `;

  return baseEmailTemplate(content);
}

/**
 * Create plain text email content for business notification
 */
function createBusinessEmailText(
  firstName: string,
  businessName: string,
  title: string,
  message: string,
  link: string | null
): string {
  const appUrl = getServerAppUrl();

  return `
Rainbow Paws Business Notification
${businessName ? `Business: ${businessName}` : ''}

Hello ${firstName},

${title}

${message}

${link ? `Business Portal Link: ${appUrl}${link}` : ''}

This notification is related to your business activities on Rainbow Paws.

---
Rainbow Paws Business Portal
This is an automated business notification. Please do not reply to this email.
  `.trim();
}

/**
 * Ensure the notifications table exists
 */
async function ensureNotificationsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
        link VARCHAR(255) DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX (user_id, created_at),
        INDEX (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (error) {
    console.error('Error ensuring notifications table exists:', error);
    throw error;
  }
} 
