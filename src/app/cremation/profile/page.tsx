'use client';

import { useState, useEffect } from 'react';
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
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

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
  
  const { showToast } = useToast();

  // Fetch profile data
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        // Add cache-busting query parameter and no-cache headers
        const response = await fetch(`/api/cremation/profile?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        // Parse response data first
        const data = await response.json();
        
        // Check response status after parsing data
        if (!response.ok) {
          throw new Error(data.error || data.message || 'Failed to fetch profile data');
        }
        
        // Only update state if component is still mounted
        if (isMounted) {
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
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
          // Show toast only once
          showToast(error instanceof Error ? error.message : 'Failed to load profile data. Please try again.', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfileData();
    
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
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationProfilePage); 