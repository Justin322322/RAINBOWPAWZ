'use client';

import { useState, useEffect } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  UserGroupIcon,
  DocumentCheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ArrowPathIcon,
  UserIcon,
  EnvelopeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import withAdminAuth from '@/components/withAdminAuth';
import StatCard from '@/components/ui/StatCard';
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/SkeletonLoader';
import LogAnalytics from '@/components/admin/LogAnalytics';

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
  ];

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First try the primary dashboard endpoint
        let response = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.error(`Primary dashboard endpoint failed: ${response.status} ${response.statusText}`);
          // Try fallback to dashboard-stats endpoint if primary fails
          response = await fetch('/api/admin/dashboard-stats', {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
          }
        }

        const result = await response.json();

        if (result.success) {
          // Check if the data is from the dashboard or dashboard-stats endpoint
          if (result.stats) {
            // Handle dashboard-stats format
            setDashboardData({
              stats: {
                totalUsers: { 
                  value: result.stats.totalUsers.count, 
                  change: result.stats.totalUsers.change + '%', 
                  changeType: result.stats.totalUsers.changeType 
                },
                applicationRequests: { 
                  value: result.stats.applications.count, 
                  change: result.stats.applications.change + '%', 
                  changeType: result.stats.applications.changeType 
                },
                activeServices: { 
                  value: result.stats.services.count, 
                  change: result.stats.services.change + '%', 
                  changeType: result.stats.services.changeType 
                },
                monthlyRevenue: { 
                  value: `₱${result.stats.revenue.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`, 
                  change: result.stats.revenue.change + '%', 
                  changeType: result.stats.revenue.changeType 
                }
              },
              userDistribution: {
                activeUsers: { 
                  cremationCenters: result.stats.activeUsers.cremation, 
                  furParents: result.stats.activeUsers.furparent 
                },
                pendingApplications: { 
                  thisMonth: result.stats.pendingApplications.current_month, 
                  lastMonth: result.stats.pendingApplications.last_month 
                },
                restrictedUsers: { 
                  cremationCenters: result.stats.restrictedUsers.cremation, 
                  furParents: result.stats.restrictedUsers.furparent 
                }
              }
            });
            setRecentApplications([]);
          } else {
            // Original dashboard format
            setDashboardData(result.data);
            setRecentApplications(result.data.recentApplications || []);
          }
          
        } else {
          setError(result.error || 'Failed to fetch dashboard data');
          console.error('Dashboard data error:', result.error || 'Unknown error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Dashboard data fetch error:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Get status badge based on application status
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
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your pet cremation business</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 mb-8">
        {isLoading ? (
          // Using standardized skeleton loader
          Array(3).fill(0).map((_, index) => (
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
          <div className="col-span-3 bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {recentApplications.map((application) => (
                  <div key={application.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {application.businessName}
                          </div>
                          {getStatusBadge(application.status || 'pending')}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{application.owner}</span>
                          </div>
                          <div className="flex items-center">
                            <EnvelopeIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{application.email}</span>
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span>{application.submitDate}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/admin/applications/${application.id}`}
                        className="ml-2 text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] text-sm font-medium flex-shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Business
                    </th>
                    <th
                      scope="col"
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Owner
                    </th>
                    <th
                      scope="col"
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate">{application.businessName}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate">{application.owner}</div>
                        <div className="text-sm text-gray-500 truncate">{application.email}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.submitDate}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(application.status || 'pending')}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
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
        <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 gap-4 xs:gap-5 sm:gap-6">
          {isLoading ? (
            // Using standardized skeleton loader for user distribution
            Array(2).fill(0).map((_, index) => (
              <SkeletonCard
                key={index}
                withHeader={true}
                contentLines={2}
                withFooter={false}
                withShadow={true}
                rounded="lg"
                animate={true}
                className="p-6"
              />
            ))
          ) : error ? (
            <div className="col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load User Data</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    window.location.reload();
                  }}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Users */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                  <div className="flex space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Total: {(dashboardData.userDistribution?.activeUsers?.cremationCenters || 0) + (dashboardData.userDistribution?.activeUsers?.furParents || 0)}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cremation Centers</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {dashboardData.userDistribution?.activeUsers?.cremationCenters || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fur Parents</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {dashboardData.userDistribution?.activeUsers?.furParents || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending Applications */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-500">Application Status</h3>
                  <div className="flex space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      This Month: {dashboardData.userDistribution?.pendingApplications?.thisMonth || 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {dashboardData.userDistribution?.pendingApplications?.thisMonth || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Month</span>
                    <span className="text-lg font-semibold text-gray-600">
                      {dashboardData.userDistribution?.pendingApplications?.lastMonth || 0}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* System Activity Analytics */}
      <div className="mb-8">
        <LogAnalytics />
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminDashboardPage);
