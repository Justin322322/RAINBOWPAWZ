'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  CheckCircleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getImagePath } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import Image from 'next/image';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';

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
  ProfileTextArea,
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
    phone: '',
    address: ''
  });
  const [contactSuccess, setContactSuccess] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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



  // Document preview modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Skeleton loading state with minimum delay
  // Skeleton loading state - starts false to prevent initial animation
  const [showSkeleton, setShowSkeleton] = useState(false);

  const fileInputRefs = {
    businessPermit: useRef<HTMLInputElement>(null),
    birCertificate: useRef<HTMLInputElement>(null),
    governmentId: useRef<HTMLInputElement>(null),
  };



  const { showToast } = useToast();

  // Ref to track if component is mounted and abort controller for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to store showToast function to avoid dependency issues
  const showToastRef = useRef(showToast);

  // Update showToast ref when it changes
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Define fetchProfileData function outside useEffect so it can be called elsewhere
  const fetchProfileData = useCallback(async (forceLoading = true) => {
    // Check if component is still mounted and user is authenticated
    if (!isMountedRef.current) {
      return;
    }

    // Check authentication state before making API call
    const hasSecureAuthToken = document.cookie.indexOf('secure_auth_token') !== -1;
    const hasLegacyAuthToken = document.cookie.indexOf('auth_token') !== -1;
    const hasSessionData = sessionStorage.getItem('business_verification_cache') ||
                          sessionStorage.getItem('user_data');

    // If no authentication tokens or session data, user has likely logged out
    if (!hasSecureAuthToken && !hasLegacyAuthToken && !hasSessionData) {
      console.log('No authentication found, skipping profile data fetch');
      return;
    }

    try {
      // For secure JWT authentication, always try to fetch from server
      // Don't rely on client-side authentication checks

      // Only set loading state if explicitly requested (for initial load)
      if (forceLoading) {
        setInitialLoading(true);
      }
      setError(null); // Clear any previous errors

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Add cache-busting query parameter and no-cache headers
      const response = await fetch(`/api/cremation/profile?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include', // Important: Include credentials with the request
        signal: abortControllerRef.current.signal // Add abort signal
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
          phone: data.profile.business_phone || data.profile.phone || '',
          address: data.profile.address || ''
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
      // Check if the request was aborted (component unmounted or new request started)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Profile data fetch was aborted');
        return;
      }

      // Check if component is still mounted before handling error
      if (!isMountedRef.current) {
        return;
      }

      console.error('Error fetching profile data:', error);

      // Enhanced logout scenario detection
      const hasSecureAuthToken = document.cookie.indexOf('secure_auth_token') !== -1;
      const hasLegacyAuthToken = document.cookie.indexOf('auth_token') !== -1;
      const hasSessionData = sessionStorage.getItem('business_verification_cache') ||
                            sessionStorage.getItem('user_data');
      const isNavigatingAway = window.location.pathname !== '/cremation/profile';

      // Consider it a logout scenario if:
      // 1. User is navigating away from the profile page, OR
      // 2. No authentication tokens AND no session data exist
      const isLogoutScenario = isNavigatingAway ||
                              (!hasSecureAuthToken && !hasLegacyAuthToken && !hasSessionData);

      if (!isLogoutScenario) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
        // Show toast only if not in logout scenario
        showToastRef.current(error instanceof Error ? error.message : 'Failed to load profile data. Please try again.', 'error');

        // If authentication error and not logging out, redirect to login after a short delay
        if (error instanceof Error &&
            (error.message.includes('Authentication failed') ||
              error.message.includes('not authorized') ||
              error.message.includes('Unauthorized'))) {
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } else {
        console.log('Logout scenario detected, suppressing error handling');
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setInitialLoading(false);
      }
    }
  }, []); // Remove showToast dependency to prevent unnecessary re-renders

  // Component cleanup effect
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;

      // Cancel any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load profile data and other initial data
  useEffect(() => {
    const fetchData = async () => {
      setInitialLoading(true);
      // Show skeleton immediately when starting to load
      setShowSkeleton(true);

      await fetchProfileData();
      setInitialLoading(false);
    };

    fetchData();
  }, [fetchProfileData]);

  // Skeleton loading control with minimum delay
  useEffect(() => {
    let skeletonTimer: NodeJS.Timeout | null = null;

    if (!initialLoading && showSkeleton) {
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
  }, [initialLoading, showSkeleton]);

  // Check for showDocuments query parameter on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showDocuments') === 'true') {
      showDocumentsModal();

      // Clear the URL parameter after showing the modal
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
    // In a production environment, you could integrate with other services like:
    // - Google Maps Geocoding API (if available)
    // - MapBox Geocoding API
    // - HERE Geocoding API

    // For now, return a formatted coordinate string with approximate location
    const approxLocation = `Approximate location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    // You could also add logic to determine approximate city/region based on coordinates
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

  // Handle location detection for address
  const handleGetLocation = async () => {
    setIsGettingLocation(true);

    try {
      // Get user's current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
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

  // Memoize profile picture upload props to prevent unnecessary re-renders
  const profilePictureAdditionalData = useMemo(() => {
    return userData?.user_id ? { userId: userData.user_id.toString() } : undefined;
  }, [userData?.user_id]);

  const handleProfilePictureUploadSuccess = useCallback((profilePicturePath: string) => {
    // Update local profile data state
    if (profileData) {
      setProfileData({
        ...profileData,
        profilePicturePath: profilePicturePath
      });
    }
  }, [profileData]);

  return (
    <CremationDashboardLayout activePage="profile" userData={userData} skipSkeleton={true}>
      <ProfileLayout
        title="My Profile"
        subtitle="Manage your account settings and business information"
        icon={<UserIcon className="h-8 w-8 text-white" />}
        className="p-6"
        showSkeleton={showSkeleton || initialLoading}
      >

        {/* Profile Picture Section */}
        <ProfileSection
          title="Profile Picture"
          subtitle="Upload and manage your profile picture"
          showSkeleton={showSkeleton || initialLoading}
        >
          <ProfileCard>
            {showSkeleton || initialLoading ? (
              /* Profile Picture Section Skeleton */
              <div className="p-6">
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
              </div>
            ) : (
              /* Actual Profile Picture Content */
              <div className="p-6">
                <ProfilePictureUpload
                  currentImagePath={profileData?.profilePicturePath}
                  userType="business"
                  apiEndpoint="/api/cremation/upload-profile-picture"
                  additionalData={profilePictureAdditionalData}
                  size="lg"
                  onUploadSuccess={handleProfilePictureUploadSuccess}
                />
              </div>
            )}
          </ProfileCard>
        </ProfileSection>

        {showSkeleton || initialLoading ? (
          <>
            {/* Account Information Section Skeleton - matches ProfileSection structure */}
            <ProfileSection
              title=""
              subtitle=""
              className="animate-pulse"
            >
              {/* Section Header Skeleton */}
              <div className="space-y-2 mb-6">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-72 animate-pulse"></div>
              </div>

              {/* ProfileCard Skeleton */}
              <ProfileCard>
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
              </ProfileCard>
            </ProfileSection>

            {/* Business Information Section Skeleton - matches ProfileSection structure */}
            <ProfileSection
              title=""
              subtitle=""
              className="animate-pulse"
            >
              {/* Section Header Skeleton */}
              <div className="space-y-2 mb-6">
                <div className="h-8 bg-gray-200 rounded w-52 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-80 animate-pulse"></div>
              </div>

              {/* ProfileCard Skeleton */}
              <ProfileCard>
                <div className="space-y-6">
                  {/* Form Group Header */}
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-36 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-52 animate-pulse"></div>
                  </div>

                  {/* Business Name Field */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>

                  {/* Business Description Field */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
                    <div className="h-24 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>

                  {/* Business Hours Field */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>

                  {/* Button area */}
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <div className="h-10 bg-gray-200 rounded w-56 animate-pulse"></div>
                  </div>
                </div>
              </ProfileCard>
            </ProfileSection>

            {/* Contact Information Section Skeleton - matches ProfileSection structure */}
            <ProfileSection
              title=""
              subtitle=""
              className="animate-pulse"
            >
              {/* Section Header Skeleton */}
              <div className="space-y-2 mb-6">
                <div className="h-8 bg-gray-200 rounded w-44 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-72 animate-pulse"></div>
              </div>

              {/* ProfileCard Skeleton */}
              <ProfileCard>
                <div className="space-y-6">
                  {/* Form Group Header */}
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-36 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
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
              </ProfileCard>
            </ProfileSection>

            {/* Business Address Section Skeleton - matches ProfileSection structure */}
            <ProfileSection
              title=""
              subtitle=""
              className="animate-pulse"
            >
              {/* Section Header Skeleton */}
              <div className="space-y-2 mb-6">
                <div className="h-8 bg-gray-200 rounded w-40 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-68 animate-pulse"></div>
              </div>

              {/* ProfileCard Skeleton */}
              <ProfileCard>
                <div className="space-y-6">
                  {/* Form Group Header */}
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-36 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
                  </div>

                  {/* Address Fields */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                          <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Button area */}
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                </div>
              </ProfileCard>
            </ProfileSection>

            {/* Business Documents Section Skeleton - matches ProfileSection structure */}
            <ProfileSection
              title=""
              subtitle=""
              className="animate-pulse"
            >
              {/* Section Header Skeleton */}
              <div className="space-y-2 mb-6">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-84 animate-pulse"></div>
              </div>

              {/* ProfileCard Skeleton */}
              <ProfileCard>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center space-y-4">
                      <div className="w-12 h-12 bg-gray-200 rounded mx-auto animate-pulse"></div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded w-32 mx-auto mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
                      </div>
                      <div className="h-9 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </ProfileCard>
            </ProfileSection>
          </>
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
            showSkeleton={showSkeleton || initialLoading}
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
            showSkeleton={showSkeleton || initialLoading}
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

                  <ProfileTextArea
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
            showSkeleton={showSkeleton || initialLoading}
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

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
      
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
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm
                          text-[var(--primary-green)] hover:text-green-700 disabled:text-gray-400
                          disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {isGettingLocation ? 'Detecting...' : 'Use My Location'}
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
            showSkeleton={showSkeleton || initialLoading}
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
