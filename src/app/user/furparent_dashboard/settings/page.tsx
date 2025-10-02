'use client';

import { useState, useEffect } from 'react';
import {
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import FurParentDashboardWrapper from '@/components/navigation/FurParentDashboardWrapper';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { useToast } from '@/context/ToastContext';

interface SettingsPageProps {
  userData?: any;
}

interface NotificationSettings {
  sms_notifications: boolean;
  email_notifications: boolean;
}

function SettingsPage({ userData }: SettingsPageProps) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    sms_notifications: true,
    email_notifications: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Skeleton loading state with minimum delay
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/users/notification-preferences');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.preferences);
        } else {
          showToast('Failed to load notification settings', 'error');
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
        showToast('Failed to load notification settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [showToast]);

  // Skeleton loading control
  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
    }
  }, [isLoading]);

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

    try {
      const response = await fetch('/api/users/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        showToast('Settings saved successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="min-h-screen bg-white">
      {/* Review Notification Banner */}
      <FurParentDashboardWrapper userData={userData}>
        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="bg-[var(--primary-green)] rounded-full p-3 mr-4">
                <BellIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--primary-green)] mb-2">Settings</h1>
                <p className="text-gray-600">Manage your notification preferences</p>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Notification Preferences</h2>

                          {showSkeleton || isLoading ? (
                <div className="space-y-6">
                  {[1, 2].map((i) => (
                    <SkeletonCard
                      key={i}
                      withHeader={true}
                      contentLines={2}
                      withFooter={false}
                      withShadow={true}
                      withBorder={true}
                      rounded="lg"
                      animate={true}
                      className="p-4"
                    />
                  ))}
                </div>
              ) : (
              <div className="space-y-6">
                {/* SMS Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DevicePhoneMobileIcon className="h-6 w-6 text-[var(--primary-green)] mr-4" />
                    <div>
                      <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                      <p className="text-sm text-gray-500">Receive text messages for important updates</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.sms_notifications}
                      onChange={() => handleToggle('sms_notifications')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-green)]"></div>
                  </label>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-6 w-6 text-[var(--primary-green)] mr-4" />
                    <div>
                      <h3 className="font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-500">Receive email updates and reminders</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.email_notifications}
                      onChange={() => handleToggle('email_notifications')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-green)]"></div>
                  </label>
                </div>
              </div>
            )}

                          {/* Save Button */}
              {!showSkeleton && !isLoading && (
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
        </main>
      </FurParentDashboardWrapper>
    </div>
  );
}

// Export the component directly (OTP verification is now handled by layout)
export default SettingsPage;
