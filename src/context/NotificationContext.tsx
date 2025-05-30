'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { isAuthenticated, getUserId } from '@/utils/auth';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: number;
  link: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Fetch notifications from the API
  const fetchNotifications = async (unreadOnly = false) => {
    // Check if user is authenticated before making the API call
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      // If not authenticated, just return empty data without making the API call
      setNotifications([]);
      setUnreadCount(0);
      return { notifications: [], unreadCount: 0 };
    }

    try {
      setLoading(true);
      setError(null);

      // Determine user type from auth token
      const userId = getUserId();
      const userType = userId?.split('_')[1] || '';
      const isAdmin = userType === 'admin';
      const isBusiness = userType === 'business';

      // Use the appropriate API endpoint based on user type
      let apiUrl = '';
      if (isAdmin) {
        apiUrl = `/api/admin/notifications?unread_only=${unreadOnly}`;
      } else if (isBusiness) {
        // Cremation business users also use the regular notification endpoint
        apiUrl = `/api/notifications?unread_only=${unreadOnly}`;
      } else {
        // Regular fur parent users
        apiUrl = `/api/notifications?unread_only=${unreadOnly}`;
      }

      // Add cache-busting parameter to avoid stale data
      apiUrl += `&t=${Date.now()}`;

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
      }

      // Use timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If unauthorized or any other error, just set empty data without throwing an error
        // This makes the application more resilient to authentication issues
        if (process.env.NODE_ENV === 'development') {
        }
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }

      // Check the content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }

      try {
        const data = await response.json();

        // Ensure data has the expected structure
        if (!data || typeof data !== 'object') {
          setNotifications([]);
          setUnreadCount(0);
          return { notifications: [], unreadCount: 0 };
        }

        // Set notifications with fallback to empty array if missing
        // For admin notifications, the structure is slightly different
        if (isAdmin && Array.isArray(data.notifications)) {
          setNotifications(data.notifications.map((notif: any) => ({
            ...notif,
            // Ensure we have the correct structure for all notification types
            id: notif.id,
            title: notif.title || 'Notification',
            message: notif.message || '',
            type: notif.type || 'info',
            is_read: notif.is_read ? 1 : 0,
            link: notif.link || null,
            created_at: notif.created_at || new Date().toISOString()
          })));
          setUnreadCount(data.notifications.filter((n: any) => !n.is_read).length);
        } else {
          // Regular users
          setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        }

        return data;
      } catch (jsonError) {
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }
    } catch (err) {
      // Handle AbortError specifically to avoid showing error messages for timeouts
      if (err instanceof Error && err.name === 'AbortError') {
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }

      // Set empty data on error
      setNotifications([]);
      setUnreadCount(0);
      return { notifications: [], unreadCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId: number) => {
    // Check if user is authenticated
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      return;
    }

    try {
      // Determine if this is an admin user
      const isAdmin = getUserId()?.includes('admin');

      // Use the appropriate API endpoint based on user type
      const apiUrl = isAdmin
        ? '/api/admin/notifications'
        : '/api/notifications/mark-read';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
        }),
      });

      if (!response.ok) {
        // If any error occurs, just log it and continue without throwing
        if (process.env.NODE_ENV === 'development') {
        }
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: 1 }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showToast(errorMessage, 'error');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    // Check if user is authenticated
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      return;
    }

    try {
      // Determine if this is an admin user
      const isAdmin = getUserId()?.includes('admin');

      // Use the appropriate API endpoint based on user type
      const apiUrl = isAdmin
        ? '/api/admin/notifications'
        : '/api/notifications/mark-read';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markAll: true,
        }),
      });

      if (!response.ok) {
        // If any error occurs, just log it and continue without throwing
        if (process.env.NODE_ENV === 'development') {
        }
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: 1 }))
      );

      setUnreadCount(0);

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showToast(errorMessage, 'error');
    }
  };

  // Remove a specific notification
  const removeNotification = async (notificationId: number) => {
    // Check if user is authenticated
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      return;
    }

    try {
      // Determine if this is an admin user
      const isAdmin = getUserId()?.includes('admin');

      // Use the appropriate API endpoint based on user type
      const apiUrl = isAdmin
        ? `/api/admin/notifications/${notificationId}`
        : `/api/notifications/${notificationId}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove notification');
      }

      // Update local state - remove the notification from the list
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      // Update unread count if the removed notification was unread
      setUnreadCount(prev => {
        const removedNotification = notifications.find(n => n.id === notificationId);
        if (removedNotification && removedNotification.is_read === 0) {
          return Math.max(0, prev - 1);
        }
        return prev;
      });

      showToast('Notification removed successfully', 'success');
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showToast(errorMessage, 'error');
    }
  };

  // Initial fetch of notifications only if user is authenticated
  useEffect(() => {
    // Prevent multiple interval instances
    let intervalId: NodeJS.Timeout | null = null;

    // Check if user is authenticated before fetching notifications
    if (typeof window !== 'undefined' && isAuthenticated()) {
      // Initial fetch with error handling
      fetchNotifications().catch(err => {
        // Don't show error toast for initial load to avoid annoying users
      });

      // Set up polling to check for new notifications every 2 minutes (reduced from 1 minute)
      // This helps reduce server load and excessive API calls
      intervalId = setInterval(() => {
        // Check authentication again before each fetch
        if (isAuthenticated()) {
          // Wrap in try/catch to prevent unhandled promise rejections
          try {
            fetchNotifications().catch(err => {
              // Silent fail for background updates
            });
          } catch (error) {
          }
        } else {
          // If no longer authenticated, clear the interval
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 120000); // 2 minutes
    }

    // Clean up interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []); // Empty dependency array to run only once on mount

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
