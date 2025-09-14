'use client';

import { useState, useEffect } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import {
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  ProfileLayout,
  ProfileSection,
  ProfileCard
} from '@/components/ui/ProfileLayout';
import {
  ProfileButton,
  ProfileAlert
} from '@/components/ui/ProfileFormComponents';

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
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const userName = adminData ? `${adminData.first_name || ''} ${adminData.last_name || ''}`.trim() || adminData.username || 'Admin' : 'Admin';

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setShowSkeleton(true);
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

  // Skeleton loading control - hide immediately when data loads
  useEffect(() => {
    if (!isLoading && showSkeleton) {
      setShowSkeleton(false);
    }
  }, [isLoading, showSkeleton]);

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

  return (
    <AdminDashboardLayout activePage="settings" userName={userName} skipSkeleton={true}>
      <ProfileLayout
        title="Admin Settings"
        subtitle="Manage your notification preferences and account settings"
        icon={<Cog6ToothIcon className="h-8 w-8 text-white" />}
        className="p-6"
        showSkeleton={showSkeleton || isLoading}
      >
        {message && (
          <ProfileAlert
            type={message.type}
            message={message.text}
            className="mb-6"
          />
        )}

        <ProfileSection
          title="Notification Preferences"
          subtitle="Choose how you want to receive notifications_unified about system activities and updates"
          showSkeleton={showSkeleton || isLoading}
        >
          <ProfileCard>
            {showSkeleton || isLoading ? (
              /* Loading skeleton that matches actual content layout */
              <div className="space-y-4">
                {/* SMS Notification Toggle Skeleton */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-36 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                </div>

                {/* Email Notification Toggle Skeleton */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                </div>

                {/* Info Box Skeleton */}
                <div className="mt-6 p-4 bg-gray-100 rounded-xl">
                  <div className="flex items-start">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mt-0.5 mr-3"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button Skeleton */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
              </div>
            ) : (
              /* Actual page content */
              <>
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
                          Receive email notifications_unified for system activities and administrative updates
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
                          <li>SMS notifications_unified are sent for critical system alerts and urgent administrative matters</li>
                          <li>Email notifications_unified include detailed reports, user activity summaries, and system updates</li>
                          <li>You can change these preferences at any time</li>
                          <li>Critical security notifications_unified will always be sent regardless of these settings</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <ProfileButton
                    onClick={handleSave}
                    disabled={isSaving}
                    loading={isSaving}
                    className="bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)]"
                  >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </ProfileButton>
                </div>
              </>
            )}
          </ProfileCard>
        </ProfileSection>
      </ProfileLayout>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminSettingsPage);
