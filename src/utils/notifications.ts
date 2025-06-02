/**
 * Utility functions for handling notifications
 */

/**
 * Create a new notification for a user
 * @param userId - The ID of the user to create the notification for
 * @param title - The notification title
 * @param message - The notification message
 * @param type - The notification type (info, success, warning, error)
 * @param link - Optional link to navigate to when clicking the notification
 * @returns Promise with the result of the API call
 */
export async function createNotification(
  userId: number | string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        message,
        type,
        link,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create notification');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param notificationId - The ID of the notification to mark as read
 * @returns Promise with the result of the API call
 */
export async function markNotificationAsRead(notificationId: number) {
  try {
    const response = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationIds: [notificationId],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to mark notification as read');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Mark all notifications as read for the current user
 * @returns Promise with the result of the API call
 */
export async function markAllNotificationsAsRead() {
  try {
    const response = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        markAll: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to mark all notifications as read');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
