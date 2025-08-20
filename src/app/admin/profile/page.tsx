'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import { withAdminAuth } from '@/components/withAuth';
import {
  UserIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
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
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';


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
  // Skeleton loading state - starts false to prevent initial animation
  const [showSkeleton, setShowSkeleton] = useState(false);

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

  // Memoize profile picture upload props to prevent unnecessary re-renders
  const profilePictureAdditionalData = useMemo(() => {
    return adminData?.id ? { userId: adminData.id.toString() } : undefined;
  }, [adminData?.id]);

  const handleProfilePictureUploadSuccess = useCallback((profilePicturePath: string) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        profile_picture: profilePicturePath
      });
    }
  }, [profileData]);

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
              <div className="w-full max-w-md mx-auto">
                <div className="bg-gray-100 rounded-2xl p-8 border-2 border-dashed border-gray-200 animate-pulse">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                      <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                    <div className="text-center space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                      <div className="flex items-center justify-center space-x-4">
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ProfilePictureUpload
                currentImagePath={profileData?.profile_picture || undefined}
                userType="admin"
                apiEndpoint="/api/admin/upload-profile-picture"
                additionalData={profilePictureAdditionalData}
                size="lg"
                onUploadSuccess={handleProfilePictureUploadSuccess}
              />
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
