'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useToast } from './ToastContext';
import { isAuthenticated, getUserId, getAccountType } from '@/utils/auth';

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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Track timeout for proper cleanup
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async (unreadOnly = false) => {
    // Check if user is authenticated
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      setNotifications([]);
      setUnreadCount(0);
      return { notifications: [], unreadCount: 0 };
    }

    try {
      setLoading(true);
      setError(null);

      // Determine user type
      const userId = getUserId();
      const userType = getAccountType();
      const isAdmin = userType === 'admin';
      const isBusiness = userType === 'business';

      if (!userId || (typeof userId === 'number' && userId <= 0) || (typeof userId === 'string' && userId === '')) {
        throw new Error('User ID not available. Please log in again.');
      }

      // Use the appropriate API endpoint based on user type
      let apiUrl = '';
      if (isAdmin) {
        apiUrl = '/api/admin/notifications';
      } else if (isBusiness) {
        apiUrl = `/api/cremation/notifications`;
      } else {
        apiUrl = '/api/user/notifications';
      }

      // Add query parameters properly
      const params = new URLSearchParams();
      if (unreadOnly) {
        params.append('unread_only', 'true');
      }
      // Add cache-busting parameter to prevent stale data
      params.append('t', Date.now().toString());
      
      // Construct the final URL with proper query string
      apiUrl += `?${params.toString()}`;

      // Use timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Track timeout for cleanup
      timeoutIdRef.current = timeoutId;

      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);
      timeoutIdRef.current = null;

      if (!response.ok) {
        // If unauthorized or any other error, just set empty data without throwing an error
        // This makes the application more resilient to authentication issues

        // For database connection errors, show a fallback message
        if (response.status === 500) {
          // Check if it's a database connection error
          try {
            const errorData = await response.json();
            if (errorData.details && errorData.details.includes('Too many connections')) {
              console.warn('Database connection limit reached. Notifications temporarily unavailable.');
            }
          } catch (_e) {
            // Ignore JSON parsing errors
          }
        }

        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }

      // Check the content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const _text = await response.text();
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
          const mappedNotifications = data.notifications.map((notif: any) => {
            // Convert is_read to ensure consistency (it might be TINYINT(1), BOOLEAN, or 0/1)
            const isRead = typeof notif.is_read === 'boolean' 
              ? (notif.is_read ? 1 : 0)
              : (notif.is_read ? 1 : 0);
              
            return {
              ...notif,
              // Ensure we have the correct structure for all notification types
              id: notif.id,
              title: notif.title || 'Notification',
              message: notif.message || '',
              type: notif.type || 'info',
              is_read: isRead,
              link: notif.link || null,
              created_at: notif.created_at || new Date().toISOString()
            };
          });
          
          setNotifications(mappedNotifications);
          
          // Calculate unread count consistently
          setUnreadCount(data.notifications.filter((n: any) => {
            return n.is_read === false || n.is_read === 0;
          }).length);
        } else if (Array.isArray(data.notifications)) {
          // Regular users - user notification API response
          const mappedNotifications = data.notifications.map((notif: any) => {
            // Convert is_read to ensure consistency (it might be TINYINT(1), BOOLEAN, or 0/1)
            const isRead = typeof notif.is_read === 'boolean' 
              ? (notif.is_read ? 1 : 0)
              : (notif.is_read ? 1 : 0);
              
            return {
              ...notif,
              // Ensure we have the correct structure for all notification types
              id: notif.id,
              title: notif.title || 'Notification',
              message: notif.message || '',
              type: notif.type || 'info',
              is_read: isRead,
              link: notif.link || null,
              created_at: notif.created_at || new Date().toISOString()
            };
          });
          
          setNotifications(mappedNotifications);
          
          // Calculate unread count consistently
          setUnreadCount(data.notifications.filter((n: any) => {
            return n.is_read === false || n.is_read === 0;
          }).length);
        } else {
          // Fallback for any other structure
          setNotifications([]);
          setUnreadCount(0);
        }

        return data;
      } catch (_jsonError) {
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
      // Determine user type
      const _userId = getUserId();
      const userType = getAccountType();
      const isAdmin = userType === 'admin';
      const isBusiness = userType === 'business';

      // Use the appropriate API endpoint based on user type
      let apiUrl = '';
      let requestBody = {};

      if (isAdmin) {
        apiUrl = '/api/admin/notifications';
        requestBody = { notificationIds: [notificationId] };
      } else if (isBusiness) {
        apiUrl = `/api/cremation/notifications/${notificationId}`;
        requestBody = {}; // PATCH request doesn't need body for single notification
      } else {
        apiUrl = '/api/user/notifications';
        requestBody = { notificationId: notificationId };
      }

      const response = await fetch(apiUrl, {
        method: isAdmin ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      // Determine user type
      const _userId = getUserId();
      const userType = getAccountType();
      const isAdmin = userType === 'admin';
      const isBusiness = userType === 'business';

      // Use the appropriate API endpoint based on user type
      let apiUrl = '';
      let requestBody = {};

      if (isAdmin) {
        apiUrl = '/api/admin/notifications';
        requestBody = { markAll: true };
      } else if (isBusiness) {
        apiUrl = '/api/cremation/notifications';
        requestBody = { markAll: true };
      } else {
        apiUrl = '/api/user/notifications';
        requestBody = { markAll: true };
      }

      const response = await fetch(apiUrl, {
        method: isAdmin ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

    // Validate notification ID
    if (!notificationId || isNaN(notificationId) || notificationId <= 0) {
      showToast('Invalid notification ID', 'error');
      return;
    }

    try {
      // Determine user type
      const _userId = getUserId();
      const userType = getAccountType();
      const isAdmin = userType === 'admin';
      const isBusiness = userType === 'business';

      // Use the appropriate API endpoint based on user type
      let apiUrl = '';
      if (isAdmin) {
        apiUrl = `/api/admin/notifications/${notificationId}`;
      } else if (isBusiness) {
        apiUrl = `/api/cremation/notifications/${notificationId}`;
      } else {
        apiUrl = `/api/user/notifications/${notificationId}`;
      }

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
      fetchNotifications().catch(_err => {
        // Don't show error toast for initial load to avoid annoying users
      });

      // Set up polling to check for new notifications every 2 minutes (reduced from 1 minute)
      // This helps reduce server load and excessive API calls
      intervalId = setInterval(() => {
        // Check authentication again before each fetch
        if (isAuthenticated()) {
          // Wrap in try/catch to prevent unhandled promise rejections
          try {
            fetchNotifications().catch(_err => {
              // Silent fail for background updates
            });
          } catch (_error) {
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

    // Clean up interval and any pending timeouts on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      // Clear any pending timeout from fetchNotifications
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
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
