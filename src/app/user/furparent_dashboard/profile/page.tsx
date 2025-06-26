'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  PencilIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import withUserAuth, { UserData } from '@/components/withUserAuth';
import Image from 'next/image';
import { getImagePath, addCacheBuster } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import {
  ProfileField
} from '@/components/ui/ProfileLayout';
import {
  ProfileInput,
  ProfileButton,
  ProfileAlert
} from '@/components/ui/ProfileFormComponents';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

interface ProfilePageProps {
  userData?: UserData;
}

function ProfilePage({ userData }: ProfilePageProps) {

  // Loading and error states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Skeleton loading state with minimum delay
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Edit mode states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: ''
  });
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
    address: ''
  });

  // Profile picture states
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [profilePictureTimestamp, setProfilePictureTimestamp] = useState<number>(Date.now());
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Loading states for individual sections
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);

  // Initialize form data when userData changes
  useEffect(() => {
    if (userData) {
      setPersonalInfo({
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      });
      setContactInfo({
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || ''
      });
      setInitialLoading(false);
    }
  }, [userData]);

  // Skeleton loading control with minimum delay (600-800ms for fur parent standards)
  useEffect(() => {
    let skeletonTimer: NodeJS.Timeout | null = null;

    if (!initialLoading && userData) {
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
  }, [initialLoading, userData]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success, error]);

  if (!userData || showSkeleton || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <SkeletonCard
              withHeader={true}
              contentLines={1}
              withFooter={false}
              withShadow={false}
              rounded="lg"
              animate={true}
              className="bg-transparent shadow-none"
            />
            <SkeletonCard
              withImage={true}
              imageHeight="h-32"
              withHeader={true}
              contentLines={4}
              withFooter={true}
              withShadow={true}
              rounded="lg"
              animate={true}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <SkeletonCard
                  key={i}
                  withHeader={true}
                  contentLines={6}
                  withFooter={false}
                  withShadow={true}
                  rounded="lg"
                  animate={true}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle profile picture selection
  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Profile picture must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async () => {
    if (!profilePicture) return;

    setUploadingProfilePicture(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', profilePicture);

      const response = await fetch(`/api/users/${userData.user_id || userData.id}/profile-picture`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Profile picture updated successfully!');

        // Update the timestamp to force image refresh
        setProfilePictureTimestamp(Date.now());

        // Clear the preview and file input after successful upload
        setProfilePicture(null);
        setProfilePicturePreview(null);

        // Reset the file input
        if (profilePictureInputRef.current) {
          profilePictureInputRef.current.value = '';
        }

        // Trigger user data update event with the new profile picture path
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { ...userData, profile_picture: result.profilePicture }
        }));
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  // Handle personal info update
  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPersonal(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userData.user_id || userData.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update personal information');
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Personal information updated successfully!');
        setIsEditingPersonal(false);

        // Trigger user data update event
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { ...userData, first_name: personalInfo.firstName, last_name: personalInfo.lastName }
        }));
      }
    } catch (error) {
      console.error('Error updating personal info:', error);
      setError('Failed to update personal information. Please try again.');
    } finally {
      setIsUpdatingPersonal(false);
    }
  };

  // Handle contact info update
  const handleContactInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userData.user_id || userData.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contactInfo.email,
          phone: contactInfo.phone,
          address: contactInfo.address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact information');
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Contact information updated successfully!');
        setIsEditingContact(false);

        // Trigger user data update event
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { ...userData, email: contactInfo.email, phone: contactInfo.phone, address: contactInfo.address }
        }));
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      setError('Failed to update contact information. Please try again.');
    } finally {
      setIsUpdatingContact(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and account settings</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6">
            <ProfileAlert
              type="success"
              message={success}
              onClose={() => setSuccess(null)}
            />
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ProfileAlert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Picture Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-900">Profile Picture</h2>
              <p className="text-sm text-gray-600 mt-1">Upload a profile picture to personalize your account</p>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                    {profilePicturePreview ? (
                      <Image
                        src={profilePicturePreview}
                        alt="Profile Preview"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : userData.profile_picture ? (
                      <Image
                        src={addCacheBuster(getImagePath(userData.profile_picture))}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        key={profilePictureTimestamp} // Force re-render when timestamp changes
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <UserIcon className="h-12 w-12 text-white" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => profilePictureInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-green-600 text-white p-2 rounded-full shadow-lg hover:bg-green-700 transition-colors duration-200"
                    disabled={uploadingProfilePicture}
                  >
                    <CameraIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {userData.first_name || 'User'} {userData.last_name || ''}
                  </h3>
                  <p className="text-gray-600">{userData.email}</p>
                  <p className="text-sm text-gray-500 mt-1">Pet Parent Account</p>

                  {profilePicture && (
                    <div className="mt-4 flex items-center space-x-3">
                      <ProfileButton
                        onClick={uploadProfilePicture}
                        loading={uploadingProfilePicture}
                        variant="primary"
                        size="sm"
                      >
                        Upload Picture
                      </ProfileButton>
                      <ProfileButton
                        onClick={() => {
                          setProfilePicture(null);
                          setProfilePicturePreview(null);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Cancel
                      </ProfileButton>
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={profilePictureInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-600 mt-1">Your basic personal details</p>
              </div>
              <ProfileButton
                onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                variant="secondary"
                size="sm"
                icon={isEditingPersonal ? <XMarkIcon className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
              >
                {isEditingPersonal ? 'Cancel' : 'Edit'}
              </ProfileButton>
            </div>
            <div className="p-6">
              {isEditingPersonal ? (
                <form onSubmit={handlePersonalInfoUpdate}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProfileInput
                        label="First Name"
                        value={personalInfo.firstName}
                        onChange={(value) => setPersonalInfo(prev => ({ ...prev, firstName: value }))}
                        required
                        icon={<UserIcon className="h-5 w-5" />}
                      />
                      <ProfileInput
                        label="Last Name"
                        value={personalInfo.lastName}
                        onChange={(value) => setPersonalInfo(prev => ({ ...prev, lastName: value }))}
                        required
                        icon={<UserIcon className="h-5 w-5" />}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                    <ProfileButton
                      type="submit"
                      variant="primary"
                      loading={isUpdatingPersonal}
                      icon={<CheckCircleIcon className="h-5 w-5" />}
                    >
                      {isUpdatingPersonal ? 'Updating...' : 'Update Personal Information'}
                    </ProfileButton>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileField
                    label="First Name"
                    value={userData.first_name || 'Not provided'}
                    icon={<UserIcon className="h-5 w-5" />}
                  />
                  <ProfileField
                    label="Last Name"
                    value={userData.last_name || 'Not provided'}
                    icon={<UserIcon className="h-5 w-5" />}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
                <p className="text-sm text-gray-600 mt-1">Your contact details and address</p>
              </div>
              <ProfileButton
                onClick={() => setIsEditingContact(!isEditingContact)}
                variant="secondary"
                size="sm"
                icon={isEditingContact ? <XMarkIcon className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
              >
                {isEditingContact ? 'Cancel' : 'Edit'}
              </ProfileButton>
            </div>
            <div className="p-6">
              {isEditingContact ? (
                <form onSubmit={handleContactInfoUpdate}>
                  <div className="space-y-4">
                    <ProfileInput
                      label="Email Address"
                      type="email"
                      value={contactInfo.email}
                      onChange={(value) => setContactInfo(prev => ({ ...prev, email: value }))}
                      required
                      icon={<EnvelopeIcon className="h-5 w-5" />}
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <PhilippinePhoneInput
                        value={contactInfo.phone}
                        onChange={(value) => setContactInfo(prev => ({ ...prev, phone: value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <ProfileInput
                      label="Address"
                      value={contactInfo.address}
                      onChange={(value) => setContactInfo(prev => ({ ...prev, address: value }))}
                      placeholder="Enter your complete address"
                      icon={<MapPinIcon className="h-5 w-5" />}
                    />
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
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
              ) : (
                <div className="space-y-6">
                  <ProfileField
                    label="Email Address"
                    value={userData.email || 'Not provided'}
                    icon={<EnvelopeIcon className="h-5 w-5" />}
                  />
                  <ProfileField
                    label="Phone Number"
                    value={userData.phone || 'Not provided'}
                    icon={<PhoneIcon className="h-5 w-5" />}
                  />
                  <ProfileField
                    label="Address"
                    value={userData.address || 'Not provided'}
                    icon={<MapPinIcon className="h-5 w-5" />}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Account Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
              <p className="text-sm text-gray-600 mt-1">Your account status and verification details</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileField
                  label="Account Status"
                  value="Active"
                  valueClassName="text-green-600 font-medium"
                  icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
                />
                <ProfileField
                  label="Account Type"
                  value="Pet Parent"
                  icon={<UserIcon className="h-5 w-5" />}
                />
                <ProfileField
                  label="OTP Verification"
                  value={userData.is_otp_verified ? "Verified" : "Pending"}
                  valueClassName={userData.is_otp_verified ? "text-green-600 font-medium" : "text-orange-600 font-medium"}
                  icon={userData.is_otp_verified ?
                    <CheckCircleIcon className="h-5 w-5 text-green-500" /> :
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                  }
                />
                {userData.created_at && (
                  <ProfileField
                    label="Member Since"
                    value={new Date(userData.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    icon={<UserIcon className="h-5 w-5" />}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Information Notice Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Profile Information</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Your profile information is used to personalize your experience and help cremation service providers
                  better serve you. You can update your information anytime using the edit buttons above. Make sure
                  your contact information is accurate so service providers can reach you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withUserAuth(ProfilePage);
