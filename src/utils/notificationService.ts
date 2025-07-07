import { query } from '@/lib/db';
import { sendEmail } from '@/lib/consolidatedEmailService';

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

/**
 * Interface for creating a new notification
 */
interface CreateNotificationParams {
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
/**
 * Create a notification with minimal overhead (for critical operations)
 */
export async function createNotificationFast({
  userId,
  title,
  message,
  type = 'info',
  link = null
}: {
  userId: number;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
}): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    // Simple insert without table checks (assumes table exists)
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error: any) {
    console.error('Fast notification creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

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
    // Ensure the notifications table exists with shorter timeout
    await Promise.race([
      ensureNotificationsTable(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Table creation timeout')), 3000)
      )
    ]);

    // Insert the notification with timeout and retry logic
    let result: any;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        result = await Promise.race([
          query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, title, message, type, link]
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Insert query timeout')), 5000)
          )
        ]) as any;
        break; // Success, exit retry loop
      } catch (insertError: any) {
        retryCount++;
        console.warn(`Notification insert attempt ${retryCount} failed:`, {
          code: insertError.code,
          message: insertError.message,
          sql: insertError.sql,
          params: [userId, title, message, type, link]
        });

        if (retryCount >= maxRetries) {
          console.error(`All ${maxRetries} notification insert attempts failed for user ${userId}`);
          throw insertError;
        }

        console.log(`Retrying query in ${500 * retryCount}ms due to ${insertError.code}`);
        // Wait before retry (shorter backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }
    }

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
        } else if (!emailNotificationsEnabled) {
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



// Cache for table existence check
let notificationsTableExists: boolean | null = null;

/**
 * Helper function to ensure the notifications table exists (with caching)
 */
async function ensureNotificationsTable() {
  try {
    // Use cached result if available
    if (notificationsTableExists === true) {
      return;
    }

    // Check if the table exists
    const tableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    ) as any[];

    if (tableExists[0].count === 0) {
      console.log('Creating notifications table...');
      // Create the table if it doesn't exist - Simplified without foreign key for better performance
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
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Notifications table created successfully');
    }

    // Cache the result
    notificationsTableExists = true;
  } catch (error) {
    console.error('Error ensuring notifications table exists:', error);
    // Reset cache on error
    notificationsTableExists = null;
    throw error;
  }
}
