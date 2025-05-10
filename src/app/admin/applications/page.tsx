'use client';

import { useState, useEffect } from 'react';
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
import withAdminAuth from '@/components/withAdminAuth';
import Image from 'next/image';

function AdminApplicationsPage({ adminData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewing: 0,
    approved: 0,
    declined: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineNote, setDeclineNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch applications data
  const fetchApplicationsData = async () => {
    setIsLoading(true);
    try {
      // Fetch applications
      const appResponse = await fetch('/api/businesses/applications');
      if (appResponse.ok) {
        const data = await appResponse.json();
        setApplications(data.applications || []);
      }

      // Fetch statistics
      const statsResponse = await fetch('/api/businesses/applications/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching applications data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationsData();
  }, []);

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

  const handleApproveApplication = async (businessId: number) => {
    if (!confirm('Are you sure you want to approve this application? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/applications/${businessId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve application');
      }

      // Close any open modals
      setShowDetailsModal(false);

      // Refresh data
      await fetchApplicationsData();

      // Show success message
      alert('Application approved successfully! The business owner has been notified.');
    } catch (error) {
      console.error('Error approving application:', error);
      alert(error.message || 'An error occurred while approving the application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeclineModal = (application: any) => {
    setSelectedApplication(application);
    setDeclineNote('');
    setShowDeclineModal(true);
  };

  const handleDeclineApplication = async () => {
    // Validate decline note
    if (!declineNote.trim()) {
      alert('Please provide a reason for declining this application. This will be sent to the applicant.');
      return;
    }

    if (declineNote.length < 10) {
      alert('Please provide a more detailed reason for declining the application.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/applications/${selectedApplication.businessId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: declineNote.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to decline application');
      }

      // Close modals
      setShowDeclineModal(false);
      setShowDetailsModal(false);

      // Refresh data
      await fetchApplicationsData();

      // Show success message
      alert('Application declined successfully. The applicant has been notified via email.');
    } catch (error) {
      console.error('Error declining application:', error);
      alert(error.message || 'An error occurred while declining the application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
    <AdminDashboardLayout activePage="applications" adminData={adminData}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Application Management</h1>
            <p className="mt-1 text-sm text-gray-600">Review and manage business applications</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 shadow-sm rounded-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
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

        {/* Application Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
                <DocumentMagnifyingGlassIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{stats.reviewing}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
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
            {isLoading ? (
              <div className="px-6 py-8 text-center">
                <div className="inline-block animate-spin h-8 w-8 border-t-2 border-b-2 border-[var(--primary-green)] rounded-full"></div>
                <p className="mt-2 text-gray-500">Loading applications...</p>
              </div>
            ) : (
              <>
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
                            className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] hover:underline mr-3"
                          >
                            View
                          </button>

                          {(application.status === 'pending' || application.status === 'reviewing') && (
                            <>
                              <button
                                onClick={() => handleApproveApplication(application.businessId)}
                                disabled={isProcessing}
                                className="text-green-600 hover:text-green-800 hover:underline mr-3"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() => openDeclineModal(application)}
                                disabled={isProcessing}
                                className="text-red-600 hover:text-red-800 hover:underline"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredApplications.length === 0 && !isLoading && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500 text-sm">No applications match your search criteria.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Application Details Modal */}
        {showDetailsModal && selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop with blur effect */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity ease-out duration-300" onClick={() => setShowDetailsModal(false)}></div>

            {/* Modal content */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-modal-appear">
              {/* Header */}
              <div className="bg-[var(--primary-green)] text-white px-8 py-6 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-light tracking-wide text-white">Application Details</h2>
                  {getStatusBadge(selectedApplication.status)}
                </div>
                <button
                  type="button"
                  className="text-white hover:text-white/80 transition-colors duration-200"
                  onClick={() => setShowDetailsModal(false)}
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-8 py-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  {/* Application ID and Submission Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <p className="text-sm font-light text-gray-500 mb-1">Application ID</p>
                      <p className="text-base font-medium text-gray-900">{selectedApplication.id}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <p className="text-sm font-light text-gray-500 mb-1">Submitted On</p>
                      <p className="text-base font-medium text-gray-900">
                        {new Date(selectedApplication.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Business Info Section */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-light text-gray-800">Business Information</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-light text-gray-500 mb-1">Business Name</p>
                          <p className="text-base font-medium text-gray-900">{selectedApplication.businessName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-light text-gray-500 mb-1">Business Type</p>
                          <p className="text-base font-medium text-gray-900">{selectedApplication.businessType || 'Not specified'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm font-light text-gray-500 mb-1">Address</p>
                          <p className="text-base font-medium text-gray-900">{selectedApplication.address || 'No address provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Section */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-light text-gray-800">Contact Information</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-light text-gray-500 mb-1">Owner Name</p>
                          <p className="text-base font-medium text-gray-900">{selectedApplication.owner}</p>
                        </div>
                        <div>
                          <p className="text-sm font-light text-gray-500 mb-1">Email Address</p>
                          <p className="text-base font-medium text-gray-900">{selectedApplication.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-light text-gray-500 mb-1">Phone Number</p>
                          <p className="text-base font-medium text-gray-900">{selectedApplication.phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-light text-gray-800">Required Documents</h3>
                    </div>
                    <div className="p-4">
                      {selectedApplication.documents.length === 0 ? (
                        <div className="text-center py-4">
                          <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300" />
                          <p className="mt-2 text-gray-500 font-light">No documents have been submitted yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedApplication.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                              <div className="flex items-center space-x-3">
                                <div className={`flex-shrink-0 h-3 w-3 rounded-full ${doc.verified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                  <p className="text-xs text-gray-500">{doc.verified ? 'Verified' : 'Pending Verification'}</p>
                                </div>
                              </div>
                              {doc.path && (
                                <a
                                  href={doc.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[var(--primary-green)] hover:text-white hover:bg-[var(--primary-green)] transition-all duration-200 text-sm font-medium flex items-center"
                                >
                                  <EyeIcon className="h-4 w-4 mr-1" />
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with action buttons */}
              <div className="px-8 py-6 border-t border-gray-200">
                {(selectedApplication.status === 'pending' || selectedApplication.status === 'reviewing') ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => handleApproveApplication(selectedApplication.businessId)}
                      disabled={isProcessing}
                      className="flex-1 bg-[var(--primary-green)] text-white py-3 px-6 rounded-lg hover:bg-[var(--primary-green-hover)] transition-all duration-200 flex items-center justify-center font-light text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-1.5" />
                          <span>Approve Application</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeclineModal(selectedApplication)}
                      disabled={isProcessing}
                      className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center font-light text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <XMarkIcon className="h-5 w-5 mr-1.5" />
                          <span>Decline Application</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-light text-base"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-light text-base"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Decline Modal */}
        {showDeclineModal && selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop with blur effect */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity ease-out duration-300" onClick={() => setShowDeclineModal(false)}></div>

            {/* Modal content */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-modal-appear">
              {/* Header */}
              <div className="bg-red-600 text-white px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-light tracking-wide text-white">Decline Application</h2>
                <button
                  type="button"
                  className="text-white hover:text-white/80 transition-colors duration-200"
                  onClick={() => setShowDeclineModal(false)}
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-8 py-6 overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                      <XMarkIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-gray-600">
                        You are about to decline the application for <strong className="text-gray-900">{selectedApplication.businessName}</strong>.
                        Please provide a detailed reason that will be sent to the applicant via email.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="decline-note" className="block text-sm font-light text-gray-700">
                      Reason for Declining <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="decline-note"
                      name="decline-note"
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 font-light"
                      value={declineNote}
                      onChange={(e) => setDeclineNote(e.target.value)}
                      placeholder="Please provide a clear and professional explanation..."
                    />
                    <p className="text-xs text-gray-500">
                      Minimum 10 characters required. Be specific and professional.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                    <button
                      type="button"
                      className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
                      onClick={() => setShowDeclineModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleDeclineApplication}
                      disabled={isProcessing || declineNote.length < 10}
                    >
                      {isProcessing ? (
                        <>
                          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Processing...
                        </>
                      ) : (
                        'Confirm & Decline'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminApplicationsPage);