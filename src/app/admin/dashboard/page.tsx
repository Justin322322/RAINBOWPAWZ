'use client';

import { useState, useEffect } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  UserGroupIcon,
  DocumentCheckIcon,
  ClipboardDocumentCheckIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FireIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import withAdminAuth from '@/components/withAdminAuth';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '@/components/ui/StatCard';
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/SkeletonLoader';

function AdminDashboardPage({ adminData }: { adminData: any }) {
  const userName = adminData?.full_name || 'System Administrator';
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: {
      totalUsers: { value: 0, change: '0%', changeType: 'increase' },
      applicationRequests: { value: 0, change: '0%', changeType: 'increase' },
      activeServices: { value: 0, change: '0%', changeType: 'increase' },
      monthlyRevenue: { value: '₱0', change: '0%', changeType: 'increase' }
    },
    userDistribution: {
      activeUsers: { cremationCenters: 0, furParents: 0 },
      pendingApplications: { thisMonth: 0, lastMonth: 0 },
      restrictedUsers: { cremationCenters: 0, furParents: 0 }
    }
  });
  const [error, setError] = useState<string | null>(null);

  // Define stats configuration
  const statsConfig = [
    {
      key: 'totalUsers',
      name: 'Total Users',
      icon: UserGroupIcon,
      color: 'blue',
    },
    {
      key: 'applicationRequests',
      name: 'Pending Applications',
      icon: DocumentCheckIcon,
      color: 'yellow',
    },
    {
      key: 'activeServices',
      name: 'Active Services',
      icon: FireIcon,
      color: 'purple',
    },
    {
      key: 'monthlyRevenue',
      name: 'Monthly Revenue',
      icon: BanknotesIcon,
      color: 'amber',
    },
  ];



  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/dashboard');

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          setDashboardData(result.data);
          setRecentApplications(result.data.recentApplications || []);
        } else {
          setError(result.error || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to calculate percentage for progress bars
  const calculatePercentage = (value: number, total: number, minPercent: number = 0, maxPercent: number = 100) => {
    // If value is 0, return 0 (no progress bar)
    if (value === 0) return 0;
    // If total is 0 but value is not, return minPercent
    if (total === 0) return minPercent;
    const percent = Math.round((value / total) * 100);
    // Ensure percentage is between minPercent and maxPercent
    return Math.min(Math.max(percent, minPercent), maxPercent);
  };  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
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
      case 'restricted':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 min-w-[90px] justify-center">
            Restricted
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
    <AdminDashboardLayout activePage="dashboard" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your pet cremation business</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          // Using standardized skeleton loader
          Array(4).fill(0).map((_, index) => (
            <SkeletonCard
              key={index}
              withHeader={true}
              contentLines={1}
              withFooter={false}
              withShadow={true}
              rounded="lg"
              animate={true}
            />
          ))
        ) : error ? (
          // Error state
          <div className="col-span-4 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <XCircleIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-red-600 font-medium text-center mb-2">Error loading dashboard data</p>
            <p className="text-gray-500 text-sm text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          // Actual stats
          statsConfig.map((stat, index) => {
            const statData = dashboardData.stats[stat.key];
            return (
              <StatCard
                key={index}
                icon={<stat.icon />}
                label={stat.name}
                value={statData.value}
                color={stat.color as 'blue' | 'yellow' | 'purple' | 'amber' | 'green'}
              />
            );
          })
        )}
      </div>

      {/* Recent Applications */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800">Recent Applications</h2>
          <Link
            href="/admin/applications"
            className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] text-sm font-medium hover:underline flex items-center"
          >
            View All
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {isLoading ? (
          // Using standardized skeleton loader for table
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <SkeletonText
                lines={1}
                height="h-6"
                spacing="tight"
                lastLineWidth="1/4"
                className="mb-6"
              />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton height="h-12" width="w-12" rounded="full" />
                    <div className="flex-1">
                      <SkeletonText
                        lines={2}
                        spacing="tight"
                        lastLineWidth="1/2"
                      />
                    </div>
                    <Skeleton height="h-8" width="w-20" rounded="md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <XCircleIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-red-600 font-medium text-center mb-2">Failed to load recent applications</p>
            <p className="text-gray-500 text-sm text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : recentApplications.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Business
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Owner
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{application.businessName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.owner}</div>
                        <div className="text-sm text-gray-500">{application.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.submitDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(application.status || 'pending')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/applications/${application.id}`}
                          className="text-[var(--primary-green)] hover:text-[var(--secondary-green)] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-4">
              <DocumentCheckIcon className="h-6 w-6" />
            </div>
            <p className="text-gray-500 text-sm">No recent applications found.</p>
          </div>
        )}
      </div>



      {/* User Distribution */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800">User Distribution</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {isLoading ? (
          // Using standardized skeleton loader for user distribution
          Array(3).fill(0).map((_, index) => (
            <SkeletonCard
              key={index}
              withHeader={true}
              contentLines={4}
              withFooter={false}
              withShadow={true}
              rounded="lg"
              animate={true}
              className="p-6"
            />
          ))
        ) : error ? (
          <div className="col-span-3 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <XCircleIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-red-600 font-medium text-center mb-2">Failed to load user distribution data</p>
            <p className="text-gray-500 text-sm text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Active Users */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full bg-green-100 text-green-700 mr-3">
                  <CheckBadgeIcon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Active Users</h3>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Cremation Centers</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {dashboardData.userDistribution.activeUsers.cremationCenters}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculatePercentage(
                        dashboardData.userDistribution.activeUsers.cremationCenters,
                        dashboardData.userDistribution.activeUsers.cremationCenters +
                        dashboardData.userDistribution.activeUsers.furParents,
                        5, 90
                      )}%`
                    }}
                  ></div>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Fur Parents</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {dashboardData.userDistribution.activeUsers.furParents}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculatePercentage(
                        dashboardData.userDistribution.activeUsers.furParents,
                        dashboardData.userDistribution.activeUsers.cremationCenters +
                        dashboardData.userDistribution.activeUsers.furParents,
                        5, 90
                      )}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Pending Applications */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full bg-yellow-100 text-yellow-700 mr-3">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Pending Applications</h3>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {dashboardData.userDistribution.pendingApplications.thisMonth}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-yellow-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculatePercentage(
                        dashboardData.userDistribution.pendingApplications.thisMonth,
                        Math.max(
                          dashboardData.userDistribution.pendingApplications.thisMonth +
                          dashboardData.userDistribution.pendingApplications.lastMonth,
                          1
                        ),
                        5, 85
                      )}%`
                    }}
                  ></div>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Last Month</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {dashboardData.userDistribution.pendingApplications.lastMonth}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-yellow-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculatePercentage(
                        dashboardData.userDistribution.pendingApplications.lastMonth,
                        Math.max(
                          dashboardData.userDistribution.pendingApplications.thisMonth +
                          dashboardData.userDistribution.pendingApplications.lastMonth,
                          1
                        ),
                        5, 85
                      )}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Restricted Users */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full bg-red-100 text-red-700 mr-3">
                  <XCircleIcon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Restricted Users</h3>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Cremation Centers</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {dashboardData.userDistribution.restrictedUsers.cremationCenters}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-red-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculatePercentage(
                        dashboardData.userDistribution.restrictedUsers.cremationCenters,
                        Math.max(
                          dashboardData.userDistribution.activeUsers.cremationCenters +
                          dashboardData.userDistribution.restrictedUsers.cremationCenters,
                          1
                        ),
                        5, 80
                      )}%`
                    }}
                  ></div>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Fur Parents</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {dashboardData.userDistribution.restrictedUsers.furParents}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-red-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculatePercentage(
                        dashboardData.userDistribution.restrictedUsers.furParents,
                        Math.max(
                          dashboardData.userDistribution.activeUsers.furParents +
                          dashboardData.userDistribution.restrictedUsers.furParents,
                          1
                        ),
                        5, 80
                      )}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminDashboardPage);