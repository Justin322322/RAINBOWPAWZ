'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLayoutEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  PhotoIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import ConfirmationModal from '@/components/ConfirmationModal';
import DeclineModal from '@/components/DeclineModal';
import DocumentViewerModal from '@/components/modals/DocumentViewerModal';

function ApplicationReviewContent({ id }: { id: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalNote, setApprovalNote] = useState('');
  const [declineNote, setDeclineNote] = useState('');
  const [requestDocuments, setRequestDocuments] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; type: string }>({ url: '', type: '' });

  // Confirmation modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);

  // Helper function to safely display values
  const safeValue = (value: any, defaultValue: string = 'Not provided') => {
    return value !== null && value !== undefined ? value : defaultValue;
  };

  // Function to reset the form after approval
  const resetApprovalForm = () => {
    setIsApprovalSuccess(false);
    setApprovalNote('');
    setIsProcessing(false);
  };

  // Function to reset the form after decline
  const resetDeclineForm = () => {
    setIsDeclineSuccess(false);
    setDeclineNote('');
    setRequestDocuments(false);
    setIsProcessing(false);
  };

  // Reset animation states after a certain time
  useEffect(() => {
    if (isApprovalSuccess) {
      const timer = setTimeout(() => {
        resetApprovalForm();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isApprovalSuccess]);

  useEffect(() => {
    if (isDeclineSuccess) {
      const timer = setTimeout(() => {
        resetDeclineForm();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isDeclineSuccess]);

  // Function to fetch application data
  const fetchApplicationData = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Fetching application data for review, ID:', id);
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
      console.log('Application data received for review:', data);

      if (!data || Object.keys(data).length === 0) {
        throw new Error('No data received from the server');
      }

      setApplication(data);
    } catch (error) {
      console.error('Error fetching application for review:', error);
      setError(error.message || 'An error occurred while loading the application');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch application data on component mount
  useEffect(() => {
    if (id) {
      fetchApplicationData();
    }
  }, [id]);

  const handleApprove = async () => {
    setIsConfirmModalOpen(true);
  };

  const [isApprovalSuccess, setIsApprovalSuccess] = useState(false);
  const [isFullScreenApprovalSuccess, setIsFullScreenApprovalSuccess] = useState(false);
  const [isFullScreenDeclineSuccess, setIsFullScreenDeclineSuccess] = useState(false);
  const [successBusinessName, setSuccessBusinessName] = useState('');
  const { showToast } = useToast();

  const confirmApprove = async () => {
    setIsProcessing(true);

    try {
      // Show a processing toast
      showToast('Processing approval...', 'info', 2000);

      const response = await fetch(`/api/businesses/applications/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: approvalNote }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Approval response:', data); // Debug log

        // Set success states to trigger animations
        setIsApprovalSuccess(true);
        setSuccessBusinessName(data.businessName || 'Business');

        // Show success toast with email status
        const emailStatus = data.emailSent
          ? ' and email notification sent'
          : ' (email notification could not be sent)';

        showToast(
          `Application for ${data.businessName || 'business'} approved successfully${emailStatus}`,
          'success',
          5000 // Show for 5 seconds
        );

        // Show the full-screen animation after a short delay
        setTimeout(() => {
          setIsFullScreenApprovalSuccess(true);

          // Reset animation state after it completes (no redirect)
          setTimeout(() => {
            setIsFullScreenApprovalSuccess(false);
            setSuccessBusinessName('');
            // Fetch the application data again to show updated status
            fetchApplicationData();
          }, 3000);
        }, 500);

        return true; // Return success for the modal animation
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to approve application');
        showToast('Failed to approve application: ' + (data.message || 'Unknown error'), 'error', 5000);
        setIsProcessing(false);
        throw new Error(data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      setError('An error occurred while approving the application');
      showToast('An error occurred while approving the application. Please try again.', 'error', 5000);
      setIsProcessing(false);
      throw error;
    }
  };

  const handleDecline = async () => {
    setIsDeclineModalOpen(true);
  };

  const [isDeclineSuccess, setIsDeclineSuccess] = useState(false);

  const confirmDecline = async (reason: string, requestDocs: boolean) => {
    setIsProcessing(true);

    try {
      // Show a processing toast
      showToast(`Processing ${requestDocs ? 'document request' : 'decline'}...`, 'info', 2000);

      const response = await fetch(`/api/businesses/applications/${id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: reason,
          requestDocuments: requestDocs,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Decline response:', data); // Debug log

        // Set success state to trigger animation
        setIsDeclineSuccess(true);

        // Update the requestDocuments state to ensure the success message is correct
        setRequestDocuments(requestDocs);

        // Set business name for the full-screen animation
        setSuccessBusinessName(data.businessName || 'Business');

        // Show success toast with email status
        const action = requestDocs ? 'has been sent back for additional documents' : 'has been declined';
        const emailStatus = data.emailSent
          ? ' and email notification sent'
          : ' (email notification could not be sent)';

        showToast(
          `Application for ${data.businessName || 'business'} ${action}${emailStatus}`,
          'success',
          5000 // Show for 5 seconds
        );

        // Show the full-screen animation after a short delay
        setTimeout(() => {
          setIsFullScreenDeclineSuccess(true);

          // Reset animation state after it completes (no redirect)
          setTimeout(() => {
            setIsFullScreenDeclineSuccess(false);
            setSuccessBusinessName('');
            // Fetch the application data again to show updated status
            fetchApplicationData();
          }, 3000);
        }, 500);

        return true; // Return success for the modal animation
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to process application');
        showToast(`Failed to ${requestDocs ? 'request documents' : 'decline application'}: ${data.message || 'Unknown error'}`, 'error', 5000);
        setIsProcessing(false);
        throw new Error(data.message || 'Failed to process application');
      }
    } catch (error) {
      console.error('Error declining application:', error);
      setError('An error occurred while processing the application');
      showToast(`An error occurred while ${requestDocs ? 'requesting documents' : 'declining the application'}. Please try again.`, 'error', 5000);
      setIsProcessing(false);
      throw error;
    }
  };

  // Function to open document modal
  const openDocumentModal = (url: string, type: string) => {
    // Ensure URL is properly formatted
    let formattedUrl = url;

    // Log the original URL for debugging
    console.log('Original document URL:', url);

    // If URL doesn't start with http or /, add a leading /
    if (url && !url.startsWith('http') && !url.startsWith('/')) {
      formattedUrl = `/${url}`;
    }

    console.log('Formatted document URL:', formattedUrl);

    setSelectedDocument({ url: formattedUrl, type });
    setIsDocumentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Success Animation Overlays */}
      <AnimatePresence>
        {isFullScreenApprovalSuccess && (
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
                {successBusinessName} has been approved successfully. They can now access the platform.
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

        {isFullScreenDeclineSuccess && (
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
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {requestDocuments ? 'Additional Documents Requested' : 'Application Declined'}
              </h3>
              <p className="text-gray-600 mb-6">
                {requestDocuments
                  ? `${successBusinessName} has been notified to provide additional documents.`
                  : `${successBusinessName} application has been declined.`
                }
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
            <h1 className="text-2xl font-semibold text-gray-900">Review Application</h1>
            <p className="text-sm text-gray-600">
              Review and verify the cremation center application
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
              onClick={fetchApplicationData}
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

                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-500">Contact Information</p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Contact Person</p>
                      <p className="text-sm text-gray-900">
                        {safeValue(application.contactFirstName, '')} {safeValue(application.contactLastName, '')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{safeValue(application.email)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{safeValue(application.phone)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Address</p>
                      <p className="text-sm text-gray-900">{safeValue(application.address)}</p>
                    </div>
                  </div>
                </div>

                {application.documents && application.documents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Submitted Documents</p>
                    <div className="mt-2 space-y-2">
                      {application.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-900">{doc.type || doc.name}</span>
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">Review Decision</h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Approve Section */}
                <div>
                  <AnimatePresence mode="wait">
                    {isApprovalSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="py-6 flex flex-col items-center justify-center text-center"
                      >
                        <motion.div
                          className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: [0.8, 1.2, 1] }}
                          transition={{ duration: 0.5 }}
                        >
                          <CheckCircleIcon className="h-10 w-10 text-green-500" />
                        </motion.div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Application Approved!</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          The business owner has been notified via email
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <motion.div
                            className="bg-green-500 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2 }}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Approve Application</h3>
                        <textarea
                          value={approvalNote}
                          onChange={(e) => setApprovalNote(e.target.value)}
                          placeholder="Add optional notes for approval (will be sent to the business owner)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                          rows={3}
                        />
                        <button
                          onClick={handleApprove}
                          disabled={isProcessing}
                          className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <>
                              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="-ml-1 mr-2 h-4 w-4" />
                              Approve Application
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-white text-sm text-gray-500">or</span>
                  </div>
                </div>

                {/* Decline Section */}
                <div>
                  <AnimatePresence mode="wait">
                    {isDeclineSuccess ? (
                      <motion.div
                        key="decline-success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="py-6 flex flex-col items-center justify-center text-center"
                      >
                        <motion.div
                          className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: [0.8, 1.2, 1] }}
                          transition={{ duration: 0.5 }}
                        >
                          <XCircleIcon className="h-10 w-10 text-amber-500" />
                        </motion.div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {requestDocuments ? 'Documents Requested' : 'Application Declined'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          The business owner has been notified via email
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <motion.div
                            className="bg-amber-500 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2 }}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="decline-form"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Decline Application</h3>
                        <textarea
                          value={declineNote}
                          onChange={(e) => setDeclineNote(e.target.value)}
                          placeholder="Provide a reason for declining (required, minimum 10 characters)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                          rows={3}
                          required
                        />
                        <div className="mt-2 flex items-center">
                          <input
                            id="request-documents"
                            name="request-documents"
                            type="checkbox"
                            checked={requestDocuments}
                            onChange={(e) => setRequestDocuments(e.target.checked)}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300 rounded"
                          />
                          <label htmlFor="request-documents" className="ml-2 block text-sm text-gray-700">
                            Request additional documents instead of rejecting
                          </label>
                        </div>
                        <button
                          onClick={handleDecline}
                          disabled={isProcessing}
                          className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <>
                              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="-ml-1 mr-2 h-4 w-4" />
                              {requestDocuments ? 'Request Documents' : 'Decline Application'}
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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

      {/* Approval Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmApprove}
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
        onDecline={confirmDecline}
        title="Decline Application"
        minLength={10}
      />
    </div>
  );
}

function ApplicationReviewClient({ id, adminData }: { id: string, adminData?: any }) {
  return (
    <AdminDashboardLayout activePage="applications" adminData={adminData}>
      <ApplicationReviewContent id={id} />
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(ApplicationReviewClient);
