import { query } from '@/lib/db';
import { broadcastToUser } from '@/app/api/notifications/sse/route';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { getServerAppUrl } from '@/utils/appUrl';

interface AdminNotificationParams {
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: number | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

/**
 * Create a new notification for admin users
 */
export async function createAdminNotification({
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  shouldSendEmail = true,
  emailSubject
}: AdminNotificationParams): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    // Ensure the admin_notifications table exists
    await ensureAdminNotificationsTable();

    // Determine link based on notification type
    let link = null;

    if (type === 'new_cremation_center' || type === 'pending_application') {
      // Link to the applications page
      link = '/admin/applications';

      // If we have a specific entity ID, link directly to that application
      if (entityId) {
        link = `/admin/applications/${entityId}`;
      }
    } else if (type === 'new_appeal' || type === 'appeal_submitted') {
      // Link to the appropriate admin users page based on entity type
      if (entityType === 'furparent' || entityType === 'user') {
        link = '/admin/users/furparents';
      } else if (entityType === 'cremation' || entityType === 'business') {
        link = '/admin/users/cremation';
      } else {
        // Default to furparents if type is unclear
        link = '/admin/users/furparents';
      }

      // If we have a specific entity ID (user ID), add it as a parameter
      if (entityId) {
        link += `?appealId=${entityId}&userId=${entityId}`;
      }
    }

    // Insert the notification
    const result = await query(
      `INSERT INTO admin_notifications (type, title, message, entity_type, entity_id, link)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, title, message, entityType, entityId, link]
    ) as any;

    // Send email notifications_unified to all admins if requested
    if (shouldSendEmail) {
      await sendAdminEmailNotifications(title, message, type, link, emailSubject);
    }

    // Broadcast to all connected admin sessions via SSE
    try {
      // Fetch admin IDs to target specific users
      const admins = await query(`SELECT user_id FROM users WHERE role = 'admin'`) as any[];
      for (const admin of admins) {
        broadcastToUser(String(admin.user_id), 'admin', {
          id: result.insertId || Date.now(),
          title,
          message,
          type,
          status: 0,
          link,
          created_at: new Date().toISOString()
        });
      }
    } catch {}

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating notification'
    };
  }
}

/**
 * Send email notifications_unified to all admins with email notifications_unified enabled
 */
async function sendAdminEmailNotifications(
  title: string,
  message: string,
  type: string,
  link: string | null,
  emailSubject?: string
): Promise<void> {
  try {
    // Get all admins with email notifications_unified enabled
    const adminsResult = await query(`
      SELECT user_id, email, first_name, email_notifications
      FROM users 
      WHERE role = 'admin' 
      AND (email_notifications IS NULL OR email_notifications = 1)
      AND email IS NOT NULL
    `) as any[];

    if (!adminsResult || adminsResult.length === 0) {
      return;
    }

    // Send email to each admin
    const emailPromises = adminsResult.map(async (admin) => {
      try {
        await sendEmail({
          to: admin.email,
          subject: emailSubject || `[Rainbow Paws Admin] ${title}`,
          html: createAdminEmailHtml(admin.first_name, title, message, type, link),
          text: createAdminEmailText(admin.first_name, title, message, link)
        });
      } catch (emailError) {
        console.error(`Failed to send admin email to ${admin.email}:`, emailError);
      }
    });

    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error('Error sending admin email notifications_unified:', error);
  }
}

/**
 * Create HTML email content for admin notification using the Rainbow Paws base template
 */
function createAdminEmailHtml(firstName: string, title: string, message: string, type: string, link: string | null): string {
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
    .admin-badge {
      background-color: #dc2626;
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
    if (type === 'new_cremation_center' || type === 'pending_application') return 'Review Application';
    return 'View Details';
  };

  const appUrl = getServerAppUrl();

  const content = `
    <h2>Admin Notification</h2>
    <p>Hello ${firstName},</p>
    <span class="admin-badge">Admin Alert</span>
    <h3>${title}</h3>
    <p>${message}</p>
    ${link ? `<div style="text-align: center;"><a href="${appUrl}${link}" class="button">${getButtonText()}</a></div>` : ''}
    <div class="info-box">
      <p><strong>Note:</strong> This notification requires your attention as an administrator.</p>
    </div>
  `;

  return baseEmailTemplate(content);
}

/**
 * Create plain text email content for admin notification
 */
function createAdminEmailText(firstName: string, title: string, message: string, link: string | null): string {
  const appUrl = getServerAppUrl();

  return `
Rainbow Paws Admin Notification

Hello ${firstName},

${title}

${message}

${link ? `Admin Panel Link: ${appUrl}${link}` : ''}

This notification requires your attention as an administrator.

---
Rainbow Paws Admin Panel
This is an automated admin notification. Please do not reply to this email.
  `.trim();
}

/**
 * Ensure the admin_notifications table exists
 */
async function ensureAdminNotificationsTable(): Promise<boolean> {
  try {
    // Check if the table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'admin_notifications'
    `) as any[];

    if (tableExists[0].count === 0) {
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          entity_type VARCHAR(50) DEFAULT NULL,
          entity_id INT DEFAULT NULL,
          link VARCHAR(255) DEFAULT NULL,
          status TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT current_timestamp()
        )
      `);
    }

    return true;
  } catch (error) {
    console.error("Error ensuring admin_notifications table exists:", error);
    return false;
  }
}
