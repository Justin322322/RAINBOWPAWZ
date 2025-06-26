import { query } from '@/lib/db';
import { createNotification } from '@/utils/notificationService';

export interface UserNotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  _entityType?: string;
  entityId?: number;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

/**
 * Create a notification for a specific user
 */
export async function createUserNotification({
  userId,
  type,
  title,
  message,
  _entityType,
  entityId,
  shouldSendEmail = false,
  emailSubject
}: UserNotificationData): Promise<boolean> {
  try {
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

    // Use the notification service which supports email
    const notificationResult = await createNotification({
      userId,
      title,
      message,
      type: type as 'info' | 'success' | 'warning' | 'error',
      link,
      shouldSendEmail,
      emailSubject
    });

    return notificationResult.success;
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
      // Create the table if it doesn't exist - Match the database schema without foreign key
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
    
    // SECURITY FIX: Build safe query without template literals
    let selectQuery;
    if (idColumn === 'notification_id') {
      selectQuery = `SELECT notification_id as id, user_id, title, message, type, is_read, link, created_at 
                     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    } else {
      selectQuery = `SELECT id, user_id, title, message, type, is_read, link, created_at 
                     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    }
    
    const notifications = await query(selectQuery, [userId, limit]) as any[];

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

    // SECURITY FIX: Build safe query without template literals
    let updateQuery;
    if (idColumn === 'notification_id') {
      updateQuery = 'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?';
    } else {
      updateQuery = 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';
    }
    
    await query(updateQuery, [notificationId, userId]);

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
