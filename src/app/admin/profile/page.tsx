'use client';

import { useState, useEffect, useRef } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import {
  UserIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import {
  ProfileLayout,
  ProfileSection,
  ProfileCard,
  ProfileField,
  ProfileFormGroup,
  ProfileGrid
} from '@/components/ui/ProfileLayout';
import {
  ProfileInput,
  ProfileButton,
  ProfileAlert
} from '@/components/ui/ProfileFormComponents';


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

  // Skeleton loading state - starts false to prevent initial animation
  const [showSkeleton, setShowSkeleton] = useState(false);

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

    // Show skeleton immediately when starting to load
    setShowSkeleton(true);
    loadProfileData();
  }, []);

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
    } catch {
      setContactError('Failed to update contact information. Please try again.');
    } finally {
      setIsUpdatingContact(false);
    }
  };



  const userName = profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Admin';

  return (
    <AdminDashboardLayout activePage="profile" userName={userName} skipSkeleton={true}>
      <ProfileLayout
        title="Admin Profile"
        subtitle="Manage your administrator account settings and information"
        icon={<UserIcon className="h-8 w-8" />}
        className="p-6"
        showSkeleton={showSkeleton || isLoading}
      >
        {/* Profile Picture Section with Skeleton Loading */}
        <ProfileSection
          title="Profile Picture"
          subtitle="Upload and manage your profile picture"
          showSkeleton={showSkeleton || isLoading}
        >
          <ProfileCard>
            {showSkeleton || isLoading ? (
              /* Profile Picture Section Skeleton */
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-3">
                    <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
                    <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Actual Profile Picture Content */
              <div className="flex items-center space-x-6">
                {/* Current/Preview Profile Picture */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center shadow-lg">
                    {profilePicturePreview ? (
                      <Image
                        src={profilePicturePreview}
                        alt="Profile Picture Preview"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : profileData?.profile_picture ? (
                      <Image
                        src={profileData.profile_picture}
                        alt="Profile Picture"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Failed to load profile picture:', e.currentTarget.src);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = '<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                          }
                        }}
                      />
                    ) : (
                      <UserIcon className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  {profilePicturePreview && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-lg">
                      <CheckCircleIcon className="w-5 h-5" />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-[var(--primary-green)] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-[var(--primary-green-hover)] transition-colors"
                  >
                    <CameraIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    accept="image/*"
                  />

                  {profilePicturePreview ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 font-medium">New profile picture preview</p>
                        <p className="text-xs text-blue-600 mt-1">Click upload to save changes</p>
                      </div>
                      <div className="flex space-x-3">
                        <ProfileButton
                          variant="primary"
                          onClick={handleProfilePictureUpload}
                          loading={isUploadingPicture}
                          icon={<CheckCircleIcon className="h-5 w-5" />}
                        >
                          {isUploadingPicture ? 'Uploading...' : 'Upload Picture'}
                        </ProfileButton>
                        <ProfileButton
                          variant="secondary"
                          onClick={() => {
                            setProfilePicture(null);
                            setProfilePicturePreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          icon={<XCircleIcon className="h-5 w-5" />}
                        >
                          Cancel
                        </ProfileButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ProfileButton
                        variant="secondary"
                        onClick={triggerProfilePictureInput}
                        icon={<CameraIcon className="h-5 w-5" />}
                      >
                        Choose New Picture
                      </ProfileButton>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          Upload a profile picture (JPEG, PNG, GIF, or WebP, max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ProfileCard>
        </ProfileSection>

        {/* Account Information Section */}
        <ProfileSection
          title="Account Information"
          subtitle="Read-only administrator account details"
          showSkeleton={showSkeleton || isLoading}
        >
          <ProfileCard>
            {showSkeleton || isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 bg-gray-200 rounded flex-1 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ProfileGrid cols={3}>
                <ProfileField
                  label="Full Name"
                  value={profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Not available'}
                  icon={<UserIcon className="h-5 w-5" />}
                />
                <ProfileField
                  label="Email Address"
                  value={profileData?.email || 'Not available'}
                  icon={<EnvelopeIcon className="h-5 w-5" />}
                />
                <ProfileField
                  label="Role"
                  value={profileData?.admin_role || 'Administrator'}
                  icon={<ShieldCheckIcon className="h-5 w-5" />}
                />
              </ProfileGrid>
            )}
          </ProfileCard>
        </ProfileSection>

        {/* Contact Information Section */}
        <ProfileSection
          title="Contact Information"
          subtitle="Update your personal contact details"
          showSkeleton={showSkeleton || isLoading}
        >
          <ProfileCard>
            {showSkeleton || isLoading ? (
              <div className="space-y-6">
                {/* Form Group Header */}
                <div>
                  <div className="h-5 bg-gray-200 rounded w-36 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-60 animate-pulse"></div>
                </div>

                {/* Two-column grid fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                    </div>
                  ))}
                </div>

                {/* Full-width email field */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>

                {/* Button area */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <div className="h-10 bg-gray-200 rounded w-56 animate-pulse"></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactUpdate} className="space-y-6">
                {contactSuccess && (
                  <ProfileAlert
                    type="success"
                    message={contactSuccess}
                    onClose={() => setContactSuccess(null)}
                  />
                )}

                {contactError && (
                  <ProfileAlert
                    type="error"
                    message={contactError}
                    onClose={() => setContactError(null)}
                  />
                )}

                <ProfileFormGroup
                  title="Personal Details"
                  subtitle="Your name and contact information"
                >
                  <ProfileGrid cols={2}>
                    <ProfileInput
                      label="First Name"
                      value={contactInfo.first_name}
                      onChange={(value) => setContactInfo({...contactInfo, first_name: value})}
                      icon={<UserIcon className="h-5 w-5" />}
                    />
                    <ProfileInput
                      label="Last Name"
                      value={contactInfo.last_name}
                      onChange={(value) => setContactInfo({...contactInfo, last_name: value})}
                      icon={<UserIcon className="h-5 w-5" />}
                    />
                  </ProfileGrid>

                  <ProfileInput
                    label="Email Address"
                    type="email"
                    value={contactInfo.email}
                    onChange={(value) => setContactInfo({...contactInfo, email: value})}
                    icon={<EnvelopeIcon className="h-5 w-5" />}
                  />
                </ProfileFormGroup>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <ProfileButton
                    type="submit"
                    variant="primary"
                    loading={isUpdatingContact}
                    icon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    {isUpdatingContact ? 'Updating...' : 'Update Contact Information'}
                  </ProfileButton>
                </div>
              </form>
            )}
          </ProfileCard>
        </ProfileSection>
      </ProfileLayout>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminProfilePage);
