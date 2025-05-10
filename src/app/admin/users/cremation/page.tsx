'use client';

import { useState } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
  EyeIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AdminCremationCentersPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<any>(null);

  // Sample cremation centers data
  const cremationCenters = [
    {
      id: 'CC001',
      name: 'Peaceful Paws Cremation',
      owner: 'John Smith',
      email: 'john@peacefulpaws.com',
      phone: '(555) 123-4567',
      address: 'Balanga City, Bataan, Philippines',
      registrationDate: 'May 10, 2023',
      status: 'active',
      activeServices: 5,
      totalBookings: 48,
      revenue: '$5,680',
      rating: 4.8,
      description: 'We provide compassionate pet cremation services with personalized memorials.',
      verified: true
    },
    {
      id: 'CC002',
      name: 'Rainbow Bridge Memorial',
      owner: 'David Chen',
      email: 'david@rainbowbridge.com',
      phone: '(555) 345-6789',
      address: 'Tenejero, Balanga City, Bataan, Philippines',
      registrationDate: 'May 20, 2023',
      status: 'active',
      activeServices: 7,
      totalBookings: 61,
      revenue: '$7,240',
      rating: 4.9,
      description: 'Providing pet cremation services with various memorial options and keepsakes.',
      verified: true
    },
    {
      id: 'CC003',
      name: "Heaven's Gateway Pet Services",
      owner: 'Maria Rodriguez',
      email: 'maria@heavensgateway.com',
      phone: '(555) 234-5678',
      address: 'Tuyo, Balanga City, Bataan, Philippines',
      registrationDate: 'June 5, 2023',
      status: 'active',
      activeServices: 4,
      totalBookings: 35,
      revenue: '$4,120',
      rating: 4.7,
      description: 'Dignified pet cremation services with eco-friendly options and memorial keepsakes.',
      verified: true
    },
    {
      id: 'CC004',
      name: 'Eternal Companions',
      owner: 'Sarah Johnson',
      email: 'sarah@eternalcompanions.com',
      phone: '(555) 456-7890',
      address: 'Orion, Bataan, Philippines',
      registrationDate: 'June 15, 2023',
      status: 'inactive',
      activeServices: 0,
      totalBookings: 12,
      revenue: '$950',
      rating: 4.2,
      description: 'Pet cremation and memorial services focusing on personalized urns and keepsakes.',
      verified: true
    },
    {
      id: 'CC005',
      name: 'Peaceful Path Pet Services',
      owner: 'Michael Wong',
      email: 'michael@peacefulpath.com',
      phone: '(555) 567-8901',
      address: 'Mariveles, Bataan, Philippines',
      registrationDate: 'July 1, 2023',
      status: 'probation',
      activeServices: 2,
      totalBookings: 5,
      revenue: '$480',
      rating: 3.8,
      description: 'Full-service pet memorial and cremation services with home pickup options.',
      verified: true
    },
    {
      id: 'CC006',
      name: 'Divine Pets Memorial',
      owner: 'Angela Garcia',
      email: 'angela@divinepets.com',
      phone: '(555) 678-9012',
      address: 'Dinalupihan, Bataan, Philippines',
      registrationDate: 'July 18, 2023',
      status: 'restricted',
      activeServices: 0,
      totalBookings: 3,
      revenue: '$120',
      rating: 2.6,
      description: 'Pet memorial services specializing in customized cremation packages.',
      verified: false
    }
  ];

  // Filter cremation centers based on search term and status filter
  const filteredCenters = cremationCenters.filter(center => {
    const matchesSearch = 
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || center.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (center: any) => {
    setSelectedCenter(center);
    setShowDetailsModal(true);
  };

  // Get status badge based on center status
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
      case 'probation':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Probation
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
    <AdminDashboardLayout activePage="cremation" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Cremation Centers</h1>
            <p className="text-gray-600 mt-1">Manage cremation service provider accounts</p>
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
                placeholder="Search cremation centers..."
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
                <option value="probation">Probation</option>
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
            <h2 className="text-lg font-medium text-gray-800">Cremation Center Accounts</h2>
            <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors duration-300">
              Add New Center
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Center Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCenters.map((center) => (
                <tr key={center.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center">
                        <BuildingStorefrontIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{center.name}</div>
                        <div className="text-sm text-gray-500">ID: {center.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{center.owner}</div>
                    <div className="text-sm text-gray-500">{center.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{center.address}</div>
                    <div className="text-sm text-gray-500">{center.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{center.activeServices} services</div>
                    <div className="text-sm text-gray-500">{center.totalBookings} bookings</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(center.status, center.verified)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(center)}
                      className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline mr-4"
                    >
                      View
                    </button>
                    {center.status !== 'restricted' ? (
                      <button className="text-red-600 hover:text-red-900 hover:underline">
                        Restrict
                      </button>
                    ) : (
                      <button className="text-green-600 hover:text-green-900 hover:underline">
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCenters.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 text-sm">No cremation centers match your search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Center Details Modal */}
      {showDetailsModal && selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Cremation Center Details</h2>
              <button 
                onClick={() => setShowDetailsModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-16 w-16 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center mr-4">
                      <BuildingStorefrontIcon className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{selectedCenter.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-gray-600">{selectedCenter.id}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <span className="text-amber-500 mr-1">{selectedCenter.rating}</span>
                          <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          {selectedCenter.verified ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <ShieldCheckIcon className="h-4 w-4 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 text-sm">
                              <ShieldExclamationIcon className="h-4 w-4 mr-1" />
                              Unverified
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedCenter.status, selectedCenter.verified)}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedCenter.description}</p>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Owner Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <UserCircleIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Owner Name</p>
                          <p className="text-gray-900">{selectedCenter.owner}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <p className="text-gray-900">{selectedCenter.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <PhoneIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <p className="text-gray-900">{selectedCenter.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Business Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <MapPinIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Address</p>
                          <p className="text-gray-900">{selectedCenter.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Registration Date</p>
                          <p className="text-gray-900">{selectedCenter.registrationDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Stats */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Business Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Active Services</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedCenter.activeServices}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Total Bookings</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedCenter.totalBookings}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Total Revenue</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedCenter.revenue}</p>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-8 border-t pt-6">
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <Link 
                    href={`/admin/users/cremation/${selectedCenter.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    View Full Details
                  </Link>
                  {selectedCenter.status === 'restricted' ? (
                    <button
                      className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
                    >
                      Restore Access
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Restrict Access
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
} 