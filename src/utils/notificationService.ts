import { query } from '@/lib/db';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { getServerAppUrl } from '@/utils/appUrl';
import { OkPacket, ResultSetHeader } from 'mysql2';

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

interface CreateNotificationParams {
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

interface NotificationResult {
  success: boolean;
  notificationId?: number;
  error?: string;
}

interface UserEmailData {
  email: string;
  first_name: string;
  emailNotifications_unified: number;
}

// Type for INSERT query results that have insertId
type InsertResult = OkPacket | ResultSetHeader;

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
}): Promise<NotificationResult> {
  try {
    const result = await query(
      `INSERT INTO notifications_unified_unified (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as unknown as InsertResult;

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Fast notification creation failed:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a new notification for a user with email support
 */
export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link = null,
  shouldSendEmail = false,
  emailSubject
}: CreateNotificationParams): Promise<NotificationResult> {
  try {
    await ensureNotificationsTable();
    const result = await insertNotificationWithRetry(userId, title, message, type, link);

    if (shouldSendEmail) {
      await sendEmailNotification(userId, title, message, type, link, emailSubject);
    }

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Notification creation failed:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Insert notification with retry logic
 */
async function insertNotificationWithRetry(
  userId: number,
  title: string,
  message: string,
  type: string,
  link: string | null
): Promise<InsertResult> {
  const maxRetries = 3;
  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query(
        `INSERT INTO notifications_unified_unified_unified (user_id, title, message, type, link)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, title, message, type, link]
      ) as unknown as InsertResult;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`All ${maxRetries} notification insert attempts failed for user ${userId}:`, lastError);
        }
        throw lastError;
      }

      if (process.env.NODE_ENV === 'development') {
        console.warn(`Notification insert attempt ${attempt} failed, retrying...`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }

  throw lastError!;
}
/**
 * Send email notification if user has email notifications_unified_unified enabled
 */
async function sendEmailNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  link: string | null,
  emailSubject?: string
): Promise<void> {
  try {
    const userData = await getUserEmailData(userId);
    
    if (!userData) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`No email address found for user ${userId}`);
      }
      return;
    }

    const { email, first_name, emailNotifications_unified } = userData;
    const emailNotificationsEnabled = emailNotifications_unified !== null ? Boolean(emailNotifications_unified) : true;

    if (emailNotificationsEnabled && email) {
      await sendEmail({
        to: email,
        subject: emailSubject || title,
        html: createEmailHtml(first_name, title, message, type, link),
        text: createEmailText(first_name, title, message, link)
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending email notification:', error);
    }
  }
}

/**
 * Get user email data with fallback for missing emailNotifications column
 */
async function getUserEmailData(userId: number): Promise<UserEmailData | null> {
  try {
    const userResult = await query(`
      SELECT 
        email, 
        first_name, 
        COALESCE(emailNotifications, 1) as emailNotifications 
      FROM users 
      WHERE user_id = ?
    `, [userId]) as UserEmailData[];

    return userResult.length > 0 ? userResult[0] : null;
  } catch (error) {
    // Fallback query without emailNotifications_unified column
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error querying emailNotifications, falling back to basic query:', error);
    }
    
    try {
      const userResult = await query(`
        SELECT 
          email, 
          first_name, 
          1 as emailNotifications
        FROM users 
        WHERE user_id = ?
      `, [userId]) as UserEmailData[];

      return userResult.length > 0 ? userResult[0] : null;
    } catch (fallbackError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fallback query also failed:', fallbackError);
      }
      return null;
    }
  }
}

/**
 * Create HTML email content for notification
 */
function createEmailHtml(firstName: string, title: string, message: string, type: string, link: string | null): string {
  const getButtonText = () => {
    if (title.includes('Booking')) return 'View Booking';
    if (title.includes('Profile')) return 'View Profile';
    if (title.includes('Payment')) return 'View Payment';
    return 'View Details';
  };

  const appUrl = getServerAppUrl();

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
  const appUrl = getServerAppUrl();

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
let notifications_unifiedTableExists: boolean | null = null;

/**
 * Ensure the notifications_unified table exists (with caching)
 */
async function ensureNotificationsTable(): Promise<void> {
  try {
    if (notifications_unifiedTableExists === true) {
      return;
    }

    const tableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications_unified'`
    ) as Array<{ count: number }>;

    if (tableExists[0].count === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating notifications_unified_unified table...');
      }
      
      await query(`
        CREATE TABLE IF NOT EXISTS notifications_unified (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
          status TINYINT(1) NOT NULL DEFAULT 0,
          link VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Notifications table created successfully');
      }
    }

    notifications_unifiedTableExists = true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error ensuring notifications_unified table exists:', error);
    }
    notifications_unifiedTableExists = null;
    throw error;
  }
}
