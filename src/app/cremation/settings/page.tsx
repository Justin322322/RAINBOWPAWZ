'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import {
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
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
  ProfileButton
} from '@/components/ui/ProfileFormComponents';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';

interface CremationSettingsProps {
  userData: any;
}

interface NotificationSettings {
  sms_notifications: boolean;
  email_notifications: boolean;
}

function CremationSettingsPage({ userData }: CremationSettingsProps) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    sms_notifications: true,
    email_notifications: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

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
      showToast('Payment QR code uploaded successfully!', 'success');

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
      showToast(errorMessage, 'error');
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

  // Skeleton loading control
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

    try {
      const response = await fetch('/api/cremation/notification-preferences', {
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
    <CremationDashboardLayout activePage="settings" userData={userData} skipSkeleton={true}>
      <ProfileLayout
        title="Settings"
        subtitle="Manage your notification preferences and account settings"
        icon={<Cog6ToothIcon className="h-8 w-8 text-white" />}
        className="p-6"
        showSkeleton={showSkeleton || isLoading}
      >
        {/* Payment QR Section - Compact modern design */}
        <ProfileSection
          title="Payment QR Code"
          subtitle="Upload your payment QR code (GCash, Maya, etc.) for customers to scan during checkout"
          showSkeleton={false}
        >
          <ProfileCard>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Upload QR Code</h3>
                  {qrPath && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Active
                    </div>
                  )}
                </div>

                {/* Compact Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                    qrDragOver
                      ? 'border-[var(--primary-green)] bg-green-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  } ${qrUploading ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {qrUploading ? (
                    <div className="space-y-3">
                      <CloudArrowUpIcon className="h-8 w-8 text-[var(--primary-green)] mx-auto animate-pulse" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900">Uploading...</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-[var(--primary-green)] h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${qrProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{qrProgress}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <CloudArrowUpIcon className={`h-8 w-8 mx-auto ${qrDragOver ? 'text-[var(--primary-green)]' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {qrDragOver ? 'Drop your QR code here' : 'Click to upload or drag & drop'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          JPEG, PNG, or WebP (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {qrError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-red-700">{qrError}</p>
                      </div>
                      <button
                        onClick={() => setQrError(null)}
                        className="text-red-400 hover:text-red-600 ml-2"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Compact Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-2">💡</div>
                    <div>
                      <p className="text-xs font-medium text-blue-800 mb-1">Tips for best results:</p>
                      <ul className="text-xs text-blue-700 space-y-0.5">
                        <li>• Use clear, high-resolution image</li>
                        <li>• Ensure QR code is well-lit and in focus</li>
                        <li>• Test before uploading</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current QR Display */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Current QR Code</h3>
                
                {qrPath ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="aspect-square max-w-xs mx-auto bg-gray-50 rounded-lg overflow-hidden">
                      <Image
                        src={qrPath}
                        alt="Payment QR Code"
                        width={300}
                        height={300}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <div className="flex items-center justify-center text-sm text-green-700">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Ready for checkout
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No QR code uploaded</p>
                    <p className="text-xs text-gray-400 mt-1">Upload to enable manual payments</p>
                  </div>
                )}
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
