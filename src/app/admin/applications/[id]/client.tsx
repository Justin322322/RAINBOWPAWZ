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
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';

function ApplicationDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
                      application.status === 'reviewing' ? 'bg-blue-100' : 'bg-yellow-100'}
                  `}>
                    {application.status === 'approved' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : application.status === 'declined' ? (
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {application.status === 'approved' ? 'Approved' :
                       application.status === 'declined' ? 'Declined' :
                       application.status === 'reviewing' ? 'Under Review' : 'Pending'}
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
                {application.status === 'pending' && (
                  <Link
                    href={`/admin/applications/${id}/review`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
                  >
                    <PencilSquareIcon className="-ml-1 mr-2 h-5 w-5" />
                    Review Application
                  </Link>
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

function ApplicationDetailClient({ id, adminData }: { id: string, adminData?: any }) {
  return (
    <AdminDashboardLayout activePage="applications" adminData={adminData}>
      <ApplicationDetailContent id={id} />
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(ApplicationDetailClient);
