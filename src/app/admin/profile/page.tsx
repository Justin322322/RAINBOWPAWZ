'use client';

import { useState, useEffect, useRef } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';

interface AdminProfileProps {
  adminData: any;
}

interface ProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  full_name: string;
  admin_role: string;
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

function AdminProfilePage({ adminData }: AdminProfileProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contact form state
  const [contactInfo, setContactInfo] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Load profile data on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          setProfileData(data.profile);
          setContactInfo({
            first_name: data.profile.first_name,
            last_name: data.profile.last_name,
            email: data.profile.email
          });
        } else {
          console.error('Failed to load profile data');
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  // Handle profile picture file selection
  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfilePicture(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePicturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger profile picture input
  const triggerProfilePictureInput = () => {
    fileInputRef.current?.click();
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async () => {
    if (!profilePicture) return;

    setIsUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append('profilePicture', profilePicture);
      formData.append('userId', adminData.id.toString());

      const response = await fetch('/api/admin/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => prev ? { ...prev, profile_picture: data.profilePicturePath } : null);

        // Update admin data in session storage
        const adminDataStorage = sessionStorage.getItem('admin_data');
        if (adminDataStorage) {
          try {
            const admin = JSON.parse(adminDataStorage);
            admin.profile_picture = data.profilePicturePath;
            sessionStorage.setItem('admin_data', JSON.stringify(admin));

            // Trigger profile picture update event
            window.dispatchEvent(new Event('profilePictureUpdated'));
          } catch (error) {
            console.error('Failed to update admin data in session storage:', error);
          }
        }

        // Clear preview and file
        setProfilePicturePreview(null);
        setProfilePicture(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to upload profile picture:', errorData.error);
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  // Handle contact information update
  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);
    setContactSuccess(null);
    setContactError(null);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: contactInfo.first_name,
          last_name: contactInfo.last_name,
          email: contactInfo.email
        }),
      });

      if (response.ok) {
        setContactSuccess('Contact information updated successfully!');
        // Reload profile data
        const profileResponse = await fetch('/api/admin/profile');
        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfileData(data.profile);
        }
      } else {
        const errorData = await response.json();
        setContactError(errorData.error || 'Failed to update contact information');
      }
    } catch (error) {
      setContactError('Failed to update contact information. Please try again.');
    } finally {
      setIsUpdatingContact(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: contactInfo.first_name,
          last_name: contactInfo.last_name,
          email: contactInfo.email,
          current_password: currentPassword,
          new_password: newPassword
        }),
      });

      if (response.ok) {
        setPasswordSuccess('Password updated successfully!');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await response.json();
        setPasswordError(errorData.error || 'Failed to update password');
      }
    } catch (error) {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const userName = profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Admin';

  return (
    <AdminDashboardLayout activePage="profile" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center">
          <div className="bg-[var(--primary-green)] rounded-full p-3 mr-4">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Admin Profile</h1>
            <p className="text-gray-600 mt-1">Manage your account settings and information</p>
          </div>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Picture</h2>
        <div className="flex items-center space-x-6">
          {/* Current/Preview Profile Picture */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center">
              {profilePicturePreview ? (
                <Image
                  src={profilePicturePreview}
                  alt="Profile Picture Preview"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : profileData?.profile_picture ? (
                <Image
                  src={profileData.profile_picture}
                  alt="Profile Picture"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load profile picture:', e.currentTarget.src);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                    }
                  }}
                />
              ) : (
                <UserIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            {profilePicturePreview && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                ✓
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureChange}
              className="hidden"
              accept="image/*"
            />

            {profilePicturePreview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">New profile picture preview</p>
                  <p className="text-xs text-gray-500">Click upload to save changes</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleProfilePictureUpload}
                    disabled={isUploadingPicture}
                    className="px-4 py-2 bg-[var(--primary-green)] hover:bg-[var(--primary-green-dark)] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploadingPicture ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : 'Upload Picture'}
                  </button>
                  <button
                    onClick={() => {
                      setProfilePicture(null);
                      setProfilePicturePreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={triggerProfilePictureInput}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Choose New Picture
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Upload a profile picture (JPEG, PNG, GIF, or WebP, max 5MB)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Information Panel */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Account Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Not available'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{profileData?.email || 'Not available'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-sm font-medium text-gray-500">Role</h3>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{profileData?.admin_role || 'Administrator'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Panel */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-800">Contact Information</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleContactUpdate} className="space-y-4 max-w-xl">
                {contactSuccess && (
                  <div className="bg-green-50 text-green-800 p-3 rounded-lg flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                    <p className="text-sm">{contactSuccess}</p>
                  </div>
                )}

                {contactError && (
                  <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-start">
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                    <p className="text-sm">{contactError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={contactInfo.first_name}
                      onChange={(e) => setContactInfo({...contactInfo, first_name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={contactInfo.last_name}
                      onChange={(e) => setContactInfo({...contactInfo, last_name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingContact}
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50"
                  >
                    {isUpdatingContact ? 'Updating...' : 'Update Contact Information'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Change Password Panel */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <KeyIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-800">Change Password</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
                {passwordError && (
                  <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-start">
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                    <p className="text-sm">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-50 text-green-800 p-3 rounded-lg flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                    <p className="text-sm">{passwordSuccess}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminProfilePage);
