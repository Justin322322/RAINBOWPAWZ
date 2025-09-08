'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { getUserIdAsync, getAccountTypeAsync, hasAuthToken } from '../utils/auth';
import { useToast } from './ToastContext';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  status: number;
  link: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications_unified: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (unreadOnly?: boolean) => Promise<{ notifications_unified: Notification[]; unreadCount: number }>;
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
  const [notifications_unified, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Helper function to get auth token asynchronously
  const getAuthTokenAsync = async (): Promise<string | null> => {
    if (typeof document === 'undefined') return null;
    
    try {
      // Try to get from cookies first
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
      
      if (authCookie) {
        const token = authCookie.split('=')[1];
        if (token) return decodeURIComponent(token);
      }
      
      // Fallback to localStorage
      const localStorageToken = localStorage.getItem('auth_token');
      if (localStorageToken) return localStorageToken;
      
      // Fallback to sessionStorage
      const sessionStorageToken = sessionStorage.getItem('auth_token');
      if (sessionStorageToken) return sessionStorageToken;
      
      return null;
    } catch {
      return null;
    }
  };

  // Track multiple timeouts for proper cleanup - fixes race condition
  const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    // Check if user has auth token or if logout is in progress
    if (typeof window !== 'undefined' && (!hasAuthToken() || sessionStorage.getItem('is_logging_out') === 'true')) {
      return { notifications_unified: [], unreadCount: 0 };
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
        return { notifications_unified: [], unreadCount: 0 };
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
          'Pragma': 'no-cache',
          'Authorization': `Bearer ${await getAuthTokenAsync()}`,
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
        return { notifications_unified: [], unreadCount: 0 };
      }

      // Check the content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const _text = await response.text();
        setNotifications([]);
        setUnreadCount(0);
        return { notifications_unified: [], unreadCount: 0 };
      }

      const data = await response.json();
      // Support both legacy and unified response shapes
      const notifications_unified = (data.notifications_unified || data.notifications || data.data?.notifications || []) as Notification[];
      const unreadCount = (data.unread_count ?? data.unreadCount ?? data.data?.unreadCount ?? 0) as number;

      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched notifications_unified:', notifications_unified);
        console.log('Unread count from API:', unreadCount);
        console.log('Calculated unread count:', notifications_unified.filter((n: Notification) => n.status === 0).length);
      }

      // Ensure unread count is consistent with actual notifications_unified
      const calculatedUnreadCount = notifications_unified.filter((n: Notification) => n.status === 0).length;
      const finalUnreadCount = Math.max(unreadCount, calculatedUnreadCount);

      setNotifications(notifications_unified);
      setUnreadCount(finalUnreadCount);
      setError(null);

      return { notifications_unified, unreadCount: finalUnreadCount };
    } catch (error) {
      console.error('Error fetching notifications_unified:', error);
      setError('Failed to fetch notifications_unified');
      setNotifications([]);
      setUnreadCount(0);
      return { notifications_unified: [], unreadCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark a specific notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    // Check if user has auth token
    if (typeof window !== 'undefined' && !hasAuthToken()) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Marking notification as read:', notificationId);
    }

    try {
      // Determine the correct endpoint based on user type using async function
      const userAccountType = await getAccountTypeAsync();
      const endpoint = userAccountType === 'admin'
        ? '/api/admin/notifications'
        : userAccountType === 'business'
          ? '/api/cremation/notifications'
          : '/api/user/notifications';

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthTokenAsync()}`,
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
            ? { ...notification, status: 1 }
            : notification
        );

        // Recalculate unread count from the updated notifications_unified
        const newUnreadCount = updated.filter(n => n.status === 0).length;
        if (process.env.NODE_ENV === 'development') {
          console.log('Updated unread count:', newUnreadCount, 'for notification:', notificationId);
        }
        setUnreadCount(newUnreadCount);

        return updated;
      });

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  // Mark all notifications_unified as read
  const markAllAsRead = useCallback(async () => {
    // Check if user has auth token
    if (typeof window !== 'undefined' && !hasAuthToken()) {
      return;
    }

    try {
      // Determine the correct endpoint based on user type using async function
      const userAccountType = await getAccountTypeAsync();
      const endpoint = userAccountType === 'admin'
        ? '/api/admin/notifications'
        : userAccountType === 'business'
          ? '/api/cremation/notifications'
          : '/api/user/notifications';

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthTokenAsync()}`,
        },
        credentials: 'include', // Include httpOnly cookies for secure auth
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        // If any error occurs, just log it and continue without throwing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to mark all notifications_unified as read:', response.status);
        }
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, status: 1 }))
      );

      setUnreadCount(0);

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  // Remove a specific notification
  const removeNotification = useCallback(async (notificationId: number) => {
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
      // Get the auth token
      const authToken = await getAuthTokenAsync();
      
      if (!authToken) {
        showToast('Authentication required. Please log in again.', 'error');
        return;
      }

      // Determine the correct endpoint based on user type using async function
      const userAccountType = await getAccountTypeAsync();
      const endpoint = userAccountType === 'admin'
        ? `/api/admin/notifications/${notificationId}`
        : `/api/user/notifications/${notificationId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
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
        const removedNotification = notifications_unified.find(n => n.id === notificationId);
        if (removedNotification && removedNotification.status === 0) {
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
  }, [showToast, notifications_unified]);

  // Initial fetch of notifications_unified and setup SSE for real-time updates
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

    // Setup Server-Sent Events for instant notifications_unified
    const setupSSE = () => {
      // Check if user has auth token before setting up SSE
      if (typeof window !== 'undefined' && hasAuthToken()) {
        try {
          // Initial fetch of existing notifications_unified
          fetchNotifications().catch(_err => {
            // Don't show error toast for initial load
          });

          // Setup SSE connection for real-time notifications_unified
          eventSource = new EventSource('/api/notifications/sse', {
            withCredentials: true
          });

          eventSource.onopen = () => {
            console.log('Real-time notifications_unified connected');
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

                    // Update unread count only for new unread notifications_unified
                    if (isNewNotification && newNotification.status === 0) {
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
                        if (sysNotification.status === 0) {
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
                if (hasAuthToken() && sessionStorage.getItem('is_logging_out') !== 'true') {
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
            if (hasAuthToken() && sessionStorage.getItem('is_logging_out') !== 'true') {
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
  }, [fetchNotifications]); // Include fetchNotifications in dependencies

  return (
    <NotificationContext.Provider
      value={{
        notifications_unified,
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
