'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from 'react';
import Image from 'next/image';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import { validatePasswordStrength } from '@/utils/passwordValidation';
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
  XMarkIcon,
  DocumentTextIcon,
  EyeIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { getImagePath } from '@/utils/imageUtils';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';

// Error Modal Component
interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-700">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};
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
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Contact info states
  const [contactInfo, setContactInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [, startContactTransition] = useTransition();
  const [contactSuccess, setContactSuccess] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Business info states
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    description: '',
    hours: ''
  });
  const [, startBusinessTransition] = useTransition();
  const [businessSuccess, setBusinessSuccess] = useState('');

  // Profile data state
  const [profileData, setProfileData] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadErrorModal, setShowUploadErrorModal] = useState(false);
  const [showPasswordErrorModal, setShowPasswordErrorModal] = useState(false);
  const [documents, setDocuments] = useState({
    businessPermit: { file: null as File | null, preview: null as string | null },
    birCertificate: { file: null as File | null, preview: null as string | null },
    governmentId: { file: null as File | null, preview: null as string | null }
  });

  // Document preview modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const fileInputRefs = {
    businessPermit: useRef<HTMLInputElement>(null),
    birCertificate: useRef<HTMLInputElement>(null),
    governmentId: useRef<HTMLInputElement>(null),
  };

  const { showToast } = useToast();
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const showToastRef = useRef(showToast);

  // Helper functions for error modals
  const showUploadError = (message: string) => {
    setUploadError(message);
    setShowUploadErrorModal(true);
  };

  const showPasswordError = (message: string) => {
    setPasswordError(message);
    setShowPasswordErrorModal(true);
  };

  const closeUploadErrorModal = () => {
    setShowUploadErrorModal(false);
    setUploadError('');
  };

  const closePasswordErrorModal = () => {
    setShowPasswordErrorModal(false);
    setPasswordError('');
  };

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const fetchProfileData = useCallback(async (forceLoading = true) => {
    if (!isMountedRef.current) {
      return;
    }
    try {
      if (forceLoading) {
        setInitialLoading(true);
      }
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/cremation/profile`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=60', // Allow 1 minute caching
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Failed to parse server response');
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please try logging in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this resource.');
        } else {
          throw new Error(data.error || data.message || 'Failed to fetch profile data');
        }
      }

      const mappedProfile = {
        ...data.profile,
        profilePicturePath: data.profile.profile_picture || null,
        name: data.profile.business_name || `${data.profile.first_name} ${data.profile.last_name}`,
        contactPerson: `${data.profile.first_name} ${data.profile.last_name}`,
        address: {
          street: data.profile.business_address || data.profile.address || ''
        },
        documents: data.profile.documents || {
          businessPermitPath: null,
          birCertificatePath: null,
          governmentIdPath: null
        }
      };

      try {
        const cachedPicture = sessionStorage.getItem('business_profile_picture');
        if (cachedPicture) {
          mappedProfile.profilePicturePath = cachedPicture;
        }
      } catch {}

      setProfileData((prev: any) => {
        if (!prev || !prev.documents) return mappedProfile;
        const prevDocs = prev.documents || {};
        const fetchedDocs = (mappedProfile as any).documents || {};
        const mergedDocs = {
          businessPermitPath: fetchedDocs.businessPermitPath || prevDocs.businessPermitPath || null,
          birCertificatePath: fetchedDocs.birCertificatePath || prevDocs.birCertificatePath || null,
          governmentIdPath: fetchedDocs.governmentIdPath || prevDocs.governmentIdPath || null,
        };
        const mergedProfile = { ...mappedProfile, documents: mergedDocs } as any;
        try {
          sessionStorage.setItem('business_documents_cache', JSON.stringify(mergedDocs));
        } catch (error) {
          console.error('Failed to update documents cache:', error);
        }
        return mergedProfile;
      });

      // Update form states with fetched data
      if (data.profile) {
        setContactInfo({
          firstName: data.profile.first_name || '',
          lastName: data.profile.last_name || '',
          email: data.profile.email || '',
          phone: data.profile.business_phone || data.profile.phone || '',
          address: data.profile.business_address || data.profile.address || ''
        });
        setBusinessInfo({
          businessName: data.profile.business_name || '',
          description: data.profile.description || '',
          hours: data.profile.hours || ''
        });
      }
      setError(null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      console.error('Error fetching profile data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
      showToastRef.current(error instanceof Error ? error.message : 'Failed to load profile data. Please try again.', 'error');
    } finally {
      if (isMountedRef.current) {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setShowSkeleton(true);
      await fetchProfileData();
      setInitialLoading(false);
    };
    fetchData();
  }, [fetchProfileData]);

  useEffect(() => {
    let skeletonTimer: NodeJS.Timeout | null = null;
    if (!initialLoading && showSkeleton) {
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      showToast(passwordValidation.message, 'error');
      return;
    }

    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: {
            currentPassword,
            newPassword
          }
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        showPasswordError(data.error || 'Failed to update password');
      }
    } catch (error) {
      showPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess('');

    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactInfo }),
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok) {
        setContactSuccess('Contact information updated successfully!');
        await fetchProfileData(false);
        setTimeout(() => setContactSuccess(''), 3000);
      } else {
        showToast(data.error || 'Failed to update contact information', 'error');
      }
    } catch (error) {
      console.error('Error updating contact information:', error);
      showToast('Failed to update contact information. Please try again.', 'error');
    }
  };

    const handleGetLocation = async () => {
        setIsGettingLocation(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });
            const { latitude, longitude } = position.coords;

            // Simple reverse geocoding for demonstration
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (!response.ok) throw new Error('Failed to fetch address');
            
            const data = await response.json();
            if (data && data.display_name) {
                setContactInfo(prev => ({ ...prev, address: data.display_name }));
                showToast('Location detected successfully!', 'success');
            } else {
                throw new Error('Could not determine address');
            }
        } catch (error: any) {
            let errorMessage = 'Failed to get your location.';
            if (error.code === 1) errorMessage = 'Location access denied.';
            if (error.code === 2) errorMessage = 'Location unavailable.';
            if (error.code === 3) errorMessage = 'Location request timed out.';
            showToast(errorMessage, 'error');
        } finally {
            setIsGettingLocation(false);
        }
    };
  
  const handleBusinessUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSuccess('');

    try {
      // Corrected payload: removed address as it's handled in contact info
      const response = await fetch('/api/cremation/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessInfo.businessName,
          description: businessInfo.description,
          hours: businessInfo.hours,
        }),
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok) {
        setBusinessSuccess('Business information updated successfully!');
        await fetchProfileData(false);
        setTimeout(() => setBusinessSuccess(''), 3000);
      } else {
        showToast(data.error || 'Failed to update business information', 'error');
      }
    } catch (error) {
      console.error('Error updating business information:', error);
      showToast('Failed to update business information. Please try again.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof documents) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp'
      ];
      if (!validTypes.includes(file.type)) {
        showToast('Please select a valid file (PDF, Word documents, or images)', 'error');
        return;
      }
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocuments(prev => ({
          ...prev,
          [type]: { file, preview: event.target?.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click();
  };

  const handleRemoveFile = (type: keyof typeof documents) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { file: null, preview: null }
    }));
  };

    const handleDocumentsUpload = async () => {
        if (!userData?.user_id) {
            setUploadError('User ID not available. Please try logging in again.');
            return;
        }
        const hasFiles = Object.values(documents).some(doc => doc.file !== null);
        if (!hasFiles) {
            setUploadError('Please select at least one document to upload');
            return;
        }
        setUploading(true);
        setUploadError('');

        // Upload via server: send files as multipart/form-data to our API.
        const appendIfPresent = (fd: FormData, key: string, value: File | null) => {
            if (value) fd.append(key, value);
        };

        try {
            const form = new FormData();
            appendIfPresent(form, 'businessPermit', documents.businessPermit.file);
            appendIfPresent(form, 'birCertificate', documents.birCertificate.file);
            appendIfPresent(form, 'governmentId', documents.governmentId.file);

            const response = await fetch('/api/businesses/upload-documents', {
                method: 'POST',
                body: form,
                credentials: 'include',
            });
            if (!response.ok) {
                let message = 'Failed to save document URLs';
                try {
                    const txt = await response.text();
                    try {
                        const j = JSON.parse(txt);
                        message = j.error || message;
                    } catch {
                        message = txt || message;
                    }
                } catch {}
                throw new Error(message);
            }
            const data = await response.json().catch(() => ({}));
            showToast('Documents uploaded successfully!', 'success');

            const newDocs = {
                businessPermitPath: (data?.filePaths?.business_permit_path as string) || null,
                birCertificatePath: (data?.filePaths?.bir_certificate_path as string) || null,
                governmentIdPath: (data?.filePaths?.government_id_path as string) || null,
            };
            setProfileData((prev: any) => ({
                ...(prev || {}),
                documents: {
                    ...(prev?.documents || {}),
                    ...newDocs,
                },
            }));

            await fetchProfileData(false);
            setDocuments({
                businessPermit: { file: null, preview: null },
                birCertificate: { file: null, preview: null },
                governmentId: { file: null, preview: null }
            });
        } catch (error) {
            showUploadError(error instanceof Error ? error.message : 'Failed to upload documents');
        } finally {
            setUploading(false);
        }
    };

    const getDocumentImageSource = (documentPath: string | null | undefined): string => {
        if (!documentPath) return '';
        if (documentPath.startsWith('data:')) return documentPath;
        // If it's already a full Blob URL, use it directly
        if (documentPath.startsWith('https://') && documentPath.includes('.public.blob.vercel-storage.com')) {
            return documentPath;
        }
        // Otherwise, use the existing image path logic
        return getImagePath(documentPath, false);
    };

    const getCurrentDocument = (type: 'businessPermit' | 'birCertificate' | 'governmentId'): string | null => {
        const preview = documents[type]?.preview;
        const saved = profileData?.documents ? (
            type === 'businessPermit' ? profileData.documents.businessPermitPath :
            type === 'birCertificate' ? profileData.documents.birCertificatePath :
            profileData.documents.governmentIdPath
        ) : null;
        return preview || saved || null;
    };
    
    const isPdfDocument = (source: string): boolean => {
        if (!source) return false;
        const lower = source.toLowerCase();
        return lower.endsWith('.pdf') || lower.startsWith('data:application/pdf');
    };

    const openPreviewModal = (imagePath: string, title: string) => {
        setPreviewImage({ url: getDocumentImageSource(imagePath), title });
        setShowPreviewModal(true);
    };

    const closePreviewModal = () => {
        setShowPreviewModal(false);
        setPreviewImage(null);
    };

    const profilePictureAdditionalData = useMemo(() => {
        return userData?.user_id ? { userId: userData.user_id.toString() } : undefined;
    }, [userData?.user_id]);

    const handleProfilePictureUploadSuccess = useCallback((profilePicturePath: string) => {
        setProfileData((prev: any) => ({
            ...(prev || {}),
            profilePicturePath
        }));
    }, []);

    // Load cached documents on initial mount to prevent UI flicker
    useEffect(() => {
      try {
        const cachedDocs = sessionStorage.getItem('business_documents_cache');
        if (cachedDocs) {
          const docs = JSON.parse(cachedDocs);
          setProfileData((prev: any) => ({
            ...(prev || {}),
            documents: {
              ...prev?.documents,
              ...docs
            }
          }));
        }
      } catch (error) {
        console.error("Failed to load documents from cache:", error);
      }
    }, []);

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
                        <div className="p-6">
                            <ProfilePictureUpload
                                currentImagePath={profileData?.profilePicturePath || (userData?.user_id ? `/api/image/profile/${userData.user_id}` : undefined)}
                                userType="business"
                                apiEndpoint="/api/cremation/upload-profile-picture"
                                additionalData={profilePictureAdditionalData}
                                size="lg"
                                onUploadSuccess={handleProfilePictureUploadSuccess}
                            />
                        </div>
                    </ProfileCard>
                </ProfileSection>

                {error ? (
                    <ProfileCard>
                        <div className="text-center py-8">
                            <div className="text-red-500 mb-4">
                                <ExclamationTriangleIcon className="h-16 w-16 mx-auto" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <ProfileButton variant="primary" onClick={() => window.location.reload()}>
                                Try Again
                            </ProfileButton>
                        </div>
                    </ProfileCard>
                ) : (
                    <>
                        {/* Account Information Section */}
                        <ProfileSection
                            title="Account Information"
                            subtitle="Read-only information for reference"
                            showSkeleton={showSkeleton || initialLoading}
                        >
                            <ProfileCard>
                                <ProfileGrid cols={3}>
                                    <ProfileField label="Business Name" value={profileData?.business_name || 'Not available'} icon={<BuildingStorefrontIcon className="h-5 w-5" />} />
                                    <ProfileField label="Email Address" value={profileData?.email || 'Not available'} icon={<EnvelopeIcon className="h-5 w-5" />} />
                                    <ProfileField label="Phone Number" value={profileData?.business_phone || profileData?.phone || 'Not available'} icon={<PhoneIcon className="h-5 w-5" />} />
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
                                    {businessSuccess && <ProfileAlert type="success" message={businessSuccess} onClose={() => setBusinessSuccess('')} />}
                                    <ProfileFormGroup title="Basic Information" subtitle="Essential business details">
                                        <ProfileInput label="Business Name" value={businessInfo.businessName} onChange={(value) => startBusinessTransition(() => setBusinessInfo(prev => ({ ...prev, businessName: value })))} placeholder="Enter your business name" required icon={<BuildingStorefrontIcon className="h-5 w-5" />} />
                                        <ProfileTextArea label="Business Description" value={businessInfo.description} onChange={(value) => startBusinessTransition(() => setBusinessInfo(prev => ({ ...prev, description: value })))} placeholder="Describe your cremation services..." rows={4} />
                                        <ProfileInput label="Business Hours" value={businessInfo.hours} onChange={(value) => startBusinessTransition(() => setBusinessInfo(prev => ({ ...prev, hours: value })))} placeholder="e.g., Monday-Friday: 9AM-6PM" />
                                    </ProfileFormGroup>
                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <ProfileButton type="submit" variant="primary" icon={<CheckCircleIcon className="h-5 w-5" />}>
                                            Update Business Information
                                        </ProfileButton>
                                    </div>
                                </form>
                            </ProfileCard>
                        </ProfileSection>

                        {/* Contact Information Section */}
                        <ProfileSection
                            title="Contact Information"
                            subtitle="Update your personal contact details and address"
                            showSkeleton={showSkeleton || initialLoading}
                        >
                            <ProfileCard>
                                <form onSubmit={handleContactUpdate} className="space-y-6">
                                    {contactSuccess && <ProfileAlert type="success" message={contactSuccess} onClose={() => setContactSuccess('')} />}
                                    <ProfileFormGroup title="Personal & Location Details" subtitle="Your name and primary business address">
                                        <ProfileGrid cols={2}>
                                            <ProfileInput label="First Name" value={contactInfo.firstName} onChange={(value) => startContactTransition(() => setContactInfo(prev => ({ ...prev, firstName: value })))} required icon={<UserIcon className="h-5 w-5" />} />
                                            <ProfileInput label="Last Name" value={contactInfo.lastName} onChange={(value) => startContactTransition(() => setContactInfo(prev => ({ ...prev, lastName: value })))} required icon={<UserIcon className="h-5 w-5" />} />
                                        </ProfileGrid>
                                        <ProfileInput label="Email Address" type="email" value={contactInfo.email} onChange={(value) => startContactTransition(() => setContactInfo(prev => ({ ...prev, email: value })))} required icon={<EnvelopeIcon className="h-5 w-5" />} />
                                        <PhilippinePhoneInput id="phone" name="phone" label="Phone Number" value={contactInfo.phone} onChange={(value) => startContactTransition(() => setContactInfo(prev => ({ ...prev, phone: value })))} />
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Address</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPinIcon className="h-5 w-5 text-gray-400" /></div>
                                                <input type="text" value={contactInfo.address} onChange={(e) => startContactTransition(() => setContactInfo(prev => ({ ...prev, address: e.target.value })))} placeholder="Enter your complete address" className="block w-full rounded-lg border border-gray-300 shadow-sm bg-white focus:border-[var(--primary-green)] focus:ring-[var(--primary-green)] focus:ring-1 pl-10 pr-32 py-2.5" />
                                                <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-[var(--primary-green)] hover:text-green-700 disabled:text-gray-400">
                                                    {isGettingLocation ? 'Detecting...' : 'Use My Location'}
                                                </button>
                                            </div>
                                        </div>
                                    </ProfileFormGroup>
                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <ProfileButton type="submit" variant="primary" icon={<CheckCircleIcon className="h-5 w-5" />}>
                                            Update Contact Information
                                        </ProfileButton>
                                    </div>
                                </form>
                            </ProfileCard>
                        </ProfileSection>

                        {/* Change Password Section -- ADDED */}
                        <ProfileSection
                          title="Change Password"
                          subtitle="Update your account password"
                          showSkeleton={showSkeleton || initialLoading}
                        >
                          <ProfileCard>
                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                {passwordSuccess && <ProfileAlert type="success" message={passwordSuccess} onClose={() => setPasswordSuccess('')} />}
                                
                                <ProfileFormGroup title="Security" subtitle="Choose a strong, new password">
                                  <ProfileInput label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} required icon={<KeyIcon className="h-5 w-5" />} />
                                  <ProfileInput label="New Password" type="password" value={newPassword} onChange={setNewPassword} required icon={<KeyIcon className="h-5 w-5" />} />
                                  <ProfileInput label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} required icon={<KeyIcon className="h-5 w-5" />} />
                                </ProfileFormGroup>
                                
                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                  <ProfileButton type="submit" variant="primary" icon={<CheckCircleIcon className="h-5 w-5" />}>
                                    Change Password
                                  </ProfileButton>
                                </div>
                            </form>
                          </ProfileCard>
                        </ProfileSection>

                        {/* Document Upload Section */}
                        <ProfileSection
                            title="Business Documents"
                            subtitle="Upload and manage your business verification documents"
                            showSkeleton={showSkeleton || initialLoading}
                        >
                            <ProfileCard>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {/* Business Permit */}
                                    <div className="space-y-3">
                                      <h4 className="font-medium text-gray-900 flex items-center">
                                        <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-[var(--primary-green)]" />
                                        Business Permit
                                      </h4>
                                      {getCurrentDocument('businessPermit') ? (
                                        <div className="relative group border-2 border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400" onClick={() => openPreviewModal(getCurrentDocument('businessPermit') as string, 'Business Permit')}>
                                          <div className="h-32 bg-gray-50 flex items-center justify-center">
                                            {isPdfDocument(getCurrentDocument('businessPermit') as string) ? <DocumentTextIcon className="h-10 w-10 text-red-500" /> : <Image src={getDocumentImageSource(getCurrentDocument('businessPermit'))} alt="Business Permit" layout="fill" objectFit="cover" />}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center"><EyeIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                          </div>
                                          <div className="p-3 border-t"><span className="text-xs text-green-600 font-medium">Uploaded</span></div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <input type="file" ref={fileInputRefs.businessPermit} onChange={(e) => handleFileChange(e, 'businessPermit')} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                                          <div className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => triggerFileInput(fileInputRefs.businessPermit)}>
                                            <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-1" />
                                            <p className="text-sm text-gray-600">Upload File</p>
                                          </div>
                                          {documents.businessPermit.preview && <div className="flex items-center justify-between p-2 bg-green-50 rounded"><span className="text-sm text-green-700">File selected</span><button onClick={() => handleRemoveFile('businessPermit')} className="text-red-500"><XMarkIcon className="h-4 w-4" /></button></div>}
                                        </div>
                                      )}
                                    </div>
                                    {/* BIR Certificate */}
                                    <div className="space-y-3">
                                      <h4 className="font-medium text-gray-900 flex items-center">
                                        <DocumentIcon className="h-5 w-5 mr-2 text-[var(--primary-green)]" />
                                        BIR Certificate
                                      </h4>
                                      {getCurrentDocument('birCertificate') ? (
                                         <div className="relative group border-2 border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400" onClick={() => openPreviewModal(getCurrentDocument('birCertificate') as string, 'BIR Certificate')}>
                                           <div className="h-32 bg-gray-50 flex items-center justify-center">
                                             {isPdfDocument(getCurrentDocument('birCertificate') as string) ? <DocumentTextIcon className="h-10 w-10 text-red-500" /> : <Image src={getDocumentImageSource(getCurrentDocument('birCertificate'))} alt="BIR Certificate" layout="fill" objectFit="cover" />}
                                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center"><EyeIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                           </div>
                                           <div className="p-3 border-t"><span className="text-xs text-green-600 font-medium">Uploaded</span></div>
                                         </div>
                                       ) : (
                                        <div className="space-y-2">
                                          <input type="file" ref={fileInputRefs.birCertificate} onChange={(e) => handleFileChange(e, 'birCertificate')} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                                          <div className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => triggerFileInput(fileInputRefs.birCertificate)}>
                                            <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-1" />
                                            <p className="text-sm text-gray-600">Upload File</p>
                                          </div>
                                          {documents.birCertificate.preview && <div className="flex items-center justify-between p-2 bg-green-50 rounded"><span className="text-sm text-green-700">File selected</span><button onClick={() => handleRemoveFile('birCertificate')} className="text-red-500"><XMarkIcon className="h-4 w-4" /></button></div>}
                                        </div>
                                       )}
                                    </div>
                                    {/* Government ID */}
                                    <div className="space-y-3">
                                      <h4 className="font-medium text-gray-900 flex items-center">
                                        <UserIcon className="h-5 w-5 mr-2 text-[var(--primary-green)]" />
                                        Government ID
                                      </h4>
                                      {getCurrentDocument('governmentId') ? (
                                         <div className="relative group border-2 border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400" onClick={() => openPreviewModal(getCurrentDocument('governmentId') as string, 'Government ID')}>
                                           <div className="h-32 bg-gray-50 flex items-center justify-center">
                                             {isPdfDocument(getCurrentDocument('governmentId') as string) ? <DocumentTextIcon className="h-10 w-10 text-red-500" /> : <Image src={getDocumentImageSource(getCurrentDocument('governmentId'))} alt="Government ID" layout="fill" objectFit="cover" />}
                                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center"><EyeIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                           </div>
                                           <div className="p-3 border-t"><span className="text-xs text-green-600 font-medium">Uploaded</span></div>
                                         </div>
                                       ) : (
                                        <div className="space-y-2">
                                          <input type="file" ref={fileInputRefs.governmentId} onChange={(e) => handleFileChange(e, 'governmentId')} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                                          <div className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => triggerFileInput(fileInputRefs.governmentId)}>
                                            <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-1" />
                                            <p className="text-sm text-gray-600">Upload File</p>
                                          </div>
                                          {documents.governmentId.preview && <div className="flex items-center justify-between p-2 bg-green-50 rounded"><span className="text-sm text-green-700">File selected</span><button onClick={() => handleRemoveFile('governmentId')} className="text-red-500"><XMarkIcon className="h-4 w-4" /></button></div>}
                                        </div>
                                       )}
                                    </div>
                                </div>
                                {(documents.businessPermit.file || documents.birCertificate.file || documents.governmentId.file) && (
                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <ProfileButton variant="primary" onClick={handleDocumentsUpload} loading={uploading} icon={<ArrowUpTrayIcon className="h-5 w-5" />}>
                                            {uploading ? 'Uploading...' : 'Upload Selected Documents'}
                                        </ProfileButton>
                                    </div>
                                )}
                            </ProfileCard>
                        </ProfileSection>
                    </>
                )}

                {/* Document Preview Modal */}
                {showPreviewModal && previewImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto relative">
                            <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b z-10">
                                <h3 className="text-lg font-semibold">{previewImage.title}</h3>
                                <button onClick={closePreviewModal} className="text-gray-500 hover:text-gray-800"><XMarkIcon className="h-6 w-6" /></button>
                            </div>
                            <div className="p-4">
                                <Image src={previewImage.url} alt={previewImage.title} width={800} height={600} style={{ objectFit: 'contain' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Modals */}
                {showPasswordErrorModal && (
                    <ErrorModal
                        isOpen={showPasswordErrorModal}
                        title="Password Update Error"
                        message={passwordError}
                        onClose={closePasswordErrorModal}
                    />
                )}

                {showUploadErrorModal && (
                    <ErrorModal
                        isOpen={showUploadErrorModal}
                        title="Document Upload Error"
                        message={uploadError}
                        onClose={closeUploadErrorModal}
                    />
                )}

            </ProfileLayout>
        </CremationDashboardLayout>
    );
}

export default withBusinessVerification(CremationProfilePage);