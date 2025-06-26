'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  CheckCircleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  InformationCircleIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getImagePath } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import Image from 'next/image';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
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
  ProfileTextarea,
  ProfileButton,
  ProfileAlert
} from '@/components/ui/ProfileFormComponents';

function CremationProfilePage({ userData }: { userData: any }) {
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [_passwordError, setPasswordError] = useState('');
  const [_passwordSuccess, setPasswordSuccess] = useState('');

  // Address states
  const [address, setAddress] = useState({
    street: ''
  });
  const [_addressSuccess, setAddressSuccess] = useState('');

  // Contact info states
  const [contactInfo, setContactInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [contactSuccess, setContactSuccess] = useState('');

  // Business info states
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    description: '',
    hours: ''
  });
  const [businessSuccess, setBusinessSuccess] = useState('');

  // Profile data state
  const [profileData, setProfileData] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true); // Only for initial page load
  const [error, setError] = useState<string | null>(null);

  // Document upload states
  const [_showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [documents, setDocuments] = useState({
    businessPermit: { file: null as File | null, preview: null as string | null },
    birCertificate: { file: null as File | null, preview: null as string | null },
    governmentId: { file: null as File | null, preview: null as string | null }
  });

  // Profile picture upload states
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [profilePictureTimestamp, setProfilePictureTimestamp] = useState<number>(Date.now());

  // Document preview modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fileInputRefs = {
    businessPermit: useRef<HTMLInputElement>(null),
    birCertificate: useRef<HTMLInputElement>(null),
    governmentId: useRef<HTMLInputElement>(null),
  };

  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  // Define fetchProfileData function outside useEffect so it can be called elsewhere
  const fetchProfileData = useCallback(async (forceLoading = true) => {
    try {
      // For secure JWT authentication, always try to fetch from server
      // Don't rely on client-side authentication checks

      // Only set loading state if explicitly requested (for initial load)
      if (forceLoading) {
        setInitialLoading(true);
      }
      setError(null); // Clear any previous errors

      // Add cache-busting query parameter and no-cache headers
      const response = await fetch(`/api/cremation/profile?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include' // Important: Include credentials with the request
      });

      // Parse response data first
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Failed to parse server response');
      }

      // Check response status after parsing data
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please try logging in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this resource.');
        } else {
          throw new Error(data.error || data.message || 'Failed to fetch profile data');
        }
      }

      // Map API response to expected structure
      const mappedProfile = {
        ...data.profile,
        profilePicturePath: data.profile.profile_picture || null, // Map profile_picture to profilePicturePath
        name: data.profile.business_name || `${data.profile.first_name} ${data.profile.last_name}`,
        contactPerson: `${data.profile.first_name} ${data.profile.last_name}`,
        address: {
          street: data.profile.business_address || data.profile.address || ''
        },
        // Use documents from API response
        documents: data.profile.documents || {
          businessPermitPath: null,
          birCertificatePath: null,
          governmentIdPath: null
        }
      };

      setProfileData(mappedProfile);

      // Update form states with fetched data
      if (data.profile) {
        // Parse address if it's a string
        const addressString = data.profile.business_address || data.profile.address || '';
        setAddress({
          street: addressString
        });

        // Set contact info from profile data
        setContactInfo({
          firstName: data.profile.first_name || '',
          lastName: data.profile.last_name || '',
          email: data.profile.email || '',
          phone: data.profile.business_phone || data.profile.phone || ''
        });

        // Set business info from profile data
        setBusinessInfo({
          businessName: data.profile.business_name || '',
          description: data.profile.description || '',
          hours: data.profile.hours || ''
        });
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching profile data:', error);

      // Check if this is a logout scenario (user intentionally logged out)
      const isLogoutScenario = window.location.pathname !== '/cremation/profile' ||
                              document.cookie.indexOf('auth_token') === -1;

      if (!isLogoutScenario) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
        // Show toast only if not in logout scenario
        showToast(error instanceof Error ? error.message : 'Failed to load profile data. Please try again.', 'error');

        // If authentication error and not logging out, redirect to login after a short delay
        if (error instanceof Error &&
            (error.message.includes('Authentication failed') ||
              error.message.includes('not authorized') ||
              error.message.includes('Unauthorized'))) {
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      }
    } finally {
      setInitialLoading(false);
    }
  }, [showToast]);

  // Check for showDocuments query parameter on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showDocuments') === 'true') {
      showDocumentsModal();

      // Clear the URL parameter after showing the modal
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch profile data only on initial mount
  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const fetchData = async () => {
      // Only proceed if component is still mounted
      if (isMounted) {
        await fetchProfileData();
      }
    };

    fetchData();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [fetchProfileData]); // Include fetchProfileData dependency

  const _handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    // For demonstration purposes, simulate a successful password change
    // Check if current password is "password123" (just for demo)
    if (currentPassword !== "password123") {
      setPasswordError('Current password is incorrect');
      return;
    }

    try {
      // Simulate API call delay
      setTimeout(() => {
        setPasswordSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 800);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  const _handleAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.street.trim()) {
      showToast('Please enter a valid address', 'error');
      return;
    }

    try {
      // Call the real API to update the address
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            street: address.street.trim()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update address');
      }

      await response.json();

      // Update the profile data with the new address
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          business_address: address.street.trim(),
          address: {
            street: address.street.trim()
          }
        };

        setProfileData(updatedProfile);
      }

      setAddressSuccess('Address updated successfully');
      showToast('Address updated successfully', 'success');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setAddressSuccess('');
      }, 3000);

      // Refresh profile data to get the latest from server
      await fetchProfileData(false);
    } catch (error) {
      console.error('Address update error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update address', 'error');
    }
  };

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess('');

    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactInfo: contactInfo
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setContactSuccess('Contact information updated successfully!');
        // Refresh profile data to show updated info
        await fetchProfileData(false);
        // Clear success message after 3 seconds
        setTimeout(() => setContactSuccess(''), 3000);
      } else {
        showToast(data.error || 'Failed to update contact information', 'error');
      }
    } catch (error) {
      console.error('Error updating contact information:', error);
      showToast('Failed to update contact information. Please try again.', 'error');
    }
  };

  const handleBusinessUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSuccess('');

    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: businessInfo.businessName,
          description: businessInfo.description,
          hours: businessInfo.hours,
          // Include current contact info to prevent overwriting
          first_name: contactInfo.firstName,
          last_name: contactInfo.lastName,
          phone: contactInfo.phone,
          address: address.street
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setBusinessSuccess('Business information updated successfully!');
        // Refresh profile data to show updated info
        await fetchProfileData(false);
        // Clear success message after 3 seconds
        setTimeout(() => setBusinessSuccess(''), 3000);
      } else {
        showToast(data.error || 'Failed to update business information', 'error');
      }
    } catch (error) {
      console.error('Error updating business information:', error);
      showToast('Failed to update business information. Please try again.', 'error');
    }
  };

  // Document modal functions
  const showDocumentsModal = () => {
    setShowDocumentModal(true);
  };

  const hideDocumentsModal = () => {
    setShowDocumentModal(false);
    // Reset file upload state
    setDocuments({
      businessPermit: { file: null, preview: null },
      birCertificate: { file: null, preview: null },
      governmentId: { file: null, preview: null }
    });
    setUploadError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof documents) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type and size
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        showToast('Please select a valid file (PDF, JPG, or PNG)', 'error');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result as string;
        console.log(`File loaded for ${type}:`, result ? 'Success' : 'Failed');
        setDocuments(prev => ({
          ...prev,
          [type]: {
            file,
            preview: result
          }
        }));
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        showToast('Failed to read file. Please try again.', 'error');
      };

      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      ref.current.click();
    }
  };

  const handleRemoveFile = (type: keyof typeof documents) => {
    setDocuments(prev => ({
      ...prev,
      [type]: {
        file: null,
        preview: null
      }
    }));
  };

  // Profile picture handling functions
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicturePreview(event.target?.result as string);
        setProfilePicture(file);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        showToast('Failed to read file', 'error');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePicture) {
      showToast('Please select a profile picture first', 'error');
      return;
    }

    setUploadingProfilePicture(true);

    try {
      // Use userData from the secure authentication system
      if (!userData?.user_id) {
        throw new Error('User ID not available');
      }

      const formData = new FormData();
      formData.append('profilePicture', profilePicture);
      formData.append('userId', userData.user_id.toString());

      const response = await fetch('/api/cremation/upload-profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const data = await response.json();

      // Update profile data with new profile picture path and add cache busting
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          profilePicturePath: data.profilePicturePath
        };
        setProfileData(updatedProfile);
      }

      // Update timestamp to force image refresh
      setProfilePictureTimestamp(Date.now());

      // Refresh profile data from server to ensure we have the latest information
      await fetchProfileData(false); // Don't show loading indicator

      showToast('Profile picture updated successfully!', 'success');
      setProfilePicture(null);
      setProfilePicturePreview(null);

      // Reset file input
      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }

      // Update the cached user data with new profile picture
      try {
        // Use the utility function to update all caches (this also dispatches the event)
        const { updateCachedProfilePicture } = await import('@/utils/businessVerificationCache');
        updateCachedProfilePicture(data.profilePicturePath);
      } catch (error) {
        console.error('Error updating cached user data:', error);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload profile picture', 'error');
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  const triggerProfilePictureInput = () => {
    if (profilePictureInputRef.current) {
      profilePictureInputRef.current.click();
    }
  };

  const openPreviewModal = (imagePath: string, title: string) => {
    setPreviewImage({ url: getImagePath(imagePath), title });
    setShowPreviewModal(true);
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewImage(null);
  };

  const handleDocumentsUpload = async () => {
    // Use the authenticated user ID from the secure authentication system
    if (!userData?.user_id) {
      setUploadError('User ID not available. Please try logging in again.');
      return;
    }

    // Check if at least one file is selected
    const hasFiles = Object.values(documents).some(doc => doc.file !== null);
    if (!hasFiles) {
      setUploadError('Please select at least one document to upload');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('userId', userData.user_id.toString());

      // Append files that exist
      if (documents.businessPermit.file) {
        formData.append('businessPermit', documents.businessPermit.file);
      }

      if (documents.birCertificate.file) {
        formData.append('birCertificate', documents.birCertificate.file);
      }

      if (documents.governmentId.file) {
        formData.append('governmentId', documents.governmentId.file);
      }

      // Make the actual API call to upload documents
      const response = await fetch('/api/businesses/upload-documents', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload documents');
      }

      const data = await response.json();

      showToast('Documents uploaded successfully!', 'success');
      hideDocumentsModal();

      // Refresh profile data from server to get the latest document paths
      await fetchProfileData(false); // Don't show loading indicator

      // Also update the profile data locally with the new document paths from the API response
      if (profileData && data.filePaths) {
        const updatedProfile = {
          ...profileData,
          documents: {
            ...profileData.documents,
            businessPermitPath: data.filePaths.business_permit_path || profileData.documents.businessPermitPath,
            birCertificatePath: data.filePaths.bir_certificate_path || profileData.documents.birCertificatePath,
            governmentIdPath: data.filePaths.government_id_path || profileData.documents.governmentIdPath
          }
        };

        setProfileData(updatedProfile);
      }

      setUploading(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload documents');
      setUploading(false);
    }
  };

  return (
    <CremationDashboardLayout activePage="profile" userData={userData}>
      <ProfileLayout
        title="My Profile"
        subtitle="Manage your account settings and business information"
        icon={<UserIcon className="h-8 w-8 text-white" />}
        className="p-6"
      >

        {/* Profile Picture Section */}
        <ProfileSection
          title="Profile Picture"
          subtitle="Upload and manage your profile picture"
        >
          <ProfileCard>
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
                  ) : profileData?.profilePicturePath ? (
                    <Image
                      src={`${getImagePath(profileData.profilePicturePath)}?t=${profilePictureTimestamp}`}
                      alt="Profile Picture"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load profile picture:', e.currentTarget.src);
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.src.includes('?t=')) {
                          img.src = getImagePath(profileData.profilePicturePath);
                        } else {
                          img.style.display = 'none';
                          img.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          if (img.parentElement) {
                            img.parentElement.innerHTML = '<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                          }
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
                  onClick={() => profilePictureInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-[var(--primary-green)] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-[var(--primary-green-hover)] transition-colors"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-4">
                <input
                  type="file"
                  ref={profilePictureInputRef}
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  accept="image/*"
                />

                <div className="space-y-3">
                  <ProfileButton
                    variant="secondary"
                    onClick={triggerProfilePictureInput}
                    icon={<ArrowUpTrayIcon className="h-5 w-5" />}
                  >
                    Choose New Picture
                  </ProfileButton>

                  {profilePicture && (
                    <ProfileButton
                      variant="primary"
                      onClick={handleProfilePictureUpload}
                      loading={uploadingProfilePicture}
                      icon={<CheckCircleIcon className="h-5 w-5" />}
                      className="ml-3"
                    >
                      {uploadingProfilePicture ? 'Uploading...' : 'Upload Picture'}
                    </ProfileButton>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                    Upload a profile picture (JPEG, PNG, GIF, or WebP, max 5MB)
                  </p>
                </div>
              </div>
            </div>
          </ProfileCard>
        </ProfileSection>

        {initialLoading ? (
          <div className="space-y-8">
            <ProfileCard title="Account Information">
              <SkeletonCard contentLines={3} withHeader={false} />
            </ProfileCard>
            <ProfileCard title="Contact Information">
              <SkeletonCard contentLines={6} withHeader={false} />
            </ProfileCard>
            <ProfileCard title="Business Information">
              <SkeletonCard contentLines={4} withHeader={false} />
            </ProfileCard>
            <ProfileCard title="Security Settings">
              <SkeletonCard contentLines={4} withHeader={false} />
            </ProfileCard>
          </div>
        ) : error ? (
          <ProfileCard>
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <ExclamationTriangleIcon className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <ProfileButton
                variant="primary"
                onClick={() => window.location.reload()}
              >
                Try Again
              </ProfileButton>
            </div>
          </ProfileCard>
        ) : (
          <>
            {/* Document Upload Reminder */}
            {profileData && profileData.documents &&
              (!profileData.documents.businessPermitPath &&
               !profileData.documents.birCertificatePath &&
               !profileData.documents.governmentIdPath) && (
              <ProfileAlert
                type="warning"
                message="Your business documents are missing. Please upload your business documents to complete your registration."
                className="mb-6"
              />
            )}

          {/* Account Information Section */}
          <ProfileSection
            title="Account Information"
            subtitle="Read-only information for reference"
          >
            <ProfileCard>
              <ProfileGrid cols={3}>
                <ProfileField
                  label="Business Name"
                  value={profileData?.business_name || profileData?.name || 'Not available'}
                  icon={<BuildingStorefrontIcon className="h-5 w-5" />}
                />
                <ProfileField
                  label="Email Address"
                  value={profileData?.email || 'Not available'}
                  icon={<EnvelopeIcon className="h-5 w-5" />}
                />
                <ProfileField
                  label="Phone Number"
                  value={profileData?.business_phone || profileData?.phone || 'Not available'}
                  icon={<PhoneIcon className="h-5 w-5" />}
                />
              </ProfileGrid>
            </ProfileCard>
          </ProfileSection>

          {/* Business Information Section */}
          <ProfileSection
            title="Business Information"
            subtitle="Update your business details and information"
          >
            <ProfileCard>
              <form onSubmit={handleBusinessUpdate} className="space-y-6">
                {businessSuccess && (
                  <ProfileAlert
                    type="success"
                    message={businessSuccess}
                    onClose={() => setBusinessSuccess('')}
                  />
                )}

                <ProfileFormGroup
                  title="Basic Information"
                  subtitle="Essential business details"
                >
                  <ProfileInput
                    label="Business Name"
                    value={businessInfo.businessName}
                    onChange={(value) => setBusinessInfo({...businessInfo, businessName: value})}
                    placeholder="Enter your business name"
                    required
                    icon={<BuildingStorefrontIcon className="h-5 w-5" />}
                  />

                  <ProfileTextarea
                    label="Business Description"
                    value={businessInfo.description}
                    onChange={(value) => setBusinessInfo({...businessInfo, description: value})}
                    placeholder="Describe your cremation services, specialties, and what makes your business unique..."
                    rows={4}
                  />

                  <ProfileInput
                    label="Business Hours"
                    value={businessInfo.hours}
                    onChange={(value) => setBusinessInfo({...businessInfo, hours: value})}
                    placeholder="e.g., Monday-Friday: 9AM-6PM, Saturday: 9AM-3PM"
                  />
                </ProfileFormGroup>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <ProfileButton
                    type="submit"
                    variant="primary"
                    icon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    Update Business Information
                  </ProfileButton>
                </div>
              </form>
            </ProfileCard>
          </ProfileSection>

          {/* Contact Information Section */}
          <ProfileSection
            title="Contact Information"
            subtitle="Update your personal contact details"
          >
            <ProfileCard>
              <form onSubmit={handleContactUpdate} className="space-y-6">
                {contactSuccess && (
                  <ProfileAlert
                    type="success"
                    message={contactSuccess}
                    onClose={() => setContactSuccess('')}
                  />
                )}

                <ProfileFormGroup
                  title="Personal Details"
                  subtitle="Your name and contact information"
                >
                  <ProfileGrid cols={2}>
                    <ProfileInput
                      label="First Name"
                      value={contactInfo.firstName}
                      onChange={(value) => setContactInfo({...contactInfo, firstName: value})}
                      required
                      icon={<UserIcon className="h-5 w-5" />}
                    />
                    <ProfileInput
                      label="Last Name"
                      value={contactInfo.lastName}
                      onChange={(value) => setContactInfo({...contactInfo, lastName: value})}
                      required
                      icon={<UserIcon className="h-5 w-5" />}
                    />
                  </ProfileGrid>

                  <ProfileInput
                    label="Email Address"
                    type="email"
                    value={contactInfo.email}
                    onChange={(value) => setContactInfo({...contactInfo, email: value})}
                    required
                    icon={<EnvelopeIcon className="h-5 w-5" />}
                  />

                  <div>
                    <PhilippinePhoneInput
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      value={contactInfo.phone}
                      onChange={(value) => setContactInfo({...contactInfo, phone: value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>
                </ProfileFormGroup>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <ProfileButton
                    type="submit"
                    variant="primary"
                    icon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    Update Contact Information
                  </ProfileButton>
                </div>
              </form>
            </ProfileCard>
          </ProfileSection>

          {/* Document Upload Section */}
          <ProfileSection
            title="Business Documents"
            subtitle="Upload your business verification documents"
          >
            <ProfileCard>
              {/* Document Upload Alert */}
              {uploadError && (
                <ProfileAlert
                  type="error"
                  message={uploadError}
                  onClose={() => setUploadError('')}
                  className="mb-6"
                />
              )}

              {/* Current Documents Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Business Permit */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-[var(--primary-green)]" />
                    Business Permit
                  </h4>
                  {profileData?.documents?.businessPermitPath ? (
                    <div className="relative">
                      <div
                        className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50"
                        onClick={() => openPreviewModal(profileData.documents.businessPermitPath, 'Business Permit')}
                      >
                        <div className="text-center">
                          <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Document Uploaded</p>
                          <p className="text-xs text-gray-500">Click to view</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRefs.businessPermit}
                        onChange={(e) => handleFileChange(e, 'businessPermit')}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <div
                        className="w-full h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        onClick={() => triggerFileInput(fileInputRefs.businessPermit)}
                      >
                        <div className="text-center">
                          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Upload Business Permit</p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      </div>
                      {documents.businessPermit.preview && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm text-green-700">File selected</span>
                          <button
                            onClick={() => handleRemoveFile('businessPermit')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* BIR Certificate */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <DocumentIcon className="h-5 w-5 mr-2 text-[var(--primary-green)]" />
                    BIR Certificate
                  </h4>
                  {profileData?.documents?.birCertificatePath ? (
                    <div className="relative">
                      <div
                        className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50"
                        onClick={() => openPreviewModal(profileData.documents.birCertificatePath, 'BIR Certificate')}
                      >
                        <div className="text-center">
                          <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Document Uploaded</p>
                          <p className="text-xs text-gray-500">Click to view</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRefs.birCertificate}
                        onChange={(e) => handleFileChange(e, 'birCertificate')}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <div
                        className="w-full h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        onClick={() => triggerFileInput(fileInputRefs.birCertificate)}
                      >
                        <div className="text-center">
                          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Upload BIR Certificate</p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      </div>
                      {documents.birCertificate.preview && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm text-green-700">File selected</span>
                          <button
                            onClick={() => handleRemoveFile('birCertificate')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Government ID */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-[var(--primary-green)]" />
                    Government ID
                  </h4>
                  {profileData?.documents?.governmentIdPath ? (
                    <div className="relative">
                      <div
                        className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50"
                        onClick={() => openPreviewModal(profileData.documents.governmentIdPath, 'Government ID')}
                      >
                        <div className="text-center">
                          <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Document Uploaded</p>
                          <p className="text-xs text-gray-500">Click to view</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRefs.governmentId}
                        onChange={(e) => handleFileChange(e, 'governmentId')}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <div
                        className="w-full h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        onClick={() => triggerFileInput(fileInputRefs.governmentId)}
                      >
                        <div className="text-center">
                          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Upload Government ID</p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      </div>
                      {documents.governmentId.preview && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm text-green-700">File selected</span>
                          <button
                            onClick={() => handleRemoveFile('governmentId')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              {(documents.businessPermit.file || documents.birCertificate.file || documents.governmentId.file) && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <ProfileButton
                    variant="primary"
                    onClick={handleDocumentsUpload}
                    loading={uploading}
                    icon={<ArrowUpTrayIcon className="h-5 w-5" />}
                  >
                    {uploading ? 'Uploading...' : 'Upload Documents'}
                  </ProfileButton>
                </div>
              )}
            </ProfileCard>
          </ProfileSection>
          </>
        )}

        {/* Document Preview Modal */}
        {showPreviewModal && previewImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">{previewImage.title}</h3>
                <button
                  onClick={closePreviewModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4">
                <Image
                  src={previewImage.url}
                  alt={previewImage.title}
                  width={800}
                  height={600}
                  className="max-w-full h-auto"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        )}
      </ProfileLayout>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationProfilePage);