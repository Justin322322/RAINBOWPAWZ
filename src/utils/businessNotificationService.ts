import { query } from '@/lib/db';
import { broadcastToUser } from '@/app/api/notifications/sse/route';
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
    console.log('Creating business notification:', { userId, title, type, link });
    
    // No runtime DDL

    // Check if notification already exists to prevent duplicates
    const existingNotification = await query(`
      SELECT id FROM notifications_unified 
      WHERE user_id = ? AND title = ? AND message = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `, [userId, title, message]) as any[];

    if (existingNotification && existingNotification.length > 0) {
      console.log('Notification already exists, skipping duplicate:', existingNotification[0].id);
      return {
        success: true,
        notificationId: existingNotification[0].id
      };
    }

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications_unified (user_id, title, message, type, category, status, created_at)
       VALUES (?, ?, ?, 'system', 'booking', 'delivered', NOW())`,
      [userId, title, message]
    ) as any;

    console.log('Business notification created successfully:', result.insertId);

    // Broadcast instant notification to business user via SSE
    try {
      broadcastToUser(String(userId), 'business', {
        id: result.insertId || Date.now(),
        title,
        message,
        type: 'info',
        status: 0,
        link,
        created_at: new Date().toISOString()
      });
    } catch {}

    // Send email notification if requested and user has email notifications_unified enabled
    if (shouldSendEmail) {
      await sendBusinessEmailNotification(userId, title, message, type, link, emailSubject);
    }

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    console.error('Error creating business notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send email notification to business user if they have email notifications_unified enabled
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
          u.email, 
          u.first_name, 
          sp.name AS business_name,
          COALESCE(u.email_notifications, 1) as email_notifications
        FROM users u
        LEFT JOIN service_providers sp ON u.user_id = sp.user_id
        WHERE u.user_id = ? AND u.role = 'business'
      `, [userId]) as any[];
    } catch (queryError) {
      // Fallback query without email_notifications column if it doesn't exist
      console.warn('Error querying email_notifications, falling back to basic query:', queryError);
      userResult = await query(`
        SELECT 
          u.email, 
          u.first_name, 
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

    // Check if user has email notifications_unified enabled (default to true)
    const emailNotificationsEnabled = user.email_notifications !== null && user.email_notifications !== undefined
      ? Boolean(user.email_notifications)
      : true;

    if (!emailNotificationsEnabled) {
      console.log('Email notifications_unified disabled for user:', userId);
      return;
    }

    if (!user.email) {
      console.warn(`No email address found for business user ${userId}`);
      return;
    }

    // Create email content
    const emailContent = createBusinessEmailContent(user.first_name, user.business_name, title, message, link);
    const subject = emailSubject || `RainbowPaws Notification: ${title}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject,
      html: emailContent
    });

    console.log('Business email notification sent successfully to:', user.email);
  } catch (error) {
    console.error('Error sending business email notification:', error);
    // Don't throw error as this is not critical for the main notification flow
  }
}

/**
 * Create email content for business notifications
 */
function createBusinessEmailContent(
  firstName: string,
  businessName: string,
  title: string,
  message: string,
  link: string | null
): string {
  const appUrl = getServerAppUrl();
  const fullLink = link ? `${appUrl}${link}` : null;

  return baseEmailTemplate(`
    <div class="business-badge">Business Notification</div>
    <h2>Hello ${firstName}${businessName ? ` from ${businessName}` : ''}!</h2>
    
    <div class="info-box">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
    
    ${fullLink ? `
      <div style="text-align: center;">
        <a href="${fullLink}" class="button">View Details</a>
      </div>
    ` : ''}
    
    <p style="margin-top: 20px; color: #666; font-size: 14px;">
      This is an automated notification from your RainbowPaws business dashboard. 
      You can manage your notification preferences in your account settings.
    </p>
  `);
}

/**
 * Ensure the notifications table exists (no-op in prod)
 */
async function _ensureNotificationsTable(): Promise<void> {
  try {
    // Check if table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'notifications_unified'
    `) as any[];

    if (tableExists[0].count === 0) {
      console.log('Creating notifications_unified_unified table...');
      
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS notifications_unified (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
          link VARCHAR(255) DEFAULT NULL,
          status TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      
      console.log('Notifications table created successfully');
    } else {
      console.log('Notifications table already exists');
    }
  } catch (error) {
    console.error('Error ensuring notifications_unified table exists:', error);
    throw error;
  }
} 
