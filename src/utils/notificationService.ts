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
      // Get user email
      const userResult = await query('SELECT email, first_name FROM users WHERE user_id = ?', [userId]) as any[];

      if (userResult && userResult.length > 0) {
        const { email, first_name } = userResult[0];

        // Send the email notification
        await sendEmail({
          to: email,
          subject: emailSubject || title,
          html: createEmailHtml(first_name, title, message, type, link),
          text: createEmailText(first_name, title, message, link)
        });
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
 * Create HTML email content for notification
 */
function createEmailHtml(firstName: string, title: string, message: string, type: string, link: string | null): string {
  // Get color based on notification type
  const getTypeColor = () => {
    switch (type) {
      case 'success': return '#10B981'; // green
      case 'error': return '#EF4444'; // red
      case 'warning': return '#F59E0B'; // amber
      default: return '#3B82F6'; // blue/info
    }
  };

  // Button text based on notification type
  const getButtonText = () => {
    if (title.includes('Booking')) return 'View Booking';
    if (title.includes('Profile')) return 'View Profile';
    if (title.includes('Payment')) return 'View Payment';
    return 'View Details';
  };

  // The app URL, should be replaced with environment variable in production
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const color = getTypeColor();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 15px;
        }
        .content {
          padding: 20px 0;
        }
        .notification-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 15px;
          background-color: ${color};
          color: white;
          font-size: 14px;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          background-color: ${color};
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin-top: 20px;
          font-weight: 500;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${appUrl}/logo.png" alt="Rainbow Paws" class="logo">
          <h2>Rainbow Paws Notification</h2>
        </div>
        <div class="content">
          <p>Hello ${firstName},</p>
          <span class="notification-badge">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
          <h3>${title}</h3>
          <p>${message}</p>
          ${link ? `<a href="${appUrl}${link}" class="button">${getButtonText()}</a>` : ''}
          <p>Thank you for using Rainbow Paws!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Rainbow Paws. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
  } catch (error) {
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
      // Create the table if it doesn't exist
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
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  } catch (error) {
    throw error;
  }
}