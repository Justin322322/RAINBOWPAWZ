'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import DocumentViewerModal from '@/components/modals/DocumentViewerModal';

function ApplicationDetailContent({ id }) {
  const router = useRouter();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ url: '', type: '' });

  // Helper function to safely display values
  const safeValue = (value, defaultValue = 'Not provided') => {
    return value !== null && value !== undefined ? value : defaultValue;
  };

  // Fetch application data
  useEffect(() => {
    const fetchApplicationData = async () => {
      setIsLoading(true);
      setError('');

      try {
        console.log('Fetching application data for ID:', id);
        const response = await fetch(`/api/businesses/applications/${id}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', response.status, errorText);

          let errorMessage = 'Failed to load application data';
          try {
            // Try to parse the error as JSON
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (e) {
            // If parsing fails, use the error text directly
            if (errorText) {
              errorMessage = `Error: ${errorText}`;
            }
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Application data received:', data);

        // Debug logging for status
        console.log('Application status:', data.status);
        console.log('Application verification status:', data.verificationStatus);
        console.log('Debug status:', data._debug_status);
        console.log('Debug verification status:', data._debug_verification_status);

        if (!data || Object.keys(data).length === 0) {
          throw new Error('No data received from the server');
        }

        setApplication(data);
      } catch (error) {
        console.error('Error fetching application:', error);
        setError(error.message || 'An error occurred while loading the application');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchApplicationData();
    }
  }, [id]);

  // Function to open document modal
  const openDocumentModal = (url, type) => {
    setSelectedDocument({ url, type });
    setIsDocumentModalOpen(true);
  };

  // Function to handle document approval
  const handleApproveDocument = async (note) => {
    try {
      const response = await fetch(`/api/businesses/applications/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: note }),
      });

      if (response.ok) {
        // Refresh the application data
        window.location.reload();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application: ' + (error.message || 'Unknown error'));
    }
  };

  // Function to handle document decline
  const handleDeclineDocument = async (note, requestDocuments) => {
    try {
      setIsLoading(true);

      console.log('Declining application with ID:', id);
      console.log('Request documents:', requestDocuments);
      console.log('Decline note:', note);

      // Show a processing message
      alert('Processing your request. Please wait...');

      const response = await fetch(`/api/businesses/applications/${id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note,
          requestDocuments,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Application decline response:', data);

        // Show success message
        alert(requestDocuments ? 'Documents requested successfully' : 'Application declined successfully');

        // Force a hard reload of the page to ensure all UI elements are updated
        window.location.href = `/admin/applications/${id}?t=${Date.now()}`;
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to decline application');
      }
    } catch (error) {
      console.error('Error declining application:', error);
      alert('Failed to decline application: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Application Details</h1>
            <p className="text-sm text-gray-600">
              View cremation center application information
            </p>
          </div>
        </div>

      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <ArrowPathIcon className="h-10 w-10 text-[var(--primary-green)] animate-spin" />
            <p className="mt-4 text-gray-600">Loading application details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="mx-auto h-12 w-12 text-red-500 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-10 w-10" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Application</h3>
          <p className="mt-1 text-sm text-red-500">{error}</p>
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Retry
            </button>
            <Link
              href="/admin/applications"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              Back to Applications
            </Link>
          </div>
        </div>
      ) : application ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Application Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Information */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">Business Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Business Name</p>
                    <p className="mt-1 text-sm text-gray-900">{safeValue(application.businessName)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Business Type</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {application.businessType === 'cremation'
                        ? 'Pet Cremation Services'
                        : safeValue(application.businessType, 'Pet Cremation Services')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">Submitted Documents</h2>
              </div>
              <div className="p-6">
                {application.documents && application.documents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {application.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{doc.type || doc.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDocumentModal(doc.url || doc.path, doc.type || doc.name)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View Document
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No documents have been submitted yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Application Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">Application Status</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`
                    p-2 rounded-full mr-3
                    ${application.status === 'approved' ? 'bg-green-100' :
                      application.status === 'declined' ? 'bg-red-100' :
                      application.status === 'restricted' ? 'bg-purple-100' :
                      application.status === 'documents_required' ? 'bg-orange-100' :
                      application.status === 'reviewing' ? 'bg-blue-100' :
                      application.verificationStatus === 'declined' ? 'bg-red-100' :
                      application.verificationStatus === 'restricted' ? 'bg-purple-100' :
                      'bg-yellow-100'}
                  `}>
                    {application.status === 'approved' || application.verificationStatus === 'verified' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : application.status === 'declined' || application.verificationStatus === 'declined' ? (
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                    ) : application.status === 'restricted' || application.verificationStatus === 'restricted' ? (
                      <XCircleIcon className="h-5 w-5 text-purple-600" />
                    ) : application.status === 'documents_required' || application.verificationStatus === 'documents_required' ? (
                      <DocumentTextIcon className="h-5 w-5 text-orange-600" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {application.status === 'approved' ? 'Approved' :
                       application.status === 'declined' ? 'Declined' :
                       application.status === 'restricted' ? 'Restricted' :
                       application.status === 'documents_required' ? 'Documents Required' :
                       application.status === 'reviewing' ? 'Under Review' :
                       application.verificationStatus === 'declined' ? 'Declined' :
                       application.verificationStatus === 'restricted' ? 'Restricted' :
                       'Pending'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted on {application.submitDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">Actions</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to approve this application? This action cannot be undone.')) {
                        handleApproveDocument('');
                      }
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                    Approve Application
                  </button>

                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for declining (minimum 10 characters):');
                      if (reason && reason.trim().length >= 10) {
                        if (confirm('Are you sure you want to decline this application? This action cannot be undone.')) {
                          handleDeclineDocument(reason, false);
                        }
                      } else if (reason !== null) {
                        alert('Please provide a more detailed reason (minimum 10 characters)');
                      }
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <XCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                    Decline Application
                  </button>
                </div>
                <Link
                  href="/admin/applications"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
                >
                  Back to Applications
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Application Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The application you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/applications"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              Back to Applications
            </Link>
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        documentUrl={selectedDocument.url}
        documentType={selectedDocument.type}
      />
    </div>
  );
}

function ApplicationDetailClient({ id }) {
  return (
    <AdminDashboardLayout activePage="applications">
      <ApplicationDetailContent id={id} />
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(ApplicationDetailClient);
