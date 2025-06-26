'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { 
  BellIcon, 
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AdminSettingsProps {
  adminData: any;
}

interface NotificationSettings {
  sms_notifications: boolean;
  email_notifications: boolean;
}

function AdminSettingsPage({ adminData }: AdminSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    sms_notifications: true,
    email_notifications: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/notification-preferences');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.preferences);
        } else {
          setMessage({ text: 'Failed to load notification settings', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
        setMessage({ text: 'Failed to load notification settings', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle toggle changes
  const handleToggle = (setting: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  // Save settings to database
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ text: 'Settings saved successfully!', type: 'success' });
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.error || 'Failed to save settings', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Failed to save settings. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const userName = adminData ? `${adminData.first_name || ''} ${adminData.last_name || ''}`.trim() || adminData.username || 'Admin' : 'Admin';

  return (
    <AdminDashboardLayout activePage="settings" userName={userName}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="bg-[var(--primary-green)] rounded-full p-3 mr-4">
                <BellIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--primary-green)] mb-2">Admin Settings</h1>
                <p className="text-gray-600">Manage your notification preferences and account settings</p>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-md flex items-center ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          {/* Settings Content */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Notification Preferences</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose how you want to receive notifications about system activities and updates
              </p>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-48"></div>
                          </div>
                        </div>
                        <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* SMS Notifications */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[var(--primary-green)] transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                        <p className="text-sm text-gray-500">
                          Receive text messages for important system alerts and updates
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.sms_notifications} 
                        onChange={() => handleToggle('sms_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-green)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-green)]"></div>
                    </label>
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[var(--primary-green)] transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 rounded-full p-2">
                        <EnvelopeIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-500">
                          Receive email notifications for system activities and administrative updates
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.email_notifications} 
                        onChange={() => handleToggle('email_notifications')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-green)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-green)]"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <BellIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">About Notifications</h4>
                    <div className="mt-1 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>SMS notifications are sent for critical system alerts and urgent administrative matters</li>
                        <li>Email notifications include detailed reports, user activity summaries, and system updates</li>
                        <li>You can change these preferences at any time</li>
                        <li>Critical security notifications will always be sent regardless of these settings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              {!isLoading && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[var(--primary-green)] text-white px-6 py-2 rounded-md font-medium hover:bg-[var(--primary-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminSettingsPage);
