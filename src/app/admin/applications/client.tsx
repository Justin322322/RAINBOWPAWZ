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

function AdminApplicationsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch applications data
  useEffect(() => {
    const fetchApplicationsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch applications
        const appResponse = await fetch('/api/businesses/applications');

        if (!appResponse.ok) {
          throw new Error(`Failed to fetch applications: ${appResponse.status} ${appResponse.statusText}`);
        }

        const data = await appResponse.json();

        if (data.error) {
          throw new Error(data.error);
        }

        console.log('Applications data:', data);
        setApplications(data.applications || []);
      } catch (error) {
        console.error('Error fetching applications data:', error);
        setError(error.message || 'Failed to load application data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicationsData();
  }, []);

  // Filter applications based on search term and status
  const filteredApplications = applications.filter(app => {
    // First filter by status if not 'all'
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }

    // Then filter by search term
    return app.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Application Management</h1>
          <p className="mt-1 text-sm text-gray-600">Review and manage business applications</p>
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="documents_required">Documents Required</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Business Applications</h2>
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
              {searchTerm || statusFilter !== 'all'
                ? "Try adjusting your search filters to find what you're looking for."
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
                      {application.status === 'pending' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      {application.status === 'reviewing' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Reviewing
                        </span>
                      )}
                      {application.status === 'documents_required' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          Documents Required
                        </span>
                      )}
                      {application.status === 'approved' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Approved
                        </span>
                      )}
                      {application.status === 'declined' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Declined
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
