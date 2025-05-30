'use client';

import { useState, useRef, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, removeNotification, fetchNotifications } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.is_read === 0) {
      await markAsRead(notification.id);
    }

    // If there's a link, the navigation will happen via the Link component
    // Otherwise, just close the dropdown
    if (!notification.link) {
      setIsOpen(false);
    }
  };

  // Handle removing a notification
  const handleRemoveNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.preventDefault();
    e.stopPropagation();
    await removeNotification(notificationId);
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
    } catch (error) {
      return 'Recently';
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
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
    <div className="relative z-50" ref={dropdownRef}>
      <button
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
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-lg shadow-xl py-1 z-10 max-h-[80vh] overflow-y-auto border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-[var(--primary-green)] hover:text-[var(--primary-green-dark)] font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

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
              {notifications.map((notification) => (
                <div
                  key={notification.id}
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
                      <button
                        onClick={(e) => handleRemoveNotification(e, notification.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                        title="Remove notification"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
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
                      <button
                        onClick={(e) => handleRemoveNotification(e, notification.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                        title="Remove notification"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex justify-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
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
