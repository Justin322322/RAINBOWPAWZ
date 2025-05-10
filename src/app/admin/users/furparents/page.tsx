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
  UserCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AdminFurParentsPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Sample fur parents data
  const furParents = [
    {
      id: 'FP001',
      name: 'Emily Johnson',
      email: 'emily@example.com',
      phone: '(555) 123-4567',
      address: 'Balanga City, Bataan, Philippines',
      registrationDate: 'January 15, 2023',
      status: 'active',
      pets: 3,
      completedBookings: 5,
      lastLogin: '2 hours ago',
      verified: true
    },
    {
      id: 'FP002',
      name: 'Michael Garcia',
      email: 'michael@example.com',
      phone: '(555) 234-5678',
      address: 'Orion, Bataan, Philippines',
      registrationDate: 'February 3, 2023',
      status: 'active',
      pets: 2,
      completedBookings: 3,
      lastLogin: '1 day ago',
      verified: true
    },
    {
      id: 'FP003',
      name: 'Sophia Martinez',
      email: 'sophia@example.com',
      phone: '(555) 345-6789',
      address: 'Mariveles, Bataan, Philippines',
      registrationDate: 'March 12, 2023',
      status: 'inactive',
      pets: 1,
      completedBookings: 1,
      lastLogin: '30 days ago',
      verified: true
    },
    {
      id: 'FP004',
      name: 'Daniel Lee',
      email: 'daniel@example.com',
      phone: '(555) 456-7890',
      address: 'Abucay, Bataan, Philippines',
      registrationDate: 'April 5, 2023',
      status: 'active',
      pets: 4,
      completedBookings: 7,
      lastLogin: '5 hours ago',
      verified: true
    },
    {
      id: 'FP005',
      name: 'Olivia Wilson',
      email: 'olivia@example.com',
      phone: '(555) 567-8901',
      address: 'Dinalupihan, Bataan, Philippines',
      registrationDate: 'May 22, 2023',
      status: 'inactive',
      pets: 2,
      completedBookings: 2,
      lastLogin: '15 days ago',
      verified: true
    },
    {
      id: 'FP006',
      name: 'James Thompson',
      email: 'james@example.com',
      phone: '(555) 678-9012',
      address: 'Limay, Bataan, Philippines',
      registrationDate: 'June 8, 2023',
      status: 'restricted',
      pets: 1,
      completedBookings: 0,
      lastLogin: '45 days ago',
      verified: false
    }
  ];

  // Filter fur parents based on search term and status filter
  const filteredUsers = furParents.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  // Get status badge based on user status
  const getStatusBadge = (status: string, verified: boolean) => {
    if (!verified) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
          Unverified
        </span>
      );
    }
    
    switch(status) {
      case 'active':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Inactive
          </span>
        );
      case 'restricted':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Restricted
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminDashboardLayout activePage="furparents" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Fur Parents</h1>
            <p className="text-gray-600 mt-1">Manage pet owners who use our services</p>
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
                placeholder="Search fur parents..."
              />
            </div>
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="restricted">Restricted</option>
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
            <h2 className="text-lg font-medium text-gray-800">Fur Parent Accounts</h2>
            <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors duration-300">
              Export Data
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
                  Contact Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserCircleIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.pets} pets
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.completedBookings} completed
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status, user.verified)}
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
                    No fur parents found matching your search criteria.
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
                <h3 className="text-xl font-semibold text-gray-800">Fur Parent Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 sm:mb-0">
                  <UserCircleIcon className="h-10 w-10 text-gray-500" />
                </div>
                <div className="sm:ml-6">
                  <h4 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-sm text-gray-500">Member since {selectedUser.registrationDate}</p>
                  <div className="mt-2">
                    {getStatusBadge(selectedUser.status, selectedUser.verified)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h5>
                  <div className="space-y-2">
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
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">User Statistics</h5>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Registered Pets:</span>
                      <span className="text-gray-900 ml-2">{selectedUser.pets}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Completed Bookings:</span>
                      <span className="text-gray-900 ml-2">{selectedUser.completedBookings}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Last Activity:</span>
                      <span className="text-gray-900 ml-2">{selectedUser.lastLogin}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                {selectedUser.status === 'restricted' ? (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-300">
                    Remove Restrictions
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-300">
                    Restrict User
                  </button>
                )}
                <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors duration-300">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
} 