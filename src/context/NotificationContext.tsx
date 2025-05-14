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

      console.log('Fetching notifications, authenticated user:', getUserId());
      // Determine if this is an admin user
      const isAdmin = getUserId()?.includes('admin');

      // Use the appropriate API endpoint based on user type
      const apiUrl = isAdmin
        ? `/api/admin/notifications?unread_only=${unreadOnly}`
        : `/api/notifications?unread_only=${unreadOnly}`;

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Using API URL:', apiUrl, 'isAdmin:', isAdmin);
      }
      const response = await fetch(apiUrl);

      if (!response.ok) {
        // If unauthorized or any other error, just set empty data without throwing an error
        // This makes the application more resilient to authentication issues
        // Use console.log instead of console.error to avoid showing in the console
        if (process.env.NODE_ENV === 'development') {
          console.log(`Notification fetch returned status: ${response.status} ${response.statusText}`);
        }
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }

      // Check the content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response:', contentType);
        const text = await response.text();
        console.error('Response text:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }

      try {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('Notifications data received:', data);
        }

        // Ensure data has the expected structure
        if (!data || typeof data !== 'object') {
          console.error('Invalid data structure received:', data);
          setNotifications([]);
          setUnreadCount(0);
          return { notifications: [], unreadCount: 0 };
        }

        // Set notifications with fallback to empty array if missing
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);

        // Set unread count with fallback to 0 if missing
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);

        return data;
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);

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
          console.log(`Error marking notification as read: ${response.status} ${response.statusText}`);
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
      console.error('Error marking notification as read:', err);
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
          console.log(`Error marking all notifications as read: ${response.status} ${response.statusText}`);
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
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Initial fetch of notifications only if user is authenticated
  useEffect(() => {
    // Check if user is authenticated before fetching notifications
    if (typeof window !== 'undefined' && isAuthenticated()) {
      // Initial fetch with error handling
      fetchNotifications().catch(err => {
        console.error('Initial notification fetch failed:', err);
        // Don't show error toast for initial load to avoid annoying users
      });

      // Set up polling to check for new notifications every minute
      const intervalId = setInterval(() => {
        // Check authentication again before each fetch
        if (isAuthenticated()) {
          // Wrap in try/catch to prevent unhandled promise rejections
          try {
            fetchNotifications().catch(err => {
              console.error('Periodic notification fetch failed:', err);
              // Silent fail for background updates
            });
          } catch (error) {
            console.error('Error in notification interval:', error);
          }
        }
      }, 60000); // 60 seconds

      return () => clearInterval(intervalId);
    }
  }, []);

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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
