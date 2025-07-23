'use client';

import { useState, useRef, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ right?: string; left?: string }>({ right: '0' });
  const [clickingNotificationId, setClickingNotificationId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, removeNotification, fetchNotifications } = useNotifications();

  // Calculate dropdown position to prevent overflow
  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = window.innerWidth < 640 ? 288 : window.innerWidth < 1024 ? 320 : 384; // w-72, w-80, w-96
      
      // Check if dropdown would overflow on the right
      const wouldOverflow = buttonRect.right - dropdownWidth < 0 || buttonRect.left + dropdownWidth > viewportWidth;
      
      if (wouldOverflow) {
        // Calculate optimal position to keep dropdown within viewport
        const rightEdge = Math.min(16, viewportWidth - dropdownWidth - 16); // 16px margin from right edge
        setDropdownPosition({ 
          right: `${rightEdge}px`,
          left: 'auto'
        });
      } else {
        // Default position (right-aligned to button)
        setDropdownPosition({ right: '0', left: 'auto' });
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      calculateDropdownPosition();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      console.log('Notification clicked:', notification.id, 'is_read:', notification.is_read);

      // Prevent multiple rapid clicks on the same notification
      if (clickingNotificationId === notification.id) {
        console.log('Already processing notification:', notification.id);
        return;
      }

      // Mark as read if unread
      if (notification.is_read === 0) {
        console.log('Marking notification as read:', notification.id);
        setClickingNotificationId(notification.id);

        try {
          await markAsRead(notification.id);
        } finally {
          setClickingNotificationId(null);
        }
      }

      // Close the dropdown after a short delay to allow the state to update
      setTimeout(() => {
        setIsOpen(false);
      }, 100);
    } catch (error) {
      console.error('Error handling notification click:', error);
      setClickingNotificationId(null);
      // Still close the dropdown even if marking as read fails
      setIsOpen(false);
    }
  };

  // Handle removing a notification
  const handleRemoveNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Validate notification ID before attempting removal
      if (!notificationId || isNaN(notificationId) || notificationId <= 0) {
        console.error('Invalid notification ID:', notificationId);
        return;
      }

      await removeNotification(notificationId);
    } catch (error) {
      console.error('Error removing notification:', error);
      // Don't show error to user as it's already handled in the context
    }
  };

  // Format the notification date
  const formatNotificationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Recently';
      }

      const now = new Date();

      // If it's today, show relative time (e.g., "2 hours ago")
      if (date.toDateString() === now.toDateString()) {
        return formatDistanceToNow(date, { addSuffix: true });
      }

      // Otherwise, show the date
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Recently';
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    // Check for refund request notifications
    if (type === 'refund_request') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    // Check for special notification types first
    if (type === 'new_cremation_center' || type === 'pending_application') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
            <path d="M8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          </svg>
        </div>
      );
    }

    // Check for appeal notifications
    if (type === 'new_appeal' || type === 'appeal_submitted') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    // Check for pending booking notifications
    if (type === 'warning' || type === 'pending_booking') {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    // Handle standard notification types
    switch (type) {
      case 'success':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default: // info
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="relative z-[70]" ref={dropdownRef} data-notification-bell>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          if (!isOpen) {
            // Refresh notifications when opening the dropdown
            fetchNotifications();
          }
        }}
        className="text-white hover:text-gray-200 transition-colors relative p-2 rounded-full hover:bg-white/10"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-72 sm:w-80 lg:w-96 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-gray-100 z-[9999] max-h-[85vh] overflow-hidden"
             style={{ 
               position: 'absolute',
               top: '100%',
               ...dropdownPosition,
               marginTop: '0.5rem'
             }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-[var(--primary-green)] rounded-lg">
                  <BellIcon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Manual refresh button */}
                <button
                  onClick={() => fetchNotifications()}
                  className="text-xs text-[var(--primary-green)] hover:text-[var(--primary-green-dark)] font-medium px-2 py-1 rounded-md hover:bg-white/50 transition-all duration-200"
                  title="Refresh notifications"
                  disabled={loading}
                >
                  <svg 
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-[var(--primary-green)] hover:text-[var(--primary-green-dark)] font-medium px-2 py-1 rounded-md hover:bg-white/50 transition-all duration-200 whitespace-nowrap"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
            {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
            </div>
          )}

            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <BellIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">We&apos;ll notify you when something important happens</p>
              </div>
            )}

            {!loading && notifications.length > 0 && (
              <div className="divide-y divide-gray-100">
                {notifications.filter(notification => notification && notification.id).map((notification, index) => (
                  <div
                    key={`notification-${notification.id}-${index}`}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                      notification.is_read === 0 ? 'bg-blue-50/70' : ''
                    }`}
                  >
                  {notification.link ? (
                    <div className="relative group">
                      <Link
                        href={notification.link}
                        className="flex items-start pr-8"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {getNotificationIcon(notification.type)}
                        <div className="ml-3 w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatNotificationDate(notification.created_at)}
                          </p>
                        </div>
                        {notification.is_read === 0 && (
                          <span className="ml-2 flex-shrink-0 h-2 w-2 rounded-full bg-blue-600"></span>
                        )}
                      </Link>
                      {notification.id && (
                        <button
                          onClick={(e) => handleRemoveNotification(e, notification.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          title="Remove notification"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative group">
                      <div
                        className="flex items-start cursor-pointer pr-8"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {getNotificationIcon(notification.type)}
                        <div className="ml-3 w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatNotificationDate(notification.created_at)}
                          </p>
                        </div>
                        {notification.is_read === 0 && (
                          <span className="ml-2 flex-shrink-0 h-2 w-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                      {notification.id && (
                        <button
                          onClick={(e) => handleRemoveNotification(e, notification.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          title="Remove notification"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                                ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
              <div className="flex justify-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded-md hover:bg-white/50 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
