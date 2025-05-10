'use client';

import { useState } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
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

export default function CremationProfilePage() {
  const [userName] = useState('Happy Paws Cremation');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [address, setAddress] = useState({
    street: '123 Pet Memorial Drive',
    city: 'Balanga',
    state: 'Bataan',
    zipCode: '2100',
    country: 'Philippines'
  });
  const [addressSuccess, setAddressSuccess] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
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

    // Password change logic would go here (API call to change password)
    // For now, just simulate success
    setPasswordSuccess('Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAddressUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Address update logic would go here (API call to update address)
    // For now, just simulate success
    setAddressSuccess('Address updated successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setAddressSuccess('');
    }, 3000);
  };

  return (
    <CremationDashboardLayout activePage="profile" userName={userName}>
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

      {/* Content Grid */}
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
                <p className="text-base font-semibold text-gray-900">{userName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                </div>
                <p className="text-base font-semibold text-gray-900">info@happypawscremation.com</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <PhoneIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                </div>
                <p className="text-base font-semibold text-gray-900">(555) 123-4567</p>
              </div>
            </div>
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
    </CremationDashboardLayout>
  );
} 