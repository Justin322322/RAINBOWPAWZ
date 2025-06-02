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
    } else if (type === 'refund_request') {
      // Link to the refunds page
      link = '/admin/refunds';

      // If we have a specific entity ID, link directly to that refund
      if (entityId) {
        link = `/admin/refunds?refundId=${entityId}`;
      }
    }

    // Insert the notification
    const result = await query(
      `INSERT INTO admin_notifications (type, title, message, entity_type, entity_id, link)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, title, message, entityType, entityId, link]
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
          is_read TINYINT(1) DEFAULT 0,
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
