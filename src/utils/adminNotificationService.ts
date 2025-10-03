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
    // Ensure the notifications_unified table exists
    await ensureNotificationsUnifiedTable();

    // Determine link based on notification type
    let link = null;

    if (type === 'new_cremation_center' || type === 'pending_application' || type === 'business_approved') {
      // Link to the applications page
      link = '/admin/applications';

      // If we have a specific entity ID, link directly to that application
      if (entityId) {
        link = `/admin/applications/${entityId}`;
      }
    } else if (type === 'new_user_registration') {
      // Link to the users page for fur parents
      link = '/admin/users/furparents';

      // If we have a specific entity ID (user ID), add it as a parameter
      if (entityId) {
        link += `?userId=${entityId}`;
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
    } else if (type === 'review_report') {
      // Link to the reviews page for reported reviews
      link = '/admin/reviews';

      // The admin can see the reported badge and click it to view details
      if (entityId) {
        link += `?reviewId=${entityId}`;
      }
    } else if (type === 'new_review') {
      // Link to the reviews page for new reviews
      link = '/admin/reviews';

      // If we have a specific review ID, add it as a parameter
      if (entityId) {
        link += `?reviewId=${entityId}`;
      }
    }

    // Get all admin users to create individual notifications
    const admins = await query(`SELECT user_id, email, first_name FROM users WHERE role = 'admin'`) as any[];
    
    if (!admins || admins.length === 0) {
      return {
        success: false,
        error: 'No admin users found'
      };
    }

    // Create individual notifications for each admin in the unified table
    const notificationPromises = admins.map(async (admin) => {
      try {
        // Check if notification already exists to prevent duplicates
        const existingNotification = await query(`
          SELECT id FROM notifications_unified 
          WHERE user_id = ? AND title = ? AND message = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, [admin.user_id, title, message]) as any[];

        if (existingNotification && existingNotification.length > 0) {
          console.log('Admin notification already exists, skipping duplicate:', existingNotification[0].id);
          return existingNotification[0].id;
        }

        // Insert notification into unified table
        const result = await query(
          `INSERT INTO notifications_unified 
            (user_id, title, message, type, category, status, priority, link, data, created_at)
           VALUES (?, ?, ?, 'system', 'admin', 'delivered', 'normal', ?, ?, NOW())`,
          [
            admin.user_id,
            title,
            message,
            link,
            entityId ? JSON.stringify({ entityType, entityId }) : null
          ]
        ) as any;

        // Broadcast to this specific admin via SSE
        try {
          broadcastToUser(String(admin.user_id), 'admin', {
            id: result.insertId || Date.now(),
            title,
            message,
            type: 'system',
            status: 0,
            link,
            created_at: new Date().toISOString()
          });
        } catch (broadcastError) {
          console.warn('Failed to broadcast to admin:', admin.user_id, broadcastError);
        }

        return result.insertId;
      } catch (error) {
        console.error(`Failed to create notification for admin ${admin.user_id}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successfulNotifications = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<number>).value);

    // Send email notifications to all admins if requested
    if (shouldSendEmail) {
      await sendAdminEmailNotifications(title, message, type, link, emailSubject);
    }

    return {
      success: successfulNotifications.length > 0,
      notificationId: successfulNotifications[0] || undefined
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
 * Ensure the notifications_unified table exists
 */
async function ensureNotificationsUnifiedTable(): Promise<boolean> {
  try {
    // Check if the table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'notifications_unified'
    `) as any[];

    if (tableExists[0].count === 0) {
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS notifications_unified (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          provider_id INT DEFAULT NULL,
          type ENUM('email','sms','push','system') NOT NULL,
          category ENUM('booking','payment','refund','review','admin','marketing','system') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSON DEFAULT NULL,
          status ENUM('pending','sent','delivered','failed','read') DEFAULT 'pending',
          priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
          scheduled_at TIMESTAMP NULL DEFAULT NULL,
          sent_at TIMESTAMP NULL DEFAULT NULL,
          read_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_provider_id (provider_id),
          INDEX idx_type (type),
          INDEX idx_category (category),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        )
      `);
    }

    return true;
  } catch (error) {
    console.error("Error ensuring notifications_unified table exists:", error);
    return false;
  }
}
