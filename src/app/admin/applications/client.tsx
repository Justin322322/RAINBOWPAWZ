'use client';

import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

// Define the interface for application type
interface Application {
  id: number;
  businessId: number;
  businessName: string;
  owner: string;
  email: string;
  applicationStatus: string;
  // Add other properties that might be used
  [key: string]: any;
}

function AdminApplicationsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Fetch applications data
  useEffect(() => {
    const fetchApplicationsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Add a cache-busting parameter to ensure we get fresh data
        const cacheBuster = new Date().getTime();

        // Fetch applications
        const appResponse = await fetch(`/api/businesses/applications?_=${cacheBuster}`);

        if (!appResponse.ok) {
          throw new Error(`Failed to fetch applications: ${appResponse.status} ${appResponse.statusText}`);
        }

        const data = await appResponse.json();

        if (data.error) {
          console.error('API returned an error:', data.error);
          setError(data.error);
          setApplications([]);
          return;
        }

        console.log('Applications data:', data);

        // If no applications found, don't throw an error, just show empty state
        if (!data.applications || data.applications.length === 0) {
          setApplications([]);
          return;
        }

        // Process the applications to ensure statuses are correct
        const processedApplications = data.applications.map((app: any) => {
          // Set a default status if none provided
          if (!app.applicationStatus) {
            return { ...app, applicationStatus: 'pending' };
          }
          return app;
        });

        setApplications(processedApplications);
      } catch (error) {
        console.error('Error fetching applications data:', error);
        // Provide a more user-friendly error message
        let errorMessage = 'Failed to load application data';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicationsData();
  }, []);

  // Filter applications based on search term and status
  const filteredApplications = applications.filter((application) => {
    const searchMatch = !searchTerm ||
      application.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.email.toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = statusFilter === 'all' || application.applicationStatus === statusFilter;

    return searchMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Application Management</h1>
          <p className="mt-1 text-sm text-gray-600">Review and manage pending business applications</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 md:mt-0 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors flex items-center"
          disabled={isLoading}
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
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

          <div className="md:w-48">
            <select
              id="status"
              name="status"
              className="block w-full h-10 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">
            {statusFilter === 'pending' ? 'Pending Applications' : 'Business Applications'}
          </h2>
          {statusFilter === 'pending' && (
            <span className="px-2 py-1 text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Showing pending applications
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center">
            <ArrowPathIcon className="mx-auto h-8 w-8 text-[var(--primary-green)] animate-spin" />
            <p className="mt-2 text-gray-500">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto h-12 w-12 text-red-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading applications</h3>
            <p className="mt-1 text-sm text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? "Try adjusting your search term to find what you're looking for."
                : statusFilter === 'pending'
                  ? "There are no pending business applications at this time."
                  : statusFilter !== 'all'
                    ? `No applications with '${statusFilter}' status found.`
                    : "There are no business applications in the system yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{application.owner}</div>
                      <div className="text-sm text-gray-500">{application.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {application.applicationStatus === 'pending' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      {application.applicationStatus === 'approved' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Approved
                        </span>
                      )}
                      {application.applicationStatus === 'declined' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Declined
                        </span>
                      )}
                      {application.applicationStatus === 'restricted' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Restricted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/applications/${application.businessId}`} className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] hover:underline mr-4">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminApplicationsClient({ adminData }: { adminData?: any }) {
  return (
    <AdminDashboardLayout activePage="applications" adminData={adminData}>
      <AdminApplicationsContent />
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminApplicationsClient);
