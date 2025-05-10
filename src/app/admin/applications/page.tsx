'use client';

import { useState } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentMagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AdminApplicationsPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  // Sample applications data
  const applications = [
    {
      id: 'APP001',
      businessName: 'Peaceful Paws Cremation',
      owner: 'John Smith',
      email: 'john@peacefulpaws.com',
      phone: '(555) 123-4567',
      address: 'Balanga City, Bataan, Philippines',
      submitDate: 'May 15, 2023',
      status: 'pending',
      documents: [
        { name: 'Business Permit', verified: true },
        { name: 'Owner ID', verified: true },
        { name: 'Cremation License', verified: false },
        { name: 'Business Registration', verified: true },
        { name: 'Tax Certificate', verified: true }
      ],
      description: 'We provide compassionate pet cremation services with personalized memorials.',
      notes: 'Applicant has prior experience in pet care services.'
    },
    {
      id: 'APP002',
      businessName: "Heaven's Gateway Pet Services",
      owner: 'Maria Rodriguez',
      email: 'maria@heavensgateway.com',
      phone: '(555) 234-5678',
      address: 'Tuyo, Balanga City, Bataan, Philippines',
      submitDate: 'May 14, 2023',
      status: 'reviewing',
      documents: [
        { name: 'Business Permit', verified: true },
        { name: 'Owner ID', verified: true },
        { name: 'Cremation License', verified: true },
        { name: 'Business Registration', verified: true },
        { name: 'Tax Certificate', verified: false },
        { name: 'Insurance Certificate', verified: false },
        { name: 'Environmental Compliance', verified: true }
      ],
      description: 'Dignified pet cremation services with eco-friendly options and memorial keepsakes.',
      notes: 'Applicant has submitted additional environmental compliance documents.'
    },
    {
      id: 'APP003',
      businessName: 'Rainbow Bridge Memorial',
      owner: 'David Chen',
      email: 'david@rainbowbridge.com',
      phone: '(555) 345-6789',
      address: 'Tenejero, Balanga City, Bataan, Philippines',
      submitDate: 'May 10, 2023',
      status: 'approved',
      documents: [
        { name: 'Business Permit', verified: true },
        { name: 'Owner ID', verified: true },
        { name: 'Cremation License', verified: true },
        { name: 'Business Registration', verified: true },
        { name: 'Tax Certificate', verified: true },
        { name: 'Insurance Certificate', verified: true }
      ],
      description: 'Providing pet cremation services with various memorial options and keepsakes.',
      notes: 'All documents verified. Business has been operating for 5 years in another location.'
    },
    {
      id: 'APP004',
      businessName: 'Eternal Companions',
      owner: 'Sarah Johnson',
      email: 'sarah@eternalcompanions.com',
      phone: '(555) 456-7890',
      address: 'Orion, Bataan, Philippines',
      submitDate: 'May 9, 2023',
      status: 'declined',
      documents: [
        { name: 'Business Permit', verified: false },
        { name: 'Owner ID', verified: true },
        { name: 'Cremation License', verified: false },
        { name: 'Business Registration', verified: true }
      ],
      description: 'Pet cremation and memorial services focusing on personalized urns and keepsakes.',
      notes: 'Missing required cremation license. Business permit expired.'
    },
    {
      id: 'APP005',
      businessName: 'Peaceful Path Pet Services',
      owner: 'Michael Wong',
      email: 'michael@peacefulpath.com',
      phone: '(555) 567-8901',
      address: 'Mariveles, Bataan, Philippines',
      submitDate: 'May 7, 2023',
      status: 'pending',
      documents: [
        { name: 'Business Permit', verified: true },
        { name: 'Owner ID', verified: true },
        { name: 'Cremation License', verified: true },
        { name: 'Business Registration', verified: false },
        { name: 'Tax Certificate', verified: false }
      ],
      description: 'Full-service pet memorial and cremation services with home pickup options.',
      notes: 'Business registration document needs clarification. Waiting for additional information.'
    }
  ];

  // Filter applications based on search term and status filter
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
      case 'reviewing':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            Reviewing
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Approved
          </span>
        );
      case 'declined':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Declined
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
    <AdminDashboardLayout activePage="applications" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Application Requests</h1>
            <p className="text-gray-600 mt-1">Review and manage cremation service provider applications</p>
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
                placeholder="Search applications..."
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
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
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

      {/* Application Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
              <DocumentMagnifyingGlassIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800 mr-4">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 mr-4">
              <ArrowPathIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Reviewing</p>
              <p className="text-2xl font-semibold text-gray-900">5</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <CheckIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">11</p>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Application Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
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
              {filteredApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {application.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{application.businessName}</div>
                    <div className="text-sm text-gray-500">{application.documents.length} documents</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.owner}</div>
                    <div className="text-sm text-gray-500">{application.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.address}</div>
                    <div className="text-sm text-gray-500">{application.submitDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(application.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(application)}
                      className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline mr-4"
                    >
                      View
                    </button>
                    {(application.status === 'pending' || application.status === 'reviewing') && (
                      <Link href={`/admin/applications/${application.id}/review`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                        Review
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApplications.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 text-sm">No applications match your search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Application Details</h2>
              <button 
                onClick={() => setShowDetailsModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Business Name</p>
                      <p className="text-base text-gray-900">{selectedApplication.businessName}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-base text-gray-900">{selectedApplication.description}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                      <p className="text-base text-gray-900">{selectedApplication.address}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                      <div>{getStatusBadge(selectedApplication.status)}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Owner Name</p>
                      <p className="text-base text-gray-900">{selectedApplication.owner}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                      <p className="text-base text-gray-900">{selectedApplication.email}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                      <p className="text-base text-gray-900">{selectedApplication.phone}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Submitted</p>
                      <p className="text-base text-gray-900">{selectedApplication.submitDate}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedApplication.documents.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center">
                          <DocumentMagnifyingGlassIcon className="h-5 w-5 text-gray-500 mr-2" />
                          <span>{doc.name}</span>
                        </div>
                        {doc.verified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedApplication.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-base text-gray-900">{selectedApplication.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                {(selectedApplication.status === 'pending' || selectedApplication.status === 'reviewing') && (
                  <Link 
                    href={`/admin/applications/${selectedApplication.id}/review`}
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
                  >
                    Review Application
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
} 