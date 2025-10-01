'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import {
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon
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
import Image from 'next/image';

interface CremationSettingsProps {
  userData: any;
}

interface NotificationSettings {
  sms_notifications: boolean;
  email_notifications: boolean;
}

function CremationSettingsPage({ userData }: CremationSettingsProps) {
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

  // Payment QR
  const [qrPath, setQrPath] = useState<string | null>(null);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrProgress, setQrProgress] = useState(0);
  const [qrDragOver, setQrDragOver] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadQr = async () => {
      try {
        const res = await fetch('/api/cremation/payment-qr', { credentials: 'include' });
        if (res.ok) {
          const j = await res.json();
          setQrPath(j.qrPath || null);
        }
      } catch {}
    };
    loadQr();
  }, []);

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setShowSkeleton(true);
        const response = await fetch('/api/cremation/notification-preferences');
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

  // Payment QR handlers
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image.';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 10MB.';
    }

    return null;
  };

  const uploadQrFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setQrError(validationError);
      return;
    }

    setQrUploading(true);
    setQrProgress(0);
    setQrError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/cremation/payment-qr');
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setQrProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, {
              status: xhr.status,
              headers: { 'Content-Type': 'application/json' }
            }));
          } else {
            reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error occurred'));
        xhr.send(formData);
      });

      const result = await response.json();
      setQrPath(result.qrPath);
      setMessage({ type: 'success', text: 'Payment QR code uploaded successfully!' });

    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload QR code. Please try again.';

      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }

      setQrError(errorMessage);
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setQrUploading(false);
      setQrProgress(0);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadQrFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setQrDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setQrDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setQrDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Skeleton loading control with minimum delay
  useEffect(() => {
    let skeletonTimer: NodeJS.Timeout | null = null;

    if (!isLoading && showSkeleton) {
      // Add minimum 700ms delay for proper skeleton visibility
      skeletonTimer = setTimeout(() => {
        setShowSkeleton(false);
      }, 700);
    }

    return () => {
      if (skeletonTimer) {
        clearTimeout(skeletonTimer);
      }
    };
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
      const response = await fetch('/api/cremation/notification-preferences', {
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
    <CremationDashboardLayout activePage="settings" userData={userData} skipSkeleton={true}>
      <ProfileLayout
        title="Settings"
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

        {/* Payment QR Section - Moved to top for better accessibility */}
        <ProfileSection
          title="Payment QR Code"
          subtitle="Upload your payment QR code (GCash, Maya, etc.) for customers to scan during checkout"
          showSkeleton={false}
        >
          <ProfileCard>
            <div className="space-y-6">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="grid grid-cols-1 gap-6">
                {/* Upload Section - First on both small and large screens */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <CloudArrowUpIcon className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Upload New QR Code</h3>
                  </div>

                  {/* Upload Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      qrDragOver
                        ? 'border-[var(--primary-green)] bg-green-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    } ${qrUploading ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {qrUploading ? (
                      <div className="space-y-4">
                        <CloudArrowUpIcon className="h-12 w-12 text-[var(--primary-green)] mx-auto" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900">Uploading QR Code...</p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[var(--primary-green)] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${qrProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">{qrProgress}% complete</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <CloudArrowUpIcon className={`h-12 w-12 mx-auto ${qrDragOver ? 'text-[var(--primary-green)]' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {qrDragOver ? 'Drop your QR code here' : 'Click to upload or drag & drop'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            JPEG, PNG, or WebP (max 10MB)
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 bg-[var(--primary-green)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors"
                        >
                          <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                          Choose File
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {qrError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
                          <p className="text-sm text-red-700 mt-1">{qrError}</p>
                        </div>
                        <button
                          onClick={() => setQrError(null)}
                          className="ml-auto text-red-400 hover:text-red-600"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for best results:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Use a clear, high-resolution QR code image</li>
                      <li>• Ensure the QR code is well-lit and in focus</li>
                      <li>• Test the QR code works before uploading</li>
                      <li>• Customers will scan this during checkout</li>
                    </ul>
                  </div>
                </div>

                {/* Current QR Display - Second on both small and large screens */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <QrCodeIcon className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Current QR Code</h3>
                  </div>

                  {qrPath ? (
                    <div className="relative group">
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-square max-w-sm mx-auto bg-gray-50 rounded-lg overflow-hidden">
                          <Image
                            src={qrPath}
                            alt="Payment QR Code"
                            width={400}
                            height={400}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm text-gray-600">Your payment QR code is active</p>
                          <div className="flex items-center justify-center mt-2">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-700">Ready for checkout</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                      <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No QR code uploaded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Upload a QR code to enable manual payments</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ProfileCard>
        </ProfileSection>

        <ProfileSection
          title="Notification Preferences"
          subtitle="Choose how you want to receive notifications_unified about booking updates and business activities"
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
                          Receive text messages for new bookings, booking updates, and urgent matters
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
                          Receive email notifications_unified for booking confirmations, reviews, and business updates
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
                          <li>SMS notifications_unified are sent for new bookings, status updates, and urgent customer requests</li>
                          <li>Email notifications_unified include detailed booking information, customer reviews, and business reports</li>
                          <li>You can change these preferences at any time</li>
                          <li>Critical system notifications_unified will always be sent regardless of these settings</li>
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
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationSettingsPage);
