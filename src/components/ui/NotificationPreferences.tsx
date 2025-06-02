'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  type: 'app' | 'email' | 'both';
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: 'booking_updates',
      label: 'Booking Updates',
      description: 'Notifications about your booking status, changes, or reminders',
      enabled: true,
      type: 'both'
    },
    {
      id: 'service_updates',
      label: 'Service Updates',
      description: 'Updates about services you have used or may be interested in',
      enabled: true,
      type: 'app'
    },
    {
      id: 'new_features',
      label: 'New Features',
      description: 'Announcements about new application features and improvements',
      enabled: true,
      type: 'app'
    },
    {
      id: 'marketing',
      label: 'Marketing & Promotions',
      description: 'Special offers, discounts, and promotional content',
      enabled: false,
      type: 'email'
    },
    {
      id: 'system',
      label: 'System Notifications',
      description: 'Important system updates, maintenance notices, and security alerts',
      enabled: true,
      type: 'both'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [emailsEnabled, setEmailsEnabled] = useState(true);
  const { showToast } = useToast();

  // Toggle individual notification preference
  const handleTogglePreference = (id: string) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  // Toggle all email notifications
  const handleToggleEmails = () => {
    setEmailsEnabled(!emailsEnabled);
    
    // If turning off all emails, update all email preferences
    if (emailsEnabled) {
      setPreferences(prev => 
        prev.map(pref => 
          pref.type === 'email' || pref.type === 'both' 
            ? { ...pref, enabled: false } 
            : pref
        )
      );
    } else {
      // Restore defaults when turning emails back on
      setPreferences(prev => 
        prev.map(pref => {
          if (pref.type === 'email' || pref.type === 'both') {
            const defaultEnabled = ['booking_updates', 'system'].includes(pref.id);
            return { ...pref, enabled: defaultEnabled };
          }
          return pref;
        })
      );
    }
  };

  // Save the notification preferences
  const handleSave = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      showToast('Notification preferences saved successfully!', 'success');
      
      // In a real implementation, here you would persist the preferences
      // to the server with an API call
      // savePreferences(preferences, emailsEnabled);
    }, 800);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
      
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Control whether you receive email notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={emailsEnabled} 
              onChange={handleToggleEmails} 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>
      
      <div className="space-y-4">
        {preferences.map((pref) => (
          <div key={pref.id} className="flex items-center justify-between">
            <div className="flex-1">
              <label htmlFor={pref.id} className="font-medium text-gray-900 flex items-center">
                {pref.label}
                <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  {pref.type === 'both' ? 'App & Email' : pref.type === 'app' ? 'App Only' : 'Email Only'}
                </span>
              </label>
              <p className="text-sm text-gray-500">{pref.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id={pref.id}
                className="sr-only peer" 
                checked={pref.enabled} 
                onChange={() => handleTogglePreference(pref.id)}
                disabled={pref.type === 'email' && !emailsEnabled || pref.type === 'both' && !emailsEnabled}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
} 