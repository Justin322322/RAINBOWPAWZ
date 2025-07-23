'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProductionImagePath } from '@/utils/imageUtils';
import { useToast } from '@/context/ToastContext';
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import ConfirmationModal from '@/components/ConfirmationModal';
import DeclineModal from '@/components/DeclineModal';
import DocumentViewerModal from '@/components/modals/DocumentViewerModal';
import { SectionLoader } from '@/components/ui/SectionLoader';
import DocumentThumbnailGrid from '@/components/admin/DocumentThumbnailGrid';

interface ApplicationDetailContentProps {
  id: string;
}

interface Application {
  id: string;
  businessId: string;
  status: string;
  verificationStatus: string;
  submitDate: string;
  businessName: string;
  businessType?: string;
  businessHours?: string;
  city?: string;
  province?: string;
  zip?: string;
  description?: string;
  contactFirstName?: string;
  contactLastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  documents?: Array<{
    type?: string;
    name?: string;
    url?: string;
    path?: string;
  }>;
  verificationDate?: string;
  application_status?: string;
}

function ApplicationDetailContent({ id }: ApplicationDetailContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; type: string }>({ url: '', type: '' });

  // Confirmation modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);

  // Animation states
  const [isApprovalSuccess, setIsApprovalSuccess] = useState<boolean>(false);
  const [isDeclineSuccess, setIsDeclineSuccess] = useState<boolean>(false);
  const [_isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successBusinessName, setSuccessBusinessName] = useState<string>('');

  // Helper function to safely display values
  const safeValue = (value: any, defaultValue: string = 'Not provided'): string => {
    return value !== null && value !== undefined ? value : defaultValue;
  };

  // Refactored fetch application data function to be reusable
  const fetchApplicationData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      // Add a cache-busting parameter to ensure we get fresh data
      const cacheBuster = new Date().getTime();

      // CRITICAL: First, let's directly check the database status to ensure we get the most accurate information
      // This is the most reliable source of truth
      const dbStatusResponse = await fetch(`/api/businesses/applications/${id}/status?_=${cacheBuster}`);
      let verificationStatusFromDB: string | null = null;

      if (dbStatusResponse.ok) {
        const dbStatusData = await dbStatusResponse.json();
        if (dbStatusData.verification_status) {
          verificationStatusFromDB = dbStatusData.verification_status;

          // EMERGENCY FIX: If the database shows declined or restricted, we'll use this regardless of what the API returns
          if (verificationStatusFromDB === 'declined' || verificationStatusFromDB === 'restricted') {
            // Create a minimal application object with the correct status
            // This ensures the UI shows the correct status even if the API is returning incorrect data
            setApplication(prev => {
              if (!prev) {
                const minimalApp: Application = {
                  id: `APP${id.toString().padStart(3, '0')}`,
                  businessId: id,
                  status: verificationStatusFromDB!,
                  verificationStatus: verificationStatusFromDB!,
                  submitDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }),
                  businessName: 'Loading...',
                  documents: []
                };
                return minimalApp;
              } else {
                // Update the existing application object with the correct status
                return {
                  ...prev,
                  status: verificationStatusFromDB!,
                  verificationStatus: verificationStatusFromDB!
                };
              }
            });
          }
        }
      }

      // Now get the full application data
      const response = await fetch(`/api/businesses/applications/${id}?_=${cacheBuster}`);

      if (!response.ok) {
        const errorText = await response.text();

        let errorMessage = 'Failed to load application data';
        try {
          // Try to parse the error as JSON
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // If parsing fails, use the error text directly
          if (errorText) {
            errorMessage = `Error: ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Map application_status to verificationStatus for backwards compatibility
      if (data.application_status && !data.verificationStatus) {
        data.verificationStatus = data.application_status;
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error('No data received from the server');
      }

      // Check if we have a status in the URL query parameters
      let statusFromURL: string | null = null;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        statusFromURL = urlParams.get('status');
      } catch {
        // Error parsing URL parameters
      }

      // Check if we have a stored status in sessionStorage
      let storedStatus: string | null = null;
      try {
        storedStatus = sessionStorage.getItem(`application_${id}_status`);

        // Also check localStorage as a backup
        if (!storedStatus) {
          const localStorageStatus = localStorage.getItem(`application_${id}_status`);
          if (localStorageStatus) {
            storedStatus = localStorageStatus;
          }
        }

        // Also check cookies as another backup
        if (!storedStatus) {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(`application_${id}_status=`)) {
              const cookieStatus = cookie.substring(`application_${id}_status=`.length, cookie.length);
              storedStatus = cookieStatus;
              break;
            }
          }
        }
      } catch {
        // Error accessing storage
      }

      // Priority order for status:
      // 1. URL parameter (highest priority, most recent)
      // 2. SessionStorage/localStorage/cookies (reliable as directly set during decline/approve)
      // 3. Direct DB query (reliable but might have caching issues)
      // 4. API response (least reliable as it might have caching issues)

      if (statusFromURL) {
        data.verificationStatus = statusFromURL;
        data.status = statusFromURL;
      } else if (storedStatus) {
        data.verificationStatus = storedStatus;
        data.status = storedStatus;

        // Clear the storage after using it once
        try {
          sessionStorage.removeItem(`application_${id}_status`);
          localStorage.removeItem(`application_${id}_status`);
          document.cookie = `application_${id}_status=; path=/; max-age=0`;
        } catch {
          // Error clearing storage
        }
      } else if (verificationStatusFromDB) {
        data.verificationStatus = verificationStatusFromDB;
        data.status = verificationStatusFromDB;
      }

      // Set status based on application_status
      if (data.application_status) {
        data.status = data.application_status;
        data.verificationStatus = data.application_status;
      }
      // If we still have verification_status but no status, use it (backwards compatibility)
      else if (data.verificationStatus && !data.status) {
        data.status = data.verificationStatus;
      }
      setApplication(data);
    } catch (error) {
      setError((error as Error).message || 'An error occurred while loading the application');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch application data
  useEffect(() => {
    if (id) {
      fetchApplicationData();
    }
  }, [id, fetchApplicationData]);

  // Function to open document modal with production-ready image path
  const openDocumentModal = (url: string, type: string): void => {
    // Process the URL to ensure it works in production
    let processedUrl = url;

    // If it's a document path, ensure it uses the API route
    if (url && typeof url === 'string') {
      // If it's already an API path, use it as is
      if (!url.startsWith('/api/')) {
        // For document paths, use the API route
        if (url.includes('/documents/') || url.includes('/business/') || url.includes('/businesses/')) {
          // Try to extract the relevant path
          const parts = url.split('/');
          const relevantIndex = parts.findIndex(part =>
            part === 'documents' || part === 'business' || part === 'businesses'
          );

          if (relevantIndex >= 0) {
            const relevantPath = parts.slice(relevantIndex).join('/');
            processedUrl = `/api/image/${relevantPath}`;
          }
        }
        // For uploads paths, use the API route
        else if (url.includes('/uploads/')) {
          // Extract the path after /uploads/
          const uploadPath = url.substring(url.indexOf('/uploads/') + '/uploads/'.length);
          processedUrl = `/api/image/${uploadPath}`;
        }
        // For other paths, use the production image path utility
        else {
          processedUrl = getProductionImagePath(url);
        }
      }
    }

    setSelectedDocument({ url: processedUrl, type });
    setIsDocumentModalOpen(true);
  };

  // Function to handle document approval
  const handleApproveDocument = async (note: string): Promise<void> => {
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
        await response.json();

        // Update application status locally
        setApplication(prev => ({
          ...prev!,
          status: 'approved',
          verificationDate: new Date().toISOString().split('T')[0]
        }));

        // Set success state to trigger animation
        setSuccessBusinessName(application!.businessName);
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
      showToast('Failed to approve application: ' + ((error as Error).message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle document decline
  const handleDeclineDocument = async (note: string, requestDocuments: boolean): Promise<void> => {
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
        await response.json();

        // Update application status locally
        const newStatus = requestDocuments ? 'documents_required' : 'declined';

        setApplication(prev => {
          const updated = {
            ...prev!,
            status: newStatus,
            verificationStatus: newStatus,
            verificationDate: new Date().toISOString().split('T')[0]
          };
          return updated;
        });

        // Set success state to trigger animation
        setSuccessBusinessName(application!.businessName);
        setIsDeclineSuccess(true);

        // Reset success state after animation completes and force a hard reload
        setTimeout(() => {
          setIsDeclineSuccess(false);
          setSuccessBusinessName('');

          // Store the status in sessionStorage to ensure it persists across page reloads
          try {
            sessionStorage.setItem(`application_${id}_status`, newStatus);

            // EMERGENCY FIX: Also store in localStorage as a backup
            localStorage.setItem(`application_${id}_status`, newStatus);

            // Set a cookie as another backup method
            document.cookie = `application_${id}_status=${newStatus}; path=/; max-age=3600`;
          } catch {
            // Failed to store status in storage
          }

          // Force a hard reload of the page to ensure all UI elements are updated
          window.location.href = `/admin/applications/${id}?t=${Date.now()}&status=${newStatus}`;
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline application');
      }
    } catch (error) {
      showToast('Failed to decline application: ' + ((error as Error).message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };



  // Render the application details
  const renderApplicationDetails = () => {
    if (isLoading) {
      return (
        <SectionLoader
          message="Loading application details..."
          minHeight="min-h-[300px]"
          withBackground={true}
          withShadow={false}
          rounded={true}
        />
      );
    }

    if (error) {
      return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
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
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Application Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The application you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Submitted Documents</h2>
            </div>
            <div className="p-6">
              <DocumentThumbnailGrid
                documents={application.documents || []}
                onDocumentClick={openDocumentModal}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Status and Actions */}
        <div className="space-y-6">
          {/* Application Status */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Application Status</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center">
                {/* CRITICAL FIX: Force the correct status display based on verification_status */}
                {(() => {
                  // Get the actual status from verification_status if available, otherwise use status
                  const actualStatus = application.verificationStatus || application.status;

                  // Determine the correct display status
                  let displayStatus = 'Pending';
                  let bgColorClass = 'bg-yellow-100';
                  let icon = <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;

                  if (actualStatus === 'verified' || actualStatus === 'approved') {
                    displayStatus = 'Approved';
                    bgColorClass = 'bg-green-100';
                    icon = <CheckCircleIcon className="h-5 w-5 text-green-600" />;
                  } else if (actualStatus === 'declined') {
                    displayStatus = 'Declined';
                    bgColorClass = 'bg-red-100';
                    icon = <XCircleIcon className="h-5 w-5 text-red-600" />;
                  } else if (actualStatus === 'documents_required') {
                    displayStatus = 'Documents Required';
                    bgColorClass = 'bg-orange-100';
                    icon = <DocumentTextIcon className="h-5 w-5 text-orange-600" />;
                  } else if (actualStatus === 'restricted') {
                    displayStatus = 'Restricted';
                    bgColorClass = 'bg-purple-100';
                    icon = <XCircleIcon className="h-5 w-5 text-purple-600" />;
                  } else if (actualStatus === 'reviewing') {
                    displayStatus = 'Under Review';
                    bgColorClass = 'bg-blue-100';
                    icon = <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />;
                  }

                  return (
                    <>
                      <div className={`p-2 rounded-full mr-3 ${bgColorClass}`}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {displayStatus}
                        </p>
                        <p className="text-xs text-gray-500">
                          Submitted on {application.submitDate}
                        </p>
                        {actualStatus !== application.status && (
                          <p className="text-xs text-red-500 mt-1">
                            Status corrected from &quot;{application.status}&quot; to &quot;{actualStatus}&quot;
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              {(() => {
                // Get the actual status from verification_status if available, otherwise use status
                const actualStatus = application.verificationStatus || application.status;

                // Only show approve/decline buttons for pending or reviewing applications
                if (actualStatus === 'pending' || actualStatus === 'reviewing') {
                  return (
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
                  );
                } else if (actualStatus === 'declined') {
                  return (
                    <div className="p-4 bg-red-50 rounded-md">
                      <p className="text-sm text-red-700">
                        This application has been declined. No further actions are available.
                      </p>
                    </div>
                  );
                } else if (actualStatus === 'restricted') {
                  return (
                    <div className="p-4 bg-purple-50 rounded-md">
                      <p className="text-sm text-purple-700">
                        This application has been restricted. No further actions are available.
                      </p>
                    </div>
                  );
                } else if (actualStatus === 'approved' || actualStatus === 'verified') {
                  return (
                    <div className="p-4 bg-green-50 rounded-md">
                      <p className="text-sm text-green-700">
                        This application has been approved. No further actions are available.
                      </p>
                    </div>
                  );
                }

                return null;
              })()}
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

      </div>

      {renderApplicationDetails()}

      {/* Success Animation Overlays */}
      <AnimatePresence>
        {isApprovalSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
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

function ApplicationDetailClient({ id }: ApplicationDetailContentProps) {
  return (
    <AdminDashboardLayout activePage="applications">
      <ApplicationDetailContent id={id} />
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(ApplicationDetailClient);
