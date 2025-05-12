'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';

function ApplicationReviewContent({ id }: { id: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalNote, setApprovalNote] = useState('');
  const [declineNote, setDeclineNote] = useState('');
  const [requestDocuments, setRequestDocuments] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Fetch application data
  useEffect(() => {
    const fetchApplicationData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/businesses/applications/${id}`);
        if (response.ok) {
          const data = await response.json();
          setApplication(data);
        } else {
          setError('Failed to load application data');
        }
      } catch (error) {
        console.error('Error fetching application:', error);
        setError('An error occurred while loading the application');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchApplicationData();
    }
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this application? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/applications/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: approvalNote }),
      });

      if (response.ok) {
        router.push('/admin/applications?success=approved');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      setError('An error occurred while approving the application');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (declineNote.trim().length < 10) {
      setError('Please provide a detailed reason for declining (minimum 10 characters)');
      return;
    }

    if (!confirm('Are you sure you want to decline this application? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/applications/${id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: declineNote,
          requestDocuments: requestDocuments,
        }),
      });

      if (response.ok) {
        router.push('/admin/applications?success=declined');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to decline application');
      }
    } catch (error) {
      console.error('Error declining application:', error);
      setError('An error occurred while declining the application');
    } finally {
      setIsProcessing(false);
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
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
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
                    <p className="mt-1 text-sm text-gray-900">{application.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Business Type</p>
                    <p className="mt-1 text-sm text-gray-900">{application.businessType || 'Pet Cremation Services'}</p>
                  </div>
                </div>
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
                    disabled={isProcessing || declineNote.trim().length < 10}
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
