'use client';

import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ReminderStats {
  pendingReminders: number;
  sentToday: number;
  failedToday: number;
}

interface NotificationTemplate {
  title: string;
  message: string;
  type: string;
}

interface NotificationTemplates {
  system_maintenance: NotificationTemplate;
  service_update: NotificationTemplate;
  policy_update: NotificationTemplate;
}

export default function NotificationManagement() {
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplates | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // System notification form state
  const [notificationForm, setNotificationForm] = useState({
    type: 'service_update',
    title: '',
    message: '',
    targetUsers: ''
  });

  useEffect(() => {
    fetchReminderStats();
    fetchTemplates();
  }, []);

  const fetchReminderStats = async () => {
    try {
      const response = await fetch('/api/notifications/process-reminders');
      if (response.ok) {
        const data = await response.json();
        setReminderStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching reminder stats:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/notifications/system');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const processReminders = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/notifications/process-reminders', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          text: `Reminders processed successfully: ${data.reminders.processed} reminders, ${data.reviews.processed} review requests`,
          type: 'success'
        });
        fetchReminderStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        setMessage({
          text: errorData.error || 'Failed to process reminders',
          type: 'error'
        });
      }
    } catch (_error) {
      setMessage({
        text: 'Error processing reminders',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const sendSystemNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      setMessage({
        text: 'Title and message are required',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        type: notificationForm.type,
        title: notificationForm.title,
        message: notificationForm.message
      };

      // Parse target users if provided
      if (notificationForm.targetUsers.trim()) {
        const userIds = notificationForm.targetUsers
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));

        if (userIds.length > 0) {
          payload.targetUsers = userIds;
        }
      }

      const response = await fetch('/api/notifications/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessage({
          text: 'System notification sent successfully',
          type: 'success'
        });
        setNotificationForm({
          type: 'service_update',
          title: '',
          message: '',
          targetUsers: ''
        });
      } else {
        const errorData = await response.json();
        setMessage({
          text: errorData.error || 'Failed to send notification',
          type: 'error'
        });
      }
    } catch (_error) {
      setMessage({
        text: 'Error sending notification',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Notification Management
          </h3>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-700' :
              message.type === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Reminder Statistics */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Reminder Statistics</h4>
            {reminderStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Pending Reminders</p>
                      <p className="text-2xl font-bold text-yellow-900">{reminderStats.pendingReminders}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Sent Today</p>
                      <p className="text-2xl font-bold text-green-900">{reminderStats.sentToday}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Failed Today</p>
                      <p className="text-2xl font-bold text-red-900">{reminderStats.failedToday}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading statistics...</p>
            )}

            <button
              onClick={processReminders}
              disabled={processing}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Process Pending Reminders'}
            </button>
          </div>

          {/* System Notification Form */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Send System Notification</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Notification Type</label>
                <select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="service_update">Service Update</option>
                  <option value="system_maintenance">System Maintenance</option>
                  <option value="policy_update">Policy Update</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notification title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notification message"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Target Users (Optional)</label>
                <input
                  type="text"
                  value={notificationForm.targetUsers}
                  onChange={(e) => setNotificationForm({ ...notificationForm, targetUsers: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Comma-separated user IDs (leave empty for all users)"
                />
              </div>

              {templates && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quick Templates</label>
                  <div className="flex space-x-2">
                    {Object.keys(templates).map((templateType) => (
                      <button
                        key={templateType}
                        onClick={() => {
                          const template = templates[templateType as keyof NotificationTemplates];
                          if (template) {
                            setNotificationForm({
                              ...notificationForm,
                              type: templateType,
                              title: template.title,
                              message: template.message
                            });
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        {templateType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={sendSystemNotification}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
