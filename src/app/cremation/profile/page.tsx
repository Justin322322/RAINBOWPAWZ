'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [loading, setLoading] = useState(true);
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
  
  const fileInputRefs = {
    businessPermit: useRef<HTMLInputElement>(null),
    birCertificate: useRef<HTMLInputElement>(null),
    governmentId: useRef<HTMLInputElement>(null),
  };
  
  const { showToast } = useToast();

  // Define fetchProfileData function outside useEffect so it can be called elsewhere
  const fetchProfileData = async () => {
    try {
      // Check authentication before making the API call
      const authToken = getAuthToken();
      if (!authToken || !isBusiness()) {
        throw new Error('You are not authorized to access this page. Please log in as a business account.');
      }
      
      setLoading(true);
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
      setLoading(false);
    }
  };

  // Check for showDocuments query parameter on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showDocuments') === 'true') {
      showDocumentsModal();
      
      // Clear the URL parameter after showing the modal
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch profile data
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
  }, [showToast]);

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

    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include credentials with the request
        body: JSON.stringify({
          password: {
            currentPassword,
            newPassword
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  const handleAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include credentials with the request
        body: JSON.stringify({ address }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update address');
      }
      
      setAddressSuccess('Address updated successfully');
      showToast('Address updated successfully', 'success');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setAddressSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error updating address:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update address', 'error');
    }
  };

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/cremation/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include credentials with the request
        body: JSON.stringify({ contactInfo }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update contact information');
      }
      
      setContactSuccess('Contact information updated successfully');
      showToast('Contact information updated successfully', 'success');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setContactSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error updating contact info:', error);
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

  const handleDocumentsUpload = async () => {
    if (!userData?.id) {
      showToast('User information not found. Please log in again.', 'error');
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
      formData.append('userId', userData.id);
      
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
      
      const response = await fetch('/api/businesses/upload-documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload documents');
      }
      
      showToast('Documents uploaded successfully!', 'success');
      hideDocumentsModal();
      
      // Refresh profile data to show new documents
      fetchProfileData();
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload documents');
    } finally {
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
        </div>
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
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
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
                    {profileData.documents.businessPermitPath.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img 
                        src={profileData.documents.businessPermitPath} 
                        alt="Business Permit" 
                        className="object-cover w-full h-full" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <DocumentIcon className="h-12 w-12 text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Document File</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  </div>
                )}
              </div>
              <a 
                href={profileData.documents.businessPermitPath || '#'} 
                className={`w-full py-2 px-4 rounded-md text-center text-sm ${
                  profileData.documents.businessPermitPath 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => !profileData.documents.businessPermitPath && e.preventDefault()}
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
                    {profileData.documents.birCertificatePath.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img 
                        src={profileData.documents.birCertificatePath} 
                        alt="BIR Certificate" 
                        className="object-cover w-full h-full" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <DocumentIcon className="h-12 w-12 text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Document File</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  </div>
                )}
              </div>
              <a 
                href={profileData.documents.birCertificatePath || '#'} 
                className={`w-full py-2 px-4 rounded-md text-center text-sm ${
                  profileData.documents.birCertificatePath 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => !profileData.documents.birCertificatePath && e.preventDefault()}
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
                    {profileData.documents.governmentIdPath.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img 
                        src={profileData.documents.governmentIdPath} 
                        alt="Government ID" 
                        className="object-cover w-full h-full" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <DocumentIcon className="h-12 w-12 text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Document File</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  </div>
                )}
              </div>
              <a 
                href={profileData.documents.governmentIdPath || '#'} 
                className={`w-full py-2 px-4 rounded-md text-center text-sm ${
                  profileData.documents.governmentIdPath 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => !profileData.documents.governmentIdPath && e.preventDefault()}
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
                          <img src={documents.businessPermit.preview} alt="Preview" className="object-cover" />
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
                          <img src={documents.birCertificate.preview} alt="Preview" className="object-cover" />
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
                          <img src={documents.governmentId.preview} alt="Preview" className="object-cover" />
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