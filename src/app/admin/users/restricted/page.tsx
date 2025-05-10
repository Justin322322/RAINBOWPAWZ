'use client';

import { useState } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AdminRestrictedUsersPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Sample restricted users data
  const restrictedUsers = [
    {
      id: 'CC006',
      name: 'Divine Pets Memorial',
      type: 'cremation',
      owner: 'Angela Garcia',
      email: 'angela@divinepets.com',
      phone: '(555) 678-9012',
      address: 'Dinalupihan, Bataan, Philippines',
      registrationDate: 'July 18, 2023',
      restrictionDate: 'October 5, 2023',
      reason: 'Multiple customer complaints about service quality and pricing discrepancies',
      reportCount: 4,
      duration: 'Indefinite',
      verified: false
    },
    {
      id: 'FP006',
      name: 'James Thompson',
      type: 'furparent',
      email: 'james@example.com',
      phone: '(555) 678-9012',
      address: 'Limay, Bataan, Philippines',
      registrationDate: 'June 8, 2023',
      restrictionDate: 'September 15, 2023',
      reason: 'Attempted fraud - submitted false documents and payment information',
      reportCount: 2,
      duration: '6 months',
      verified: false
    },
    {
      id: 'CC008',
      name: 'Forever Pets Memorial Services',
      type: 'cremation',
      owner: 'Robert Chen',
      email: 'robert@foreverpets.com',
      phone: '(555) 234-5678',
      address: 'Hermosa, Bataan, Philippines',
      registrationDate: 'August 10, 2023',
      restrictionDate: 'November 22, 2023',
      reason: 'Unethical business practices and violation of service terms',
      reportCount: 3,
      duration: '3 months',
      verified: true
    },
    {
      id: 'FP012',
      name: 'Sophia Williams',
      type: 'furparent',
      email: 'sophia@example.com',
      phone: '(555) 987-6543',
      address: 'Pilar, Bataan, Philippines',
      registrationDate: 'April 3, 2023',
      restrictionDate: 'December 8, 2023',
      reason: 'Abusive behavior towards service providers',
      reportCount: 5,
      duration: '1 month',
      verified: true
    }
  ];

  // Filter restricted users based on search term and type filter
  const filteredUsers = restrictedUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.owner && user.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || user.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  // Get user type badge
  const getUserTypeBadge = (type: string) => {
    switch(type) {
      case 'cremation':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            Cremation Center
          </span>
        );
      case 'furparent':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 min-w-[90px] justify-center">
            Fur Parent
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {type}
          </span>
        );
    }
  };

  return (
    <AdminDashboardLayout activePage="restricted" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Restricted Users</h1>
            <p className="text-gray-600 mt-1">Manage users with account restrictions</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search restricted users..."
              />
            </div>
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All User Types</option>
                <option value="cremation">Cremation Centers</option>
                <option value="furparent">Fur Parents</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Restricted User Accounts</h2>
            <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors duration-300">
              Export Report
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restriction Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reports
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                          <ShieldExclamationIcon className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUserTypeBadge(user.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-500" />
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <PhoneIcon className="h-4 w-4 mr-1 text-gray-500" />
                        {user.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.restrictionDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {user.reportCount} reports
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="text-[var(--primary-green)] hover:text-[var(--primary-green)]/80 mr-3"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No restricted users found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Restricted User Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 sm:mb-0">
                  <ShieldExclamationIcon className="h-10 w-10 text-red-500" />
                </div>
                <div className="sm:ml-6">
                  <h4 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-sm text-gray-500">
                    {selectedUser.type === 'cremation' ? 'Cremation Center' : 'Fur Parent'} account
                  </p>
                  <div className="mt-2">
                    {getUserTypeBadge(selectedUser.type)}
                  </div>
                </div>
              </div>
              
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h5 className="text-sm font-medium text-gray-500 mb-3">Restriction Information</h5>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <h6 className="text-sm font-medium text-red-800">Reason for Restriction</h6>
                      <p className="text-sm text-red-700 mt-1">{selectedUser.reason}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-sm">
                    <div className="flex items-center mb-2">
                      <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-700 font-medium">Restriction Date</span>
                    </div>
                    <p className="ml-6 text-gray-900">{selectedUser.restrictionDate}</p>
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex items-center mb-2">
                      <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-700 font-medium">Duration</span>
                    </div>
                    <p className="ml-6 text-gray-900">{selectedUser.duration}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h5>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center text-sm">
                    <EnvelopeIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-900">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <PhoneIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-900">{selectedUser.phone}</span>
                  </div>
                  <div className="flex items-start text-sm">
                    <MapPinIcon className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <span className="text-gray-900">{selectedUser.address}</span>
                  </div>
                  {selectedUser.type === 'cremation' && selectedUser.owner && (
                    <div className="flex items-center text-sm">
                      <UserCircleIcon className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-900">Owner: {selectedUser.owner}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-300">
                  Remove Restrictions
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-300">
                  Extend Restriction
                </button>
                <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors duration-300">
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
} 