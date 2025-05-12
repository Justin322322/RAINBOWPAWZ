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

  // Fetch applications data
  useEffect(() => {
    const fetchApplicationsData = async () => {
      setIsLoading(true);
      try {
        // Fetch applications
        const appResponse = await fetch('/api/businesses/applications');
        if (appResponse.ok) {
          const data = await appResponse.json();
          setApplications(data.applications || []);
        }
      } catch (error) {
        console.error('Error fetching applications data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicationsData();
  }, []);

  // Filter applications based on search term
  const filteredApplications = applications.filter(app => {
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
        ) : filteredApplications.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "Try adjusting your search to find what you're looking for."
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/applications/${application.businessId}`} className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] hover:underline mr-4">
                        View
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
