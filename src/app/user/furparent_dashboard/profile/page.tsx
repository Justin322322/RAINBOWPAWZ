'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

import { getProfilePictureUrl, handleImageError, triggerProfilePictureUpdate } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import Image from 'next/image';

import { UserData } from '@/components/withUserAuth';

interface ProfilePageProps {
  userData?: UserData;
}

function ProfilePage({ userData }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile picture state
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    sex: ''
  });

  // Current user data state (for refreshing after profile picture upload)
  const [currentUserData, setCurrentUserData] = useState(userData);

  // Fetch user data from props or session storage
  useEffect(() => {
    console.log('[Profile] useEffect triggered with userData:', userData);
    let userDataToUse = userData;

    // If userData is not provided as prop, try to get it from session storage
    if (!userDataToUse && typeof window !== 'undefined') {
      const sessionUserData = sessionStorage.getItem('user_data');
      console.log('[Profile] Session storage user_data:', sessionUserData);
      if (sessionUserData) {
        try {
          userDataToUse = JSON.parse(sessionUserData);
          console.log('[Profile] Parsed session user data:', userDataToUse);
        } catch (error) {
          console.error('Failed to parse user data from session storage:', error);
        }
      }
    }

    if (userDataToUse) {
      console.log('[Profile] Setting form data with user data:', userDataToUse);
      setFormData({
        firstName: userDataToUse.first_name || '',
        lastName: userDataToUse.last_name || '',
        email: userDataToUse.email || '',
        phoneNumber: userDataToUse.phone || userDataToUse.phone_number || '',
        address: userDataToUse.address || '',
        sex: userDataToUse.gender || userDataToUse.sex || ''
      });
      setCurrentUserData(userDataToUse);
    } else {
      console.log('[Profile] No user data available, attempting to fetch from API');
      // If no user data is available, try to fetch it from the API
      fetchUserDataFromAPI();
    }
  }, [userData]);

  // Function to fetch user data from API as fallback
  const fetchUserDataFromAPI = async () => {
    setIsLoadingUserData(true);
    setError(null);

    try {
      // Get user ID from auth token
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

      if (!authCookie) {
        console.log('[Profile] No auth cookie found');
        setError('Authentication required. Please log in again.');
        return;
      }

      const cookieParts = authCookie.split('=');
      if (cookieParts.length !== 2) {
        console.log('[Profile] Invalid auth cookie format');
        setError('Invalid authentication. Please log in again.');
        return;
      }

      let authValue: string;
      try {
        authValue = decodeURIComponent(cookieParts[1]);
      } catch {
        authValue = cookieParts[1];
      }

      const [userId] = authValue.split('_');
      console.log('[Profile] Fetching user data for ID:', userId);

      const response = await fetch(`/api/users/${userId}?t=${Date.now()}`);
      if (response.ok) {
        const fetchedUserData = await response.json();
        console.log('[Profile] Fetched user data from API:', fetchedUserData);

        setFormData({
          firstName: fetchedUserData.first_name || '',
          lastName: fetchedUserData.last_name || '',
          email: fetchedUserData.email || '',
          phoneNumber: fetchedUserData.phone || fetchedUserData.phone_number || '',
          address: fetchedUserData.address || '',
          sex: fetchedUserData.gender || fetchedUserData.sex || ''
        });
        setCurrentUserData(fetchedUserData);

        // Update session storage
        sessionStorage.setItem('user_data', JSON.stringify(fetchedUserData));
      } else {
        console.error('[Profile] Failed to fetch user data:', response.status, response.statusText);
        setError('Failed to load profile data. Please refresh the page.');
      }
    } catch (error) {
      console.error('[Profile] Error fetching user data:', error);
      setError('Failed to load profile data. Please check your connection and try again.');
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if userData is available (use currentUserData as fallback)
      const userDataToUse = userData || currentUserData;
      if (!userDataToUse || !userDataToUse.id && !userDataToUse.user_id) {
        throw new Error('User data not available. Please refresh the page and try again.');
      }

      // Get the correct user ID field
      const userId = userDataToUse.id || userDataToUse.user_id;

      // Validate required fields
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('First name and last name are required.');
      }

      // Send the updated profile data to the API
      const response = await fetch(`/api/users/${userId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          sex: formData.sex
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();

      // Update session storage with the updated user data
      if (data.user) {
        // Preserve getting started modal state when updating user data
        const sessionKey = `getting_started_shown_${data.user.id}`;
        const permanentKey = `getting_started_dismissed_${data.user.id}`;
        const hasShownInSession = sessionStorage.getItem(sessionKey) === 'true';
        const hasPermanentlyDismissed = localStorage.getItem(permanentKey) === 'true';

        sessionStorage.setItem('user_data', JSON.stringify(data.user));

        // Restore getting started modal state to prevent it from showing again
        if (hasShownInSession) {
          sessionStorage.setItem(sessionKey, 'true');
        }
        if (hasPermanentlyDismissed) {
          localStorage.setItem(permanentKey, 'true');
        }
      }

      setSuccess('Profile updated successfully');
      setIsEditing(false);

      // Update current user data state to reflect changes immediately
      setCurrentUserData(data.user);

      // Update form data to reflect the changes
      setFormData({
        firstName: data.user.first_name || '',
        lastName: data.user.last_name || '',
        email: data.user.email || '',
        phoneNumber: data.user.phone || data.user.phone_number || '',
        address: data.user.address || '',
        sex: data.user.gender || data.user.sex || ''
      });

      // Trigger a custom event to notify other components of the user data update
      const updateEvent = new CustomEvent('userDataUpdated', { detail: data.user });
      window.dispatchEvent(updateEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      const userDataToUse = userData || currentUserData;
      const userId = userDataToUse?.id || userDataToUse?.user_id;

      if (!userId) {
        console.error('No user ID available for refresh');
        return;
      }

      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const updatedUserData = await response.json();
        setCurrentUserData(updatedUserData);

        // Update session storage with new profile picture
        const currentUserData = sessionStorage.getItem('user_data');
        if (currentUserData) {
          try {
            const user = JSON.parse(currentUserData);
            const updatedUser = { ...user, profile_picture: updatedUserData.profile_picture };

            // Preserve getting started modal state when updating user data
            const sessionKey = `getting_started_shown_${user.id}`;
            const permanentKey = `getting_started_dismissed_${user.id}`;
            const hasShownInSession = sessionStorage.getItem(sessionKey) === 'true';
            const hasPermanentlyDismissed = localStorage.getItem(permanentKey) === 'true';

            sessionStorage.setItem('user_data', JSON.stringify(updatedUser));

            // Restore getting started modal state to prevent it from showing again
            if (hasShownInSession) {
              sessionStorage.setItem(sessionKey, 'true');
            }
            if (hasPermanentlyDismissed) {
              localStorage.setItem(permanentKey, 'true');
            }
          } catch (error) {
            console.error('Failed to update session storage:', error);
          }
        }

        console.log('User data refreshed:', updatedUserData);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Profile picture handling functions
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicturePreview(event.target?.result as string);
        setProfilePicture(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePicture = async () => {
    const userDataToUse = userData || currentUserData;
    const userId = userDataToUse?.id || userDataToUse?.user_id;

    if (!profilePicture || !userId) {
      setError('Profile picture or user data not available');
      return;
    }

    setUploadingProfilePicture(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', profilePicture);
      formData.append('userId', userId.toString());

      const response = await fetch('/api/users/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const data = await response.json();
      setSuccess('Profile picture updated successfully!');
      setProfilePicture(null);
      setProfilePicturePreview(null);

      // Reset file input
      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }

      // Refresh user data to show the new profile picture
      await refreshUserData();

      // Trigger profile picture update across all components
      triggerProfilePictureUpdate(data.profilePicturePath);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  const triggerProfilePictureInput = () => {
    if (profilePictureInputRef.current) {
      profilePictureInputRef.current.click();
    }
  };



  return (
    <div className="min-h-screen bg-white">
      {/* Navigation is now handled by layout */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--primary-green)] mb-2">My Profile</h1>
              <p className="text-gray-600">Manage your personal information and pets</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none transition-colors"
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Picture Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="bg-[var(--primary-green)] p-6">
              <h2 className="text-xl font-semibold text-white">Profile Picture</h2>
            </div>
            <div className="p-6">
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
                    ) : currentUserData?.profile_picture ? (
                      <Image
                        src={getProfilePictureUrl(currentUserData.profile_picture)}
                        alt="Profile Picture"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          handleImageError(e, '/bg_4.png');
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
                    ref={profilePictureInputRef}
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    accept="image/*"
                  />

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={triggerProfilePictureInput}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                    >
                      <CameraIcon className="h-5 w-5 mr-2" />
                      Choose Photo
                    </button>

                    {profilePicture && (
                      <button
                        type="button"
                        onClick={uploadProfilePicture}
                        disabled={uploadingProfilePicture}
                        className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none transition-colors disabled:opacity-70"
                      >
                        {uploadingProfilePicture ? (
                          <>
                            <span className="spinner-sm mr-2"></span>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-5 w-5 mr-2" />
                            Upload Photo
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    JPG, PNG, GIF or WebP. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="bg-[var(--primary-green)] p-6">
              <h2 className="text-xl font-semibold text-white">Personal Information</h2>
            </div>

            <div className="p-6">
              {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center">
                  <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                  <XMarkIcon className="h-5 w-5 mr-2 text-red-500" />
                  {error}
                </div>
              )}

              {isLoadingUserData && (
                <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                  Loading profile data...
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] bg-gray-100"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div>
                      <PhilippinePhoneInput
                        id="phoneNumber"
                        name="phoneNumber"
                        label="Phone Number"
                        value={formData.phoneNumber}
                        onChange={(value) => setFormData({...formData, phoneNumber: value})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                      />
                    </div>

                    <div>
                      <label htmlFor="sex" className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        id="sex"
                        name="sex"
                        value={formData.sex}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none transition-colors disabled:opacity-70 flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-sm mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <UserIcon className="h-5 w-5 text-[var(--primary-green)] mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-base text-gray-900">{formData.firstName} {formData.lastName}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <EnvelopeIcon className="h-5 w-5 text-[var(--primary-green)] mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-base text-gray-900">{formData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <PhoneIcon className="h-5 w-5 text-[var(--primary-green)] mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-base text-gray-900">{formData.phoneNumber || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <UserIcon className="h-5 w-5 text-[var(--primary-green)] mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Gender</p>
                      <p className="text-base text-gray-900 capitalize">{formData.sex || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start md:col-span-2">
                    <MapPinIcon className="h-5 w-5 text-[var(--primary-green)] mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-base text-gray-900">{formData.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// Export the component directly (OTP verification is now handled by layout)
export default ProfilePage;
