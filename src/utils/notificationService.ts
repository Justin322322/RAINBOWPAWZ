import { query } from '@/lib/db';
import { sendEmail } from '@/lib/consolidatedEmailService';

/**
 * Interface for creating a new notification
 */
export interface CreateNotificationParams {
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

/**
 * Create a new notification for a user
 */
export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link = null,
  shouldSendEmail = false,
  emailSubject
}: CreateNotificationParams): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    // Ensure the notifications table exists
    await ensureNotificationsTable();

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    // If requested, also send an email notification
    if (shouldSendEmail) {
      // Get user email and notification preferences - safely handle email_notifications column
      let userResult: any[];
      
      try {
        userResult = await query(`
          SELECT 
            email, 
            first_name, 
            COALESCE(email_notifications, 1) as email_notifications 
          FROM users 
          WHERE user_id = ?
        `, [userId]) as any[];
      } catch (queryError) {
        // Fallback query without email_notifications column if it doesn't exist
        console.warn('Error querying email_notifications, falling back to basic query:', queryError);
        userResult = await query(`
          SELECT 
            email, 
            first_name, 
            1 as email_notifications
          FROM users 
          WHERE user_id = ?
        `, [userId]) as any[];
      }

      if (userResult && userResult.length > 0) {
        const { email, first_name, email_notifications } = userResult[0];

        // Check if user has email notifications enabled (default to true)
        const emailNotificationsEnabled = email_notifications !== null ? Boolean(email_notifications) : true;

        if (emailNotificationsEnabled && email) {
          // Send the email notification
          await sendEmail({
            to: email,
            subject: emailSubject || title,
            html: createEmailHtml(first_name, title, message, type, link),
            text: createEmailText(first_name, title, message, link)
          });
          console.log(`User email notification sent to: ${email}`);
        } else if (!emailNotificationsEnabled) {
          console.log(`Email notifications disabled for user ${userId}`);
        } else if (!email) {
          console.warn(`No email address found for user ${userId}`);
        }
      }
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
 * Create HTML email content for notification using the Rainbow Paws base template
 */
function createEmailHtml(firstName: string, title: string, message: string, type: string, link: string | null): string {
  // Use the same base template as the main email templates
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
    .notification-badge {
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

  // Button text based on notification type
  const getButtonText = () => {
    if (title.includes('Booking')) return 'View Booking';
    if (title.includes('Profile')) return 'View Profile';
    if (title.includes('Payment')) return 'View Payment';
    return 'View Details';
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const content = `
    <h2>Notification</h2>
    <p>Hello ${firstName},</p>
    <span class="notification-badge">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
    <h3>${title}</h3>
    <p>${message}</p>
    ${link ? `<div style="text-align: center;"><a href="${appUrl}${link}" class="button">${getButtonText()}</a></div>` : ''}
    <p>Thank you for using Rainbow Paws!</p>
  `;

  return baseEmailTemplate(content);
}

/**
 * Create plain text email content for notification
 */
function createEmailText(firstName: string, title: string, message: string, link: string | null): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return `
Rainbow Paws Notification

Hello ${firstName},

${title}

${message}

${link ? `View details: ${appUrl}${link}` : ''}

Thank you for using Rainbow Paws!

This is an automated message, please do not reply to this email.
  `.trim();
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    ) as any[];

    return result[0].count || 0;
  } catch {
    return 0;
  }
}

/**
 * Helper function to ensure the notifications table exists
 */
async function ensureNotificationsTable() {
  try {
    // Check if the table exists
    const tableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    ) as any[];

    if (tableExists[0].count === 0) {
      // Create the table if it doesn't exist - Fixed foreign key to reference user_id instead of id
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          link VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  } catch (error) {
    console.error('Error ensuring notifications table exists:', error);
    throw error;
  }
}