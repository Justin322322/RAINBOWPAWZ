'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';

interface SMSConfig {
  isConfigured: boolean;
  missingVars: string[];
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasPhoneNumber: boolean;
}

function SMSTestPage({ adminData }: { adminData: any }) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sms/test');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        showToast('Failed to load SMS configuration', 'error');
      }
    } catch (error) {
      console.error('Error loading SMS config:', error);
      showToast('Error loading SMS configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Format phone number as user types
  useEffect(() => {
    if (testPhone.trim()) {
      // Simple client-side formatting preview
      let cleanNumber = testPhone.replace(/\D/g, '');

      if (cleanNumber.startsWith('63')) {
        cleanNumber = cleanNumber.substring(2);
      } else if (cleanNumber.startsWith('0')) {
        cleanNumber = cleanNumber.substring(1);
      }

      if (cleanNumber.length === 10 && cleanNumber.startsWith('9')) {
        setFormattedPhone(`+63${cleanNumber}`);
      } else {
        setFormattedPhone('Invalid format');
      }
    } else {
      setFormattedPhone('');
    }
  }, [testPhone]);

  const testSMS = async () => {
    if (!testPhone.trim()) {
      showToast('Please enter a phone number', 'error');
      return;
    }

    try {
      setIsTesting(true);
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: testPhone
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Test SMS sent successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to send test SMS', 'error');
      }
    } catch (error) {
      console.error('Error testing SMS:', error);
      showToast('Error sending test SMS', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout activePage="sms-test" adminData={adminData}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading SMS configuration...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout activePage="sms-test" adminData={adminData}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">SMS Test Panel</h1>
            <p className="mt-1 text-sm text-gray-600">
              Test Twilio SMS integration and check configuration status
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Configuration Status */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Status</h2>
              {config ? (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${config.isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`font-medium ${config.isConfigured ? 'text-green-700' : 'text-red-700'}`}>
                      {config.isConfigured ? 'Fully Configured' : 'Configuration Incomplete'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${config.hasAccountSid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium">Account SID</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {config.hasAccountSid ? 'Configured' : 'Missing'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${config.hasAuthToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium">Auth Token</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {config.hasAuthToken ? 'Configured' : 'Missing'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${config.hasPhoneNumber ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium">Phone Number</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {config.hasPhoneNumber ? 'Configured' : 'Missing'}
                      </p>
                    </div>
                  </div>

                  {config.missingVars.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
                      <h3 className="text-sm font-medium text-red-800">Missing Environment Variables:</h3>
                      <ul className="mt-2 text-sm text-red-700">
                        {config.missingVars.map((variable) => (
                          <li key={variable} className="list-disc list-inside">
                            {variable}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Failed to load configuration</p>
              )}
            </div>

            {/* Test SMS */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Test SMS</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="testPhone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="testPhone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="09123456789 or 9123456789"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Philippine mobile number (10 digits starting with 9). Leading 0 will be automatically removed.
                  </p>
                  {formattedPhone && (
                    <p className={`mt-1 text-sm font-medium ${
                      formattedPhone === 'Invalid format' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      Will be formatted as: {formattedPhone}
                    </p>
                  )}
                </div>

                <button
                  onClick={testSMS}
                  disabled={isTesting || !config?.isConfigured || formattedPhone === 'Invalid format'}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isTesting || !config?.isConfigured || formattedPhone === 'Invalid format'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isTesting ? 'Sending...' : 'Send Test SMS'}
                </button>

                {!config?.isConfigured && (
                  <p className="text-sm text-red-600">
                    SMS testing is disabled because Twilio is not properly configured.
                  </p>
                )}
              </div>
            </div>

            {/* Documentation */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Setup Instructions</h2>

              {/* Trial Account Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Trial Account Limitations</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>If you&apos;re using a Twilio trial account, you can only send SMS to verified phone numbers.</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>Verify phone numbers at: <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/verified" target="_blank" rel="noopener noreferrer" className="underline">twilio.com/console/phone-numbers/verified</a></li>
                        <li>Or upgrade to a paid account to send to any number</li>
                        <li>Trial accounts also have daily SMS limits</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-800">
                  To configure Twilio SMS, add the following environment variables to your .env.local file:
                </p>
                <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-x-auto">
{`TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number`}
                </pre>
                <p className="mt-2 text-sm text-blue-800">
                  See TWILIO_SETUP.md for detailed setup instructions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(SMSTestPage);
