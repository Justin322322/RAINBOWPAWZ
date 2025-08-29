/**
 * Shared notification types for the entire application
 * Centralized to prevent circular import dependencies between API routes
 */

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'refund_approved' | 'refund_processed';
export type ISO8601Timestamp = string;
export type NotificationId = number;

export interface Notification {
  id?: NotificationId;
  title: string;
  message: string;
  type: NotificationType;
  is_read?: boolean;
  link?: string | null;
  created_at?: ISO8601Timestamp;
  meta?: Record<string, unknown>;
}

// Pre-persist notification (without id)
export type NewNotification = Omit<Notification, 'id'>;

// Persisted notification (with required id)
export interface PersistedNotification extends Notification {
  id: NotificationId;
}

/**
 * Database record interface for notifications.
 * Note: Database mappers must coerce integer flags (tinyint(1) 0|1 values) into booleans consistently.
 */
export interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link: string | null;
  created_at: ISO8601Timestamp;
}

// Re-export for backward compatibility and convenience
export type { Notification as default };
