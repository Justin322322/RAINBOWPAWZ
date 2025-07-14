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
import { getImagePath, addCacheBuster, getProfilePictureUrl } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import {
  ProfileField
} from '@/components/ui/ProfileLayout';
import {
  ProfileInput,
  ProfileButton
} from '@/components/ui/ProfileFormComponents';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { useToast } from '@/context/ToastContext';

interface ProfilePageProps {
  userData?: UserData;
}

function ProfilePage({ userData: initialUserData }: ProfilePageProps) {
  const { showToast } = useToast();

  // Local userData state that can be updated independently
  const [userData, setUserData] = useState<UserData | undefined>(initialUserData);

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

  // Geolocation states
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Update local userData when prop changes
  useEffect(() => {
    if (initialUserData) {
      setUserData(initialUserData);
    }
  }, [initialUserData]);

  // Listen for user data updates from profile changes
  useEffect(() => {
    const handleUserDataUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setUserData(event.detail);
        // Also update session storage to keep it in sync
        try {
          sessionStorage.setItem('user_data', JSON.stringify(event.detail));
        } catch (error) {
          console.error('Failed to update session storage:', error);
        }
      }
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, []);

  // Initialize form data on first load
  useEffect(() => {
    if (userData && initialLoading) {
      setPersonalInfo({
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      });
      setContactInfo({
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || ''
      });

      // Update profile picture timestamp to force refresh if user has a profile picture
      if (userData.profile_picture) {
        setProfilePictureTimestamp(Date.now());
      }

      setInitialLoading(false);
    }
  }, [userData, initialLoading]);

  // Update form data when userData changes (but not when editing)
  useEffect(() => {
    if (userData && !initialLoading && !isEditingPersonal && !isEditingContact) {
      setPersonalInfo({
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      });
      setContactInfo({
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || ''
      });
    }
  }, [userData, isEditingPersonal, isEditingContact, initialLoading]);

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



  // Listen for profile picture updates
  useEffect(() => {
    const handleProfilePictureUpdate = () => {
      // Force refresh of profile picture display
      setProfilePictureTimestamp(Date.now());
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);

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
        showToast('Profile picture must be less than 5MB', 'error');
        return;
      }

      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
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
        showToast('Profile picture updated successfully!', 'success');

        // Update the timestamp to force image refresh
        setProfilePictureTimestamp(Date.now());

        // Clear the preview and file input after successful upload
        setProfilePicture(null);
        setProfilePicturePreview(null);

        // Reset the file input
        if (profilePictureInputRef.current) {
          profilePictureInputRef.current.value = '';
        }

        // Update local userData state immediately
        const updatedUserData = { ...userData, profile_picture: result.profilePicture };
        setUserData(updatedUserData);

        // Trigger user data update event with the new profile picture path
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: updatedUserData
        }));

        // Also trigger profile picture update event for navbar
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: {
            profilePicturePath: result.profilePicture,
            userType: 'user',
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showToast('Failed to upload profile picture. Please try again.', 'error');
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  // Handle personal info update
  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPersonal(true);

    try {
      const response = await fetch(`/api/users/${userData.user_id || userData.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Get specific error message from API response
        const errorMessage = result.error || result.message || 'Failed to update personal information';
        throw new Error(errorMessage);
      }

      if (result.success) {
        showToast('Personal information updated successfully!', 'success');
        setIsEditingPersonal(false);

        // Update local userData state immediately
        const updatedUserData = { ...userData, first_name: personalInfo.firstName, last_name: personalInfo.lastName };
        setUserData(updatedUserData);

        // Trigger user data update event
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: updatedUserData
        }));
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating personal info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update personal information. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsUpdatingPersonal(false);
    }
  };

  // Handle contact info update
  const handleContactInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);

    try {
      const response = await fetch(`/api/users/${userData.user_id || userData.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: contactInfo.email,
          phoneNumber: contactInfo.phone,
          address: contactInfo.address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Get specific error message from API response
        const errorMessage = result.error || result.message || 'Failed to update contact information';
        throw new Error(errorMessage);
      }

      if (result.success) {
        showToast('Contact information updated successfully!', 'success');
        setIsEditingContact(false);

        // Update local userData state immediately
        const updatedUserData = { ...userData, email: contactInfo.email, phone: contactInfo.phone, address: contactInfo.address };
        setUserData(updatedUserData);

        // Trigger user data update event
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: updatedUserData
        }));
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact information. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsUpdatingContact(false);
    }
  };

  // Client-side rate limiting for Nominatim API
  const checkNominatimRateLimit = (): boolean => {
    const RATE_LIMIT_KEY = 'nominatim_last_request';
    const MIN_INTERVAL = 1000; // 1 second minimum between requests

    const lastRequest = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();

    if (lastRequest) {
      const timeSinceLastRequest = now - parseInt(lastRequest);
      if (timeSinceLastRequest < MIN_INTERVAL) {
        return false; // Rate limited
      }
    }

    localStorage.setItem(RATE_LIMIT_KEY, now.toString());
    return true;
  };

  // Fallback geocoding service configuration
  const fallbackGeocode = async (latitude: number, longitude: number): Promise<string> => {
    // Fallback to a simple coordinate-based address format
    const approxLocation = `Approximate location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    // Determine approximate city/region based on coordinates
    if (latitude >= 14.0 && latitude <= 15.0 && longitude >= 120.0 && longitude <= 121.5) {
      return `${approxLocation} (Bataan Province area, Philippines)`;
    }

    return `${approxLocation} (Philippines)`;
  };

  // Enhanced reverse geocoding with rate limiting and timeout
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    // Check rate limit
    if (!checkNominatimRateLimit()) {
      throw new Error('Rate limited. Please wait a moment before trying again.');
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&countrycodes=ph&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)',
            'Referer': window.location.origin
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Try fallback service for rate limiting
          console.warn('Nominatim rate limited, using fallback geocoding');
          return await fallbackGeocode(latitude, longitude);
        }
        throw new Error(`Geocoding service error: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      } else {
        throw new Error('Could not determine address from location');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }

      // If Nominatim fails completely, try fallback
      if (error.message.includes('fetch')) {
        console.warn('Nominatim service unavailable, using fallback geocoding');
        return await fallbackGeocode(latitude, longitude);
      }

      throw error;
    }
  };

  // Get current location using browser geolocation API
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setIsGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Use enhanced reverse geocoding with rate limiting
      try {
        const address = await reverseGeocode(latitude, longitude);
        setContactInfo(prev => ({ ...prev, address }));
        showToast('Location detected successfully! Please review and update if needed.', 'success');
      } catch (geocodeError: any) {
        console.warn('Reverse geocoding failed:', geocodeError.message);

        // Fallback: just show coordinates
        const fallbackAddress = `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`;
        setContactInfo(prev => ({ ...prev, address: fallbackAddress }));

        if (geocodeError.message.includes('Rate limited')) {
          showToast('Please wait a moment before detecting location again.', 'warning');
        } else {
          showToast('Location detected but could not determine address. Please enter your address manually.', 'warning');
        }
      }
    } catch (error: any) {
      let errorMessage = 'Failed to get your location.';

      if (error.code === 1) {
        errorMessage = 'Location access denied. Please enable location permissions and try again.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please check your device settings.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Show loading skeleton if userData is not available yet
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and account settings</p>
        </div>



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
                        src={getProfilePictureUrl(userData.profile_picture)}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        key={profilePictureTimestamp} // Force re-render when timestamp changes
                        onError={(e) => {
                          console.warn('Profile picture failed to load:', userData.profile_picture);
                          // Don't clear the state, just let it fall back to the default icon
                        }}
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPinIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={contactInfo.address}
                          onChange={(e) => setContactInfo(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter your complete address"
                          className="block w-full rounded-lg border border-gray-300 shadow-sm bg-white
                            focus:border-[var(--primary-green)] focus:ring-[var(--primary-green)] focus:ring-1
                            pl-10 pr-32 py-2.5 transition-colors duration-200 text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {isGettingLocation ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary-green)] mr-2"></div>
                              Getting...
                            </div>
                          ) : (
                            'Use Current Location'
                          )}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Location detection powered by{' '}
                        <a
                          href="https://www.openstreetmap.org/copyright"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          OpenStreetMap
                        </a>
                        {' '}contributors
                      </div>
                    </div>
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
