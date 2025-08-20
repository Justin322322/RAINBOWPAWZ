'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getUserIdAsync, getAccountTypeAsync, hasAuthToken } from '../utils/auth';
import { useToast } from './ToastContext';

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
  fetchNotifications: (unreadOnly?: boolean) => Promise<{ notifications: Notification[]; unreadCount: number }>;
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

  // Track multiple timeouts for proper cleanup - fixes race condition
  const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const fetchNotifications = async (unreadOnly = false) => {
    // Check if user has auth token
    if (typeof window !== 'undefined' && !hasAuthToken()) {
      return { notifications: [], unreadCount: 0 };
    }

    try {
      setLoading(true);
      setError(null);

      // Determine user type using async functions for proper JWT verification
      const userId = await getUserIdAsync();
      const userType = await getAccountTypeAsync();
      const isAdmin = userType === 'admin';
      const isBusiness = userType === 'business';

      // Simplified user ID validation - only check for null/undefined since getUserIdAsync() returns string | null
      // The API relies on authentication headers for user identity, so we don't need strict ID validation
      if (!userId) {
        // Don't throw an error, just set empty data and return gracefully
        // This makes the application more resilient to authentication edge cases
        setNotifications([]);
        setUnreadCount(0);
        return { notifications: [], unreadCount: 0 };
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
      
      // Add limit parameter for non-admin endpoints to prevent unlimited results
      if (!isAdmin) {
        params.append('limit', '50');
      }
      
      // Add cache-busting parameter to prevent stale data
      params.append('t', Date.now().toString());
      
      // Construct the final URL with proper query string
      apiUrl += `?${params.toString()}`;

      // Use timeout to prevent hanging requests
      // Use AbortController to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000);

      timeoutIdsRef.current.add(timeoutId);      
      // Track timeout for cleanup - add to set to handle concurrent calls
      timeoutIdsRef.current.add(timeoutId);

      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include', // Include httpOnly cookies for secure auth
        // signal: controller.signal // This line is removed as per the new fetchNotifications
      });

      // Clear timeout since request completed and remove from tracking set
      if (timeoutId) {
        clearTimeout(timeoutId);
        const currentTimeoutIds = timeoutIdsRef.current;
        currentTimeoutIds.delete(timeoutId);
      }

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
          } catch {
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

      const data = await response.json();
      const notifications: Notification[] = (data.notifications || []) as Notification[];
      const responseUnreadRaw = (data.unreadCount !== undefined ? data.unreadCount : data.unread_count);
      const computedUnreadCount = typeof responseUnreadRaw === 'number'
        ? responseUnreadRaw
        : notifications.filter(n => n.is_read === 0).length;

      setNotifications(notifications);
      setUnreadCount(computedUnreadCount);
      setError(null);

      return { notifications, unreadCount: computedUnreadCount };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to fetch notifications');
      setNotifications([]);
      setUnreadCount(0);
      return { notifications: [], unreadCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Mark a specific notification as read
  const markAsRead = async (notificationId: number) => {
    // Check if user has auth token
    if (typeof window !== 'undefined' && !hasAuthToken()) {
      return;
    }

    console.log('Marking notification as read:', notificationId);

    try {
      // Determine the correct endpoint based on user type using async function
      const userAccountType = await getAccountTypeAsync();
      const endpoint = userAccountType === 'admin'
        ? '/api/admin/notifications'
        : '/api/user/notifications';

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include httpOnly cookies for secure auth
        body: JSON.stringify({ notificationId: notificationId }),
      });

      if (!response.ok) {
        // If any error occurs, just log it and continue without throwing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to mark notification as read:', response.status);
        }
        return;
      }

      // Update local state immediately
      setNotifications(prev => {
        const updated = prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: 1 }
            : notification
        );

        // Recalculate unread count from the updated notifications
        const newUnreadCount = updated.filter(n => n.is_read === 0).length;
        console.log('Updated unread count:', newUnreadCount, 'for notification:', notificationId);
        setUnreadCount(newUnreadCount);

        return updated;
      });

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showToast(errorMessage, 'error');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    // Check if user has auth token
    if (typeof window !== 'undefined' && !hasAuthToken()) {
      return;
    }

    try {
      // Determine the correct endpoint based on user type using async function
      const userAccountType = await getAccountTypeAsync();
      const endpoint = userAccountType === 'admin'
        ? '/api/admin/notifications'
        : '/api/user/notifications';

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include httpOnly cookies for secure auth
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        // If any error occurs, just log it and continue without throwing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to mark all notifications as read:', response.status);
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
    // Check if user has auth token
    if (typeof window !== 'undefined' && !hasAuthToken()) {
      return;
    }

    // Validate notification ID
    if (!notificationId || isNaN(notificationId) || notificationId <= 0) {
      showToast('Invalid notification ID', 'error');
      return;
    }

    try {
      // Determine the correct endpoint based on user type using async function
      const userAccountType = await getAccountTypeAsync();
      const endpoint = userAccountType === 'admin'
        ? `/api/admin/notifications/${notificationId}`
        : `/api/user/notifications/${notificationId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include httpOnly cookies for secure auth
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

  // Initial fetch of notifications and setup SSE for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // Variables to hold fallback interval IDs for proper cleanup
    let fallbackInterval: NodeJS.Timeout | null = null;
    let sseFallbackInterval: NodeJS.Timeout | null = null;
    
    // Capture ref value at the beginning of the effect to avoid ref warnings
    const timeoutIds = timeoutIdsRef.current;

    // Setup Server-Sent Events for instant notifications
    const setupSSE = () => {
      // Check if user has auth token before setting up SSE
      if (typeof window !== 'undefined' && hasAuthToken()) {
        try {
          // Initial fetch of existing notifications
          fetchNotifications().catch(_err => {
            // Don't show error toast for initial load
          });

          // Setup SSE connection for real-time notifications
          eventSource = new EventSource('/api/notifications/sse', {
            withCredentials: true
          });

          eventSource.onopen = () => {
            console.log('Real-time notifications connected');
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          };

          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              switch (data.type) {
                case 'connection':
                  console.log('SSE connected:', data.message);
                  break;
                  
                case 'notification':
                  {
                    // New notification received - add to state instantly (with duplicate prevention)
                    const newNotification = data.notification;
                    let isNewNotification = false;

                    setNotifications(prev => {
                      // Check if notification already exists
                      const existingIndex = prev.findIndex(n => n.id === newNotification.id);

                      if (existingIndex !== -1) {
                        // Update existing notification
                        const updated = [...prev];
                        updated[existingIndex] = newNotification;
                        return updated;
                      } else {
                        // Add new notification
                        isNewNotification = true;
                        return [newNotification, ...prev];
                      }
                    });

                    // Update unread count only for new unread notifications
                    if (isNewNotification && newNotification.is_read === 0) {
                      setUnreadCount(prev => prev + 1);
                    }

                    console.log('Instant notification received:', newNotification.title);
                  }
                  break;
                  
                case 'system_notification':
                  {
                    // System-wide notification (with duplicate prevention)
                    const sysNotification = data.notification;
                    setNotifications(prev => {
                      // Check if notification already exists
                      const existingIndex = prev.findIndex(n => n.id === sysNotification.id);

                      if (existingIndex !== -1) {
                        // Update existing notification
                        const updated = [...prev];
                        updated[existingIndex] = sysNotification;
                        return updated;
                      } else {
                        // Add new notification and update unread count
                        if (sysNotification.is_read === 0) {
                          setUnreadCount(prevCount => prevCount + 1);
                        }
                        return [sysNotification, ...prev];
                      }
                    });
                  }
                  break;
                  
                case 'ping':
                  // Keep-alive ping - no action needed
                  break;
                  
                default:
                  console.log('Unknown SSE message type:', data.type);
              }
            } catch (error) {
              console.warn('Error parsing SSE message:', error);
            }
          };

          eventSource.onerror = (error) => {
            console.warn('SSE connection error:', error);
            eventSource?.close();
            
            // Implement exponential backoff for reconnection
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
              reconnectAttempts++;
              
              console.log(`Attempting to reconnect SSE in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
              
                             reconnectTimeout = setTimeout(() => {
                 if (hasAuthToken()) {
                   setupSSE();
                 }
               }, delay);
            } else {
              console.warn('Max SSE reconnection attempts reached. Falling back to periodic refresh.');
              // Fallback to periodic refresh if SSE fails completely
              fallbackInterval = setInterval(() => {
                if (hasAuthToken()) {
                  fetchNotifications().catch(_err => {
                    // Silent fail for background updates
                  });
                } else {
                  if (fallbackInterval) {
                    clearInterval(fallbackInterval);
                    fallbackInterval = null;
                  }
                }
              }, 60000); // Check every minute as fallback
            }
          };

        } catch (error) {
          console.error('Failed to setup SSE:', error);
          // Fallback to polling if SSE is not supported
          sseFallbackInterval = setInterval(() => {
            if (hasAuthToken()) {
              fetchNotifications().catch(_err => {
                // Silent fail for background updates
              });
            } else {
              if (sseFallbackInterval) {
                clearInterval(sseFallbackInterval);
                sseFallbackInterval = null;
              }
            }
          }, 30000); // Check every 30 seconds as fallback
        }
      }
    };

    // Initialize SSE connection
    setupSSE();

    // Clean up SSE connection and timeouts on component unmount
    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      // Clear fallback intervals
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
      
      if (sseFallbackInterval) {
        clearInterval(sseFallbackInterval);
        sseFallbackInterval = null;
      }
      
      // Clear any pending timeouts from fetchNotifications
      timeoutIds.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutIds.clear();
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
