'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import ConfirmationModal from '@/components/ConfirmationModal';
import DeclineModal from '@/components/DeclineModal';
import DocumentViewerModal from '@/components/modals/DocumentViewerModal';

function ApplicationDetailContent({ id }) {
  const router = useRouter();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ url: '', type: '' });

  // Confirmation modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);

  // Animation states
  const [isApprovalSuccess, setIsApprovalSuccess] = useState(false);
  const [isDeclineSuccess, setIsDeclineSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successBusinessName, setSuccessBusinessName] = useState('');

  // Helper function to safely display values
  const safeValue = (value, defaultValue = 'Not provided') => {
    return value !== null && value !== undefined ? value : defaultValue;
  };

  // Fetch application data
  useEffect(() => {
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
      setIsProcessing(true);

      const response = await fetch(`/api/businesses/applications/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: note }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update application status locally
        setApplication(prev => ({
          ...prev,
          status: 'approved',
          verificationDate: new Date().toISOString().split('T')[0]
        }));

        // Set success state to trigger animation
        setSuccessBusinessName(application.businessName);
        setIsApprovalSuccess(true);

        // Close the modal
        setIsApproveModalOpen(false);

        // Reset success state after animation completes
        setTimeout(() => {
          setIsApprovalSuccess(false);
          setSuccessBusinessName('');

          // Fetch updated data
          fetchApplicationData();
        }, 3000);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle document decline
  const handleDeclineDocument = async (note, requestDocuments) => {
    try {
      setIsProcessing(true);

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

        // Update application status locally
        setApplication(prev => ({
          ...prev,
          status: requestDocuments ? 'documents_required' : 'declined',
          verificationDate: new Date().toISOString().split('T')[0]
        }));

        // Set success state to trigger animation
        setSuccessBusinessName(application.businessName);
        setIsDeclineSuccess(true);

        // Reset success state after animation completes
        setTimeout(() => {
          setIsDeclineSuccess(false);
          setSuccessBusinessName('');

          // Fetch updated data
          fetchApplicationData();
        }, 3000);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to decline application');
      }
    } catch (error) {
      console.error('Error declining application:', error);
      alert('Failed to decline application: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Refactored fetch application data function to be reusable
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

  // Render the application details
  const renderApplicationDetails = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <ArrowPathIcon className="h-10 w-10 text-[var(--primary-green)] animate-spin" />
            <p className="mt-4 text-gray-600">Loading application details...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
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
      );
    }

    if (!application) {
      return (
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
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Application Details */}
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
                <div>
                  <p className="text-sm font-medium text-gray-500">Business Hours</p>
                  <p className="mt-1 text-sm text-gray-900">{safeValue(application.businessHours, 'Not specified')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {safeValue(application.city, '')}
                    {application.city && application.province ? ', ' : ''}
                    {safeValue(application.province, '')}
                    {(application.city || application.province) && application.zip ? ' ' : ''}
                    {safeValue(application.zip, '')}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">Business Description</p>
                <p className="mt-1 text-sm text-gray-900">{safeValue(application.description, 'No description provided')}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Contact Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact Person</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {safeValue(application.contactFirstName, '')} {safeValue(application.contactLastName, '')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-sm text-gray-900">{safeValue(application.email)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1 text-sm text-gray-900">{safeValue(application.phone)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="mt-1 text-sm text-gray-900">{safeValue(application.address)}</p>
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

        {/* Right Column - Status and Actions */}
        <div className="space-y-6">
          {/* Application Status */}
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
                    application.status === 'documents_required' ? 'bg-orange-100' :
                    application.status === 'reviewing' ? 'bg-blue-100' : 'bg-yellow-100'}
                `}>
                  {application.status === 'approved' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : application.status === 'declined' ? (
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                  ) : application.status === 'documents_required' ? (
                    <DocumentTextIcon className="h-5 w-5 text-orange-600" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {application.status === 'approved' ? 'Approved' :
                     application.status === 'declined' ? 'Declined' :
                     application.status === 'documents_required' ? 'Documents Required' :
                     application.status === 'reviewing' ? 'Under Review' : 'Pending'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Submitted on {application.submitDate}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              {(application.status === 'pending' || application.status === 'reviewing') && (
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setIsApproveModalOpen(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                    Approve Application
                  </button>

                  <button
                    onClick={() => setIsDeclineModalOpen(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <XCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                    Decline Application
                  </button>
                </div>
              )}
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
    );
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
        {application && application.status === 'pending' && (
          <Link
            href={`/admin/applications/${id}/review`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          >
            <PencilSquareIcon className="-ml-1 mr-2 h-5 w-5" />
            Review Application
          </Link>
        )}
      </div>

      {renderApplicationDetails()}

      {/* Success Animation Overlays */}
      <AnimatePresence>
        {isApprovalSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Application Approved</h3>
              <p className="text-gray-600 mb-6">
                {successBusinessName} has been approved successfully. They can now offer services on the platform.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <motion.div
                  className="bg-green-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeclineSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <XCircleIcon className="h-12 w-12 text-red-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Application Declined</h3>
              <p className="text-gray-600 mb-6">
                {successBusinessName} application has been declined. They have been notified of this decision.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <motion.div
                  className="bg-red-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        documentUrl={selectedDocument.url}
        documentType={selectedDocument.type}
      />

      {/* Approve Confirmation Modal */}
      <ConfirmationModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={() => handleApproveDocument('')}
        title="Approve Application"
        message="Are you sure you want to approve this application? This action cannot be undone."
        confirmText="Approve"
        confirmButtonClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />

      {/* Decline Modal */}
      <DeclineModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onDecline={handleDeclineDocument}
        title="Decline Application"
        minLength={10}
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
