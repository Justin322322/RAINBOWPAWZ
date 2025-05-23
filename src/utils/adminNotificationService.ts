import { query } from '@/lib/db';

interface AdminNotificationParams {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Create a new notification for admin users
 */
export async function createAdminNotification({
  type,
  title,
  message,
  entityType = null,
  entityId = null
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
    }

    // Insert the notification
    console.log("Inserting admin notification with values:", { type, title, message, entityType, entityId, link });

    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (1, ?, ?, 'info', ?)`,
      [title, message, link]
    ) as any;

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
 * Ensure the notifications table exists
 */
async function ensureAdminNotificationsTable(): Promise<boolean> {
  try {
    // Check if the table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'notifications'
    `) as any[];

    if (tableExists[0].count === 0) {
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          notification_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT DEFAULT NULL,
          title VARCHAR(255) DEFAULT NULL,
          message TEXT DEFAULT NULL,
          type ENUM('info','success','warning','error') DEFAULT 'info',
          is_read TINYINT(1) DEFAULT 0,
          link VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT current_timestamp()
        )
      `);
    }

    return true;
  } catch (error) {
    console.error("Error ensuring notifications table exists:", error);
    return false;
  }
}
