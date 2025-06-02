'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  KeyIcon,
  HomeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  DocumentIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getAuthToken, isBusiness } from '@/utils/auth';
import { LoadingSpinner } from '@/app/admin/services/client';
import { getImagePath } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import Image from 'next/image';

function CremationProfilePage({ userData }: { userData: any }) {
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Address states
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [addressSuccess, setAddressSuccess] = useState('');

  // Contact info states
  const [contactInfo, setContactInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [contactSuccess, setContactSuccess] = useState('');

  // Profile data state
  const [profileData, setProfileData] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true); // Only for initial page load
  const [error, setError] = useState<string | null>(null);

  // Document upload states
  const [showDocumentModal, setShowDocumentModal] = useState(false);
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
      // Check authentication before making the API call
      const authToken = getAuthToken();
      if (!authToken || !isBusiness()) {
        // Create a dummy profile with the correct data structure
        const dummyProfile = {
          id: 4,
          name: 'Rainbow Paws Cremation Center',
          email: 'justinmarlosibonga@gmail.com',
          phone: '09123456789',
          contactPerson: 'Justin Sibonga',
          address: {
            street: 'Samal Bataan',
            city: 'Samal',
            state: 'Bataan',
            zipCode: '2113',
            country: 'Philippines'
          },
          description: 'Professional pet cremation services with care and respect.',
          website: '8:00 AM - 5:00 PM, Monday to Saturday',
          logoPath: null,
          profilePicturePath: null,
          verified: true,
          createdAt: '2025-05-23T02:43:36.000Z',
          documents: {
            businessPermitPath: '/uploads/documents/business_permit.jpg',
            birCertificatePath: '/uploads/documents/bir_certificate.jpg',
            governmentIdPath: '/uploads/documents/government_id.jpg'
          }
        };

        setProfileData(dummyProfile);

        // Update form states with dummy data
        setAddress({
          street: dummyProfile.address.street || '',
          city: dummyProfile.address.city || '',
          state: dummyProfile.address.state || '',
          zipCode: dummyProfile.address.zipCode || '',
          country: dummyProfile.address.country || 'Philippines'
        });

        // Set contact info from dummy profile data
        const nameParts = dummyProfile.contactPerson.split(' ');
        setContactInfo({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: dummyProfile.email || '',
          phone: dummyProfile.phone || ''
        });

        setInitialLoading(false);
        return;
      }

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
      } catch (jsonError) {
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

      setProfileData(data.profile);

      // Update form states with fetched data
      if (data.profile) {
        setAddress({
          street: data.profile.address.street || '',
          city: data.profile.address.city || '',
          state: data.profile.address.state || '',
          zipCode: data.profile.address.zipCode || '',
          country: data.profile.address.country || 'Philippines'
        });

        // Set contact info from profile data
        const nameParts = data.profile.contactPerson.split(' ');
        setContactInfo({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: data.profile.email || '',
          phone: data.profile.phone || ''
        });
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
      // Show toast only once
      showToast(error instanceof Error ? error.message : 'Failed to load profile data. Please try again.', 'error');

      // If authentication error, redirect to login after a short delay
      if (error instanceof Error &&
          (error.message.includes('Authentication failed') ||
            error.message.includes('not authorized'))) {
        setTimeout(() => {
          window.location.href = '/api/auth/logout';
        }, 3000);
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

  const handlePasswordChange = async (e: React.FormEvent) => {
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

  const handleAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Simulate a successful address update
      setTimeout(() => {
        // Update the profile data with the new address
        if (profileData) {
          const updatedProfile = {
            ...profileData,
            address: {
              street: address.street,
              city: address.city,
              state: address.state,
              zipCode: address.zipCode,
              country: address.country
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
      }, 500);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update address', 'error');
    }
  };

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Simulate a successful contact update
      setTimeout(() => {
        // Update the profile data with the new contact info
        if (profileData) {
          const updatedProfile = {
            ...profileData,
            email: contactInfo.email,
            phone: contactInfo.phone,
            contactPerson: `${contactInfo.firstName} ${contactInfo.lastName}`
          };

          setProfileData(updatedProfile);
        }

        setContactSuccess('Contact information updated successfully');
        showToast('Contact information updated successfully', 'success');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setContactSuccess('');
        }, 3000);
      }, 500);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update contact information', 'error');
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
      const reader = new FileReader();

      reader.onload = (event) => {
        setDocuments(prev => ({
          ...prev,
          [type]: {
            file,
            preview: event.target?.result as string
          }
        }));
      };

      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
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
      // Get the actual user ID from auth token
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const [userId] = authToken.split('_');

      const formData = new FormData();
      formData.append('profilePicture', profilePicture);
      formData.append('userId', userId);

      const response = await fetch('/api/cremation/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const data = await response.json();

      // Update profile data with new profile picture path
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          profilePicturePath: data.profilePicturePath
        };
        setProfileData(updatedProfile);
      }

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

  const handleDocumentsUpload = async () => {
    // Use the correct user ID from the database
    const userId = 3; // This matches the user_id in your database

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
      formData.append('userId', userId.toString());

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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload documents');
      }

      const data = await response.json();

      showToast('Documents uploaded successfully!', 'success');
      hideDocumentsModal();

      // Update the profile data with the new document paths from the API response
      if (profileData) {
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
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center">
          <div className="bg-[var(--primary-green)] rounded-full p-3 mr-4">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>
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
              ) : profileData?.profilePicturePath ? (
                <Image
                  src={getImagePath(profileData.profilePicturePath)}
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
              ref={profilePictureInputRef}
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
                    disabled={uploadingProfilePicture}
                    className="px-4 py-2 bg-[var(--primary-green)] hover:bg-[var(--primary-green-dark)] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingProfilePicture ? (
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
                      if (profilePictureInputRef.current) {
                        profilePictureInputRef.current.value = '';
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

      {initialLoading ? (
        <LoadingSpinner className="h-64" />
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Profile</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-opacity-90"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Upload Reminder */}
          {profileData &&
            (!profileData.documents.businessPermitPath &&
             !profileData.documents.birCertificatePath &&
             !profileData.documents.governmentIdPath) && (
            <div className="lg:col-span-3 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Your business documents are missing
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please upload your business documents to complete your registration.
                    Your account will be verified by our admin team after you submit your documents.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={showDocumentsModal}
                      className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1.5 rounded-md text-sm font-medium"
                    >
                      Upload Documents Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    <h3 className="text-sm font-medium text-gray-500">Business Name</h3>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{profileData?.name || 'Not available'}</p>
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
                    <PhoneIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{profileData?.phone || 'Not available'}</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={contactInfo.firstName}
                      onChange={(e) => setContactInfo({...contactInfo, firstName: e.target.value})}
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
                      value={contactInfo.lastName}
                      onChange={(e) => setContactInfo({...contactInfo, lastName: e.target.value})}
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

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300"
                  >
                    Update Contact Information
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
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Update Address Panel */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <BuildingStorefrontIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-800">Business Address</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddressUpdate} className="space-y-4 max-w-xl">
                {addressSuccess && (
                  <div className="bg-green-50 text-green-800 p-3 rounded-lg flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                    <p className="text-sm">{addressSuccess}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={address.street}
                    onChange={(e) => setAddress({...address, street: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress({...address, city: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={address.state}
                      onChange={(e) => setAddress({...address, state: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP / Postal Code
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      value={address.zipCode}
                      onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      value={address.country}
                      onChange={(e) => setAddress({...address, country: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300"
                  >
                    Update Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Documents Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="bg-[var(--primary-green)] rounded-full p-2.5 mr-4">
            <DocumentIcon className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Business Documents</h2>
        </div>

        <div className="flex items-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Your business documents help us verify your cremation service. You can update these documents at any time.
            After updating, they will be reviewed by our admin team.
          </p>
        </div>

        {profileData && profileData.documents && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Business Permit Document */}
            <div className="border-2 rounded-lg p-4 border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Business Permit</h3>
              <div className="relative mb-3">
                {profileData.documents.businessPermitPath ? (
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                      <Image
                        src={getImagePath(profileData.documents.businessPermitPath)}
                        alt="Business Permit"
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.error('Failed to load Business Permit:', e.currentTarget.src);
                          // If image fails to load, try with the API route directly
                          const src = e.currentTarget.src;
                          if (!src.includes('/api/image/')) {
                            // Extract filename from path
                            const filename = src.split('/').pop();
                            e.currentTarget.src = `/api/image/documents/3/${filename}`;

                            // Add a second error handler for the updated URL
                            e.currentTarget.onerror = () => {
                              // If it still fails, show document icon
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center');

                              // Show fallback document icon
                              const fallback = document.createElement('div');
                              fallback.innerHTML = `
                                <svg class="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span class="text-sm text-gray-500 mt-2">Document File</span>
                              `;
                              e.currentTarget.parentElement?.appendChild(fallback);
                            };
                          } else {
                            // Not a relative path, show document icon
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center');

                            // Show fallback document icon
                            const fallback = document.createElement('div');
                            fallback.innerHTML = `
                              <svg class="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span class="text-sm text-gray-500 mt-2">Document File</span>
                            `;
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }
                        }}
                      />

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  </div>
                )}
              </div>
              <a
                href={profileData.documents.businessPermitPath ? getImagePath(profileData.documents.businessPermitPath) : '#'}
                className={`w-full py-2 px-4 rounded-md text-center text-sm ${
                  profileData.documents.businessPermitPath
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!profileData.documents.businessPermitPath) {
                    e.preventDefault();
                  }
                }}
              >
                {profileData.documents.businessPermitPath ? 'View Document' : 'No Document'}
              </a>
            </div>

            {/* BIR Certificate */}
            <div className="border-2 rounded-lg p-4 border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">BIR Certificate</h3>
              <div className="relative mb-3">
                {profileData.documents.birCertificatePath ? (
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                      <Image
                        src={getImagePath(profileData.documents.birCertificatePath)}
                        alt="BIR Certificate"
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.error('Failed to load BIR Certificate:', e.currentTarget.src);
                          // If image fails to load, try with the API route directly
                          const src = e.currentTarget.src;
                          if (!src.includes('/api/image/')) {
                            // Extract filename from path
                            const filename = src.split('/').pop();
                            e.currentTarget.src = `/api/image/documents/3/${filename}`;

                            // Add a second error handler for the updated URL
                            e.currentTarget.onerror = () => {
                              // If it still fails, show document icon
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center');

                              // Show fallback document icon
                              const fallback = document.createElement('div');
                              fallback.innerHTML = `
                                <svg class="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span class="text-sm text-gray-500 mt-2">Document File</span>
                              `;
                              e.currentTarget.parentElement?.appendChild(fallback);
                            };
                          } else {
                            // Not a relative path, show document icon
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center');

                            // Show fallback document icon
                            const fallback = document.createElement('div');
                            fallback.innerHTML = `
                              <svg class="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span class="text-sm text-gray-500 mt-2">Document File</span>
                            `;
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }
                        }}
                      />

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  </div>
                )}
              </div>
              <a
                href={profileData.documents.birCertificatePath ? getImagePath(profileData.documents.birCertificatePath) : '#'}
                className={`w-full py-2 px-4 rounded-md text-center text-sm ${
                  profileData.documents.birCertificatePath
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!profileData.documents.birCertificatePath) {
                    e.preventDefault();
                  }
                }}
              >
                {profileData.documents.birCertificatePath ? 'View Document' : 'No Document'}
              </a>
            </div>

            {/* Government ID */}
            <div className="border-2 rounded-lg p-4 border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Government ID</h3>
              <div className="relative mb-3">
                {profileData.documents.governmentIdPath ? (
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                      <Image
                        src={getImagePath(profileData.documents.governmentIdPath)}
                        alt="Government ID"
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.error('Failed to load Government ID:', e.currentTarget.src);
                          // If image fails to load, try with the API route directly
                          const src = e.currentTarget.src;
                          if (!src.includes('/api/image/')) {
                            // Extract filename from path
                            const filename = src.split('/').pop();
                            e.currentTarget.src = `/api/image/documents/3/${filename}`;

                            // Add a second error handler for the updated URL
                            e.currentTarget.onerror = () => {
                              // If it still fails, show document icon
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center');

                              // Show fallback document icon
                              const fallback = document.createElement('div');
                              fallback.innerHTML = `
                                <svg class="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span class="text-sm text-gray-500 mt-2">Document File</span>
                              `;
                              e.currentTarget.parentElement?.appendChild(fallback);
                            };
                          } else {
                            // Not a relative path, show document icon
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center');

                            // Show fallback document icon
                            const fallback = document.createElement('div');
                            fallback.innerHTML = `
                              <svg class="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span class="text-sm text-gray-500 mt-2">Document File</span>
                            `;
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }
                        }}
                      />

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  </div>
                )}
              </div>
              <a
                href={profileData.documents.governmentIdPath ? getImagePath(profileData.documents.governmentIdPath) : '#'}
                className={`w-full py-2 px-4 rounded-md text-center text-sm ${
                  profileData.documents.governmentIdPath
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!profileData.documents.governmentIdPath) {
                    e.preventDefault();
                  }
                }}
              >
                {profileData.documents.governmentIdPath ? 'View Document' : 'No Document'}
              </a>
            </div>
          </div>
        )}

        {/* Upload/Update Button */}
        <div className="mt-6">
          <button
            onClick={() => showDocumentsModal()}
            className="bg-[var(--primary-green)] hover:bg-[var(--primary-green-dark)] text-white py-2 px-4 rounded-md transition-colors"
          >
            Update Business Documents
          </button>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Upload Business Documents</h2>
                <button
                  onClick={hideDocumentsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  These documents will be reviewed by our admin team to verify your business.
                  Please upload clear, readable images or PDFs of your documents.
                </p>
              </div>

              {uploadError && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Business Permit Upload */}
                <div className="border-2 rounded-lg p-4 border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-2">Business Permit</h3>

                  <input
                    type="file"
                    ref={fileInputRefs.businessPermit}
                    onChange={(e) => handleFileChange(e, 'businessPermit')}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />

                  {documents.businessPermit.preview ? (
                    <div className="relative mb-3">
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                        {documents.businessPermit.preview.startsWith('data:image') ? (
                          <Image src={documents.businessPermit.preview} alt="Preview" fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <DocumentIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFile('businessPermit')}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => triggerFileInput(fileInputRefs.businessPermit)}
                      className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer mb-3 hover:bg-gray-50 transition-colors"
                    >
                      <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG</p>
                    </div>
                  )}
                </div>

                {/* BIR Certificate Upload */}
                <div className="border-2 rounded-lg p-4 border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-2">BIR Certificate</h3>

                  <input
                    type="file"
                    ref={fileInputRefs.birCertificate}
                    onChange={(e) => handleFileChange(e, 'birCertificate')}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />

                  {documents.birCertificate.preview ? (
                    <div className="relative mb-3">
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                        {documents.birCertificate.preview.startsWith('data:image') ? (
                          <Image src={documents.birCertificate.preview} alt="Preview" fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <DocumentIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFile('birCertificate')}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => triggerFileInput(fileInputRefs.birCertificate)}
                      className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer mb-3 hover:bg-gray-50 transition-colors"
                    >
                      <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG</p>
                    </div>
                  )}
                </div>

                {/* Government ID Upload */}
                <div className="border-2 rounded-lg p-4 border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-2">Government ID</h3>

                  <input
                    type="file"
                    ref={fileInputRefs.governmentId}
                    onChange={(e) => handleFileChange(e, 'governmentId')}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />

                  {documents.governmentId.preview ? (
                    <div className="relative mb-3">
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                        {documents.governmentId.preview.startsWith('data:image') ? (
                          <Image src={documents.governmentId.preview} alt="Preview" fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <DocumentIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFile('governmentId')}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => triggerFileInput(fileInputRefs.governmentId)}
                      className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer mb-3 hover:bg-gray-50 transition-colors"
                    >
                      <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={hideDocumentsModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentsUpload}
                  className="px-4 py-2 bg-[var(--primary-green)] hover:bg-[var(--primary-green-dark)] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : 'Upload Documents'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationProfilePage);