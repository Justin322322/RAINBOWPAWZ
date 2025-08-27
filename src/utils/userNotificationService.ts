import { query } from '@/lib/db';
import { createNotification } from '@/utils/notificationService';

interface UserNotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityId?: number;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean; // Database returns boolean
  link: string | null;
  created_at: string;
}

interface ConvertedNotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: number; // Frontend expects number (0 or 1)
  link: string | null;
  created_at: string;
}

interface TableColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: string | null;
  Extra: string;
}

/**
 * Create a notification for a specific user
 */
export async function createUserNotification({
  userId,
  type,
  title,
  message,
  entityId,
  shouldSendEmail = false,
  emailSubject
}: UserNotificationData): Promise<boolean> {
  try {
    const link = determineNotificationLink(type, entityId);
    
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
    // Log error for debugging but don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error("Error creating user notification:", error);
    }
    return false;
  }
}

/**
 * Determine the appropriate link for a notification type
 */
function determineNotificationLink(type: string, entityId?: number): string | null {
  if (type === 'refund_processed' || type === 'refund_approved') {
    return entityId 
      ? `/user/furparent_dashboard/bookings?bookingId=${entityId}`
      : '/user/furparent_dashboard/bookings';
  }
  return null;
}

/**
 * Ensure the notifications table exists
 */
async function ensureNotificationsTable(): Promise<boolean> {
  try {
    const tableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'notifications'
    `) as Array<{ count: number }>;

    if (tableExists[0].count === 0) {
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
    if (process.env.NODE_ENV === 'development') {
      console.error("Error ensuring notifications table exists:", error);
    }
    return false;
  }
}

/**
 * Get the correct ID column name for the notifications table
 */
async function getNotificationIdColumn(): Promise<'id' | 'notification_id'> {
  try {
    const tableInfo = await query(`DESCRIBE notifications`) as TableColumnInfo[];
    const hasNotificationId = tableInfo.some(col => col.Field === 'notification_id');
    const hasId = tableInfo.some(col => col.Field === 'id');
    
    return hasNotificationId && !hasId ? 'notification_id' : 'id';
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Could not describe notifications table:', error);
    }
    return 'id'; // Default fallback
  }
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(userId: number, limit: number = 10): Promise<ConvertedNotificationRecord[]> {
  try {
    await ensureNotificationsTable();
    const idColumn = await getNotificationIdColumn();
    
    const selectQuery = idColumn === 'notification_id'
      ? `SELECT notification_id as id, user_id, title, message, type, is_read, link, created_at 
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(limit)}`
      : `SELECT id, user_id, title, message, type, is_read, link, created_at 
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(limit)}`;
    
    const notifications = await query(selectQuery, [userId]) as NotificationRecord[];
    
    // Convert boolean is_read to number (0 or 1) to match frontend expectations
    const convertedNotifications = (notifications || []).map(notification => ({
      ...notification,
      is_read: notification.is_read ? 1 : 0
    }));
    
    return convertedNotifications;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching user notifications:", error);
    }
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
  try {
    const idColumn = await getNotificationIdColumn();
    
    const updateQuery = idColumn === 'notification_id'
      ? 'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?'
      : 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';
    
    await query(updateQuery, [notificationId, userId]);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error marking notification as read:", error);
    }
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
    if (process.env.NODE_ENV === 'development') {
      console.error("Error marking all notifications as read:", error);
    }
    return false;
  }
}
