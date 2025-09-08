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
  status: boolean; // Database may return tinyint(1)
  // link column not present in schema; keep optional for compatibility
  link?: string | null;
  created_at: string;
}

interface ConvertedNotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  status: number; // Frontend expects number (0 or 1)
  link?: string | null;
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
function determineNotificationLink(_type: string, _entityId?: number): string | null {
  return null;
}

/**
 * Ensure the notifications_unified table exists
 */
async function ensureNotificationsTable(): Promise<boolean> { return true; }

/**
 * Get the correct ID column name for the notifications_unified table
 */
async function getNotificationIdColumn(): Promise<'id' | 'notification_id'> {
  try {
    const tableInfo = await query(`DESCRIBE notifications_unified`) as TableColumnInfo[];
    const hasNotificationId = tableInfo.some(col => col.Field === 'notification_id');
    const hasId = tableInfo.some(col => col.Field === 'id');
    
    return hasNotificationId && !hasId ? 'notification_id' : 'id';
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Could not describe notifications_unified table:', error);
    }
    return 'id'; // Default fallback
  }
}

/**
 * Get notifications_unified for a specific user
 */
export async function getUserNotifications(userId: number, limit: number = 10): Promise<ConvertedNotificationRecord[]> {
  try {
    await ensureNotificationsTable();
    const idColumn = await getNotificationIdColumn();

    const selectQuery = idColumn === 'notification_id'
      ? `SELECT notification_id as id, user_id, title, message, type, status, created_at, link
           FROM notifications_unified WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(limit)}`
        : `SELECT id, user_id, title, message, type, status, created_at, link
           FROM notifications_unified WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(limit)}`;

    const notifications_unified = await query(selectQuery, [userId]) as NotificationRecord[];
    
    // Convert boolean status to number (0 or 1) to match frontend expectations
    const convertedNotifications = (notifications_unified || []).map(notification => ({
      ...notification,
      status: notification.status ? 1 : 0
    }));
    
    return convertedNotifications;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching user notifications_unified:", error);
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
      ? 'UPDATE notifications_unified SET status = TRUE WHERE notification_id = ? AND user_id = ?'
      : 'UPDATE notifications_unified SET status = TRUE WHERE id = ? AND user_id = ?';
    
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
 * Mark all notifications_unified as read for a user
 */
export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  try {
    await query(`
      UPDATE notifications_unified 
      SET status = TRUE 
      WHERE user_id = ? AND status = FALSE
    `, [userId]);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error marking all notifications_unified as read:", error);
    }
    return false;
  }
}
