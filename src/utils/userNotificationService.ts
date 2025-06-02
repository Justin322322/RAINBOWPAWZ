import { query } from '@/lib/db';

export interface UserNotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Create a notification for a specific user
 */
export async function createUserNotification({
  userId,
  type,
  title,
  message,
  entityType,
  entityId
}: UserNotificationData): Promise<boolean> {
  try {
    // Ensure the notifications table exists
    await ensureNotificationsTable();

    // Determine link based on notification type
    let link = null;

    if (type === 'refund_processed' || type === 'refund_approved') {
      // Link to the bookings page
      link = '/user/furparent_dashboard/bookings';

      // If we have a specific entity ID, link directly to that booking
      if (entityId) {
        link = `/user/furparent_dashboard/bookings?bookingId=${entityId}`;
      }
    }

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;
    return true;
  } catch (error) {
    console.error("Error creating user notification:", error);
    return false;
  }
}

/**
 * Ensure the notifications table exists
 */
async function ensureNotificationsTable(): Promise<boolean> {
  try {
    // Check if the table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'notifications'
    `) as any[];

    if (tableExists[0].count === 0) {
      // Create the table if it doesn't exist (using 'id' as primary key to match main API)
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          link VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at)
        )
      `);
    }

    return true;
  } catch (error) {
    console.error("Error ensuring notifications table exists:", error);
    return false;
  }
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(userId: number, limit: number = 10): Promise<any[]> {
  try {
    // Ensure the notifications table exists first
    await ensureNotificationsTable();
    
    // Check which column name to use (id or notification_id)
    let idColumn = 'id';
    try {
      // Try to describe the table to see which column exists
      const tableInfo = await query(`DESCRIBE notifications`) as any[];
      const hasNotificationId = tableInfo.some((col: any) => col.Field === 'notification_id');
      const hasId = tableInfo.some((col: any) => col.Field === 'id');
      
      if (hasNotificationId && !hasId) {
        idColumn = 'notification_id';
      }
    } catch (describeError) {
      console.warn('Could not describe notifications table:', describeError);
    }
    
    const notifications = await query(`
      SELECT ${idColumn} as id, user_id, title, message, type, is_read, link, created_at 
      FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, limit]) as any[];

    return notifications || [];
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
  try {
    // Check which column name to use (id or notification_id)
    let idColumn = 'id';
    try {
      const tableInfo = await query(`DESCRIBE notifications`) as any[];
      const hasNotificationId = tableInfo.some((col: any) => col.Field === 'notification_id');
      const hasId = tableInfo.some((col: any) => col.Field === 'id');
      
      if (hasNotificationId && !hasId) {
        idColumn = 'notification_id';
      }
    } catch (describeError) {
      console.warn('Could not describe notifications table:', describeError);
    }

    await query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE ${idColumn} = ? AND user_id = ?
    `, [notificationId, userId]);

    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  try {
    await query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = ? AND is_read = FALSE
    `, [userId]);

    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}
