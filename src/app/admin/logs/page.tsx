'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { useToast } from '@/context/ToastContext';
import { SectionLoader } from '@/components/ui/SectionLoader';
import { Modal } from '@/components/ui/Modal';
import Select from '@/components/ui/Select';

interface AdminLog {
  id: number;
  admin_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details: any;
  ip_address: string;
  created_at: string;
  admin_username: string;
  admin_name: string;
}

interface LogFilters {
  action: string;
  entity_type: string;
  admin_id: string;
  search: string;
  date_from: string;
  date_to: string;
}

function AdminLogsPage({ adminData }: { adminData: any }) {
  const userName = adminData?.full_name || 'System Administrator';
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState<AdminLog | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsPerPage, setLogsPerPage] = useState(10);
  
  // Filters
  const [filters, setFilters] = useState<LogFilters>({
    action: '',
    entity_type: '',
    admin_id: '',
    search: '',
    date_from: '',
    date_to: '',
  });
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch logs function
  const fetchLogs = useCallback(async (page = 1, showLoading = true) => {
    // Don't make API calls if user is logging out
    if (sessionStorage.getItem('is_logging_out') === 'true') {
      return;
    }
    
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: logsPerPage.toString(),
      });

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/admin/logs?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        // Handle 401 Unauthorized specifically (likely due to logout)
        if (response.status === 401) {
          // Don't show error for 401 during logout - just return silently
          if (sessionStorage.getItem('is_logging_out') === 'true') {
            return;
          }
        }
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalLogs(data.pagination?.total || 0);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filters, logsPerPage, showToast]);

  // Initial load
  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any active intervals
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Check if user is still authenticated and not logging out before making API call
        if (sessionStorage.getItem('is_logging_out') === 'true') {
          return;
        }
        fetchLogs(currentPage, false);
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, currentPage, fetchLogs, refreshInterval]);

  // Handle filter changes
  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle logs per page change
  const handleLogsPerPageChange = (newLogsPerPage: number) => {
    setLogsPerPage(newLogsPerPage);
    setCurrentPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      action: '',
      entity_type: '',
      admin_id: '',
      search: '',
      date_from: '',
      date_to: '',
    });
    setCurrentPage(1);
  };

  // Get action display with user-friendly descriptions
  const getActionDisplay = (action: string) => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('approve') || actionLower.includes('accept')) {
      return {
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Approved'
      };
    } else if (actionLower.includes('reject') || actionLower.includes('decline') || actionLower.includes('restrict')) {
      return {
        icon: XCircleIcon,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'Rejected/Restricted'
      };
    } else if (actionLower.includes('restore') || actionLower.includes('unrestrict')) {
      return {
        icon: CheckCircleIcon,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'Restored'
      };
    } else if (actionLower.includes('login') || actionLower.includes('auth')) {
      return {
        icon: UserIcon,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        label: 'Login'
      };
    } else {
      return {
        icon: DocumentTextIcon,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'Other Action'
      };
    }
  };

  // Get user-friendly action description
  const getActionDescription = (log: AdminLog) => {
    const action = log.action.toLowerCase();
    const entityType = log.entity_type.toLowerCase();

    if (action.includes('approve') && entityType.includes('service_provider')) {
      return 'Approved cremation center application';
    } else if (action.includes('reject') && entityType.includes('service_provider')) {
      return 'Rejected cremation center application';
    } else if (action.includes('restrict') && entityType.includes('service_provider')) {
      return 'Restricted cremation center';
    } else if (action.includes('restore') && entityType.includes('service_provider')) {
      return 'Restored cremation center access';
    } else if (action.includes('approve') && entityType.includes('application')) {
      return 'Approved business application';
    } else if (action.includes('reject') && entityType.includes('application')) {
      return 'Rejected business application';
    } else if (action.includes('login')) {
      return 'Admin logged into system';
    } else if (action.includes('refund')) {
      return 'Processed refund request';
    } else if (action.includes('review')) {
      return 'Managed customer review';
    } else {
      return `${log.action.replace(/_/g, ' ')} - ${log.entity_type.replace(/_/g, ' ')}`;
    }
  };

  // View log details
  const viewLogDetails = (log: AdminLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchLogs(page);
    }
  };

  // Delete log handlers
  const confirmDeleteLog = (log: AdminLog) => {
    setLogToDelete(log);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setShowDeleteModal(false);
    setLogToDelete(null);
  };

  const deleteLog = async () => {
    if (!logToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logToDelete.id }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete log (${res.status})`);
      }
      showToast('Log deleted successfully', 'success');
      setShowDeleteModal(false);
      setLogToDelete(null);
      // If we deleted the last item on the page and there are previous pages, go back a page
      if (logs.length === 1 && currentPage > 1) {
        fetchLogs(currentPage - 1);
      } else {
        fetchLogs(currentPage);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete log';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <AdminDashboardLayout activePage="logs" userName={userName}>
        <SectionLoader />
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout activePage="logs" userName={userName}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Activity Monitor</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Track admin activities and business operations
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {totalLogs} {totalLogs === 1 ? 'activity' : 'activities'} recorded
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={logsPerPage}
                  onChange={(e) => handleLogsPerPageChange(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent bg-white"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              <label className="flex items-center justify-center sm:justify-start space-x-2 py-2 sm:py-0">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </label>
              <button
                onClick={() => fetchLogs(currentPage)}
                className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center text-sm font-medium"
                disabled={loading}
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Filters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent w-full text-sm"
              />
            </div>

            {/* Action Filter */}
            <Select
              options={[
                { label: 'All Activities', value: '' },
                { label: 'Approvals', value: 'approve' },
                { label: 'Rejections', value: 'reject' },
                { label: 'Restrictions', value: 'restrict' },
                { label: 'Restorations', value: 'restore' },
                { label: 'Admin Logins', value: 'login' },
                { label: 'Refund Actions', value: 'refund' },
              ]}
              value={filters.action}
              onChange={(value) => handleFilterChange('action', value)}
              placeholder="All Activities"
              className="text-sm"
            />

            {/* Entity Type Filter */}
            <Select
              options={[
                { label: 'All Types', value: '' },
                { label: 'Cremation Centers', value: 'service_providers' },
                { label: 'Applications', value: 'application' },
                { label: 'Bookings', value: 'booking' },
                { label: 'Reviews', value: 'review' },
                { label: 'Refunds', value: 'refund' },
              ]}
              value={filters.entity_type}
              onChange={(value) => handleFilterChange('entity_type', value)}
              placeholder="All Types"
              className="text-sm"
            />

            {/* Date From */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1 sm:hidden">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
                placeholder="From date"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1 sm:hidden">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
                placeholder="To date"
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium sm:col-span-2 lg:col-span-1"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          {logs.length === 0 && !loading ? (
            <div className="p-6 sm:p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
              <p className="text-gray-500 text-sm sm:text-base">No admin activities match your current filters. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                <div className="divide-y divide-gray-200">
                  {logs.map((log) => {
                    const actionDisplay = getActionDisplay(log.action);
                    const ActionIcon = actionDisplay.icon;
                    const description = getActionDescription(log);

                    return (
                      <div key={log.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${actionDisplay.bg} flex-shrink-0`}>
                            <ActionIcon className={`h-4 w-4 ${actionDisplay.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {actionDisplay.label}
                                </p>
                                <div className="flex items-center mt-2 text-xs text-gray-500">
                                  <UserIcon className="h-3 w-3 mr-1" />
                                  <span className="truncate">{log.admin_name || 'Unknown Admin'}</span>
                                </div>
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <ClockIcon className="h-3 w-3 mr-1" />
                                  <span>{format(new Date(log.created_at), 'MMM dd, yyyy h:mm a')}</span>
                                </div>
                              </div>
                              <div className="ml-2 flex items-center space-x-3 flex-shrink-0">
                                <button
                                  onClick={() => viewLogDetails(log)}
                                  className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)]"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => confirmDeleteLog(log)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[45%]">Activity</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">Performed By</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Date & Time</th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => {
                      const actionDisplay = getActionDisplay(log.action);
                      const ActionIcon = actionDisplay.icon;
                      const description = getActionDescription(log);

                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-full ${actionDisplay.bg} mr-3 flex-shrink-0`}>
                                <ActionIcon className={`h-4 w-4 ${actionDisplay.color}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {description}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {actionDisplay.label}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center min-w-0">
                              <UserIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {log.admin_name || 'Unknown Admin'}
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                  {log.admin_username || 'unknown'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                              <div>
                                <div className="text-sm text-gray-900">
                                  {format(new Date(log.created_at), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(log.created_at), 'h:mm a')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center text-sm">
                            <div className="inline-flex min-w-[180px] items-center justify-center gap-4 align-middle">
                              <button
                                onClick={() => viewLogDetails(log)}
                                className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] inline-flex items-center"
                              >
                                <EyeIcon className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">View Details</span>
                                <span className="sm:hidden">View</span>
                              </button>
                              <span className="h-4 w-px bg-gray-300" aria-hidden="true" />
                              <button
                                onClick={() => confirmDeleteLog(log)}
                                className="text-red-600 hover:text-red-700 inline-flex items-center"
                              >
                                <TrashIcon className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                                <span className="sm:hidden">Del</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700 flex items-center">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {(currentPage - 1) * logsPerPage + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * logsPerPage, totalLogs)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{totalLogs}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-[var(--primary-green)] border-[var(--primary-green)] text-white'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Activity Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Activity Details"
          size="small"
        >
          {selectedLog && (
            <div className="space-y-6">
              {/* Activity Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {getActionDescription(selectedLog)}
                </h4>
                <p className="text-sm text-gray-600">
                  Performed by {selectedLog.admin_name} on {format(new Date(selectedLog.created_at), 'MMMM dd, yyyy \'at\' h:mm a')}
                </p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Performed By
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.admin_name} ({selectedLog.admin_username})
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedLog.created_at), 'MMMM dd, yyyy \'at\' h:mm a')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Type
                  </label>
                  <p className="text-sm text-gray-900">{getActionDisplay(selectedLog.action).label}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related To
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.entity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} #{selectedLog.entity_id}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Additional Information */}
              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      try {
                        const details = typeof selectedLog.details === 'string'
                          ? JSON.parse(selectedLog.details)
                          : selectedLog.details;

                        return (
                          <div className="space-y-2">
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-sm font-medium text-gray-600">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                </span>
                                <span className="text-sm text-gray-900">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      } catch {
                        return (
                          <p className="text-sm text-gray-900">
                            {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details)}
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          title="Delete Log"
          size="small"
          variant="danger"
        >
          <div className="space-y-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this log entry? This action cannot be undone.
              </p>
            </div>
            {logToDelete && (
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
                <div className="font-medium text-gray-800 mb-1">{getActionDescription(logToDelete)}</div>
                <div>By {logToDelete.admin_name} on {format(new Date(logToDelete.created_at), 'MMM dd, yyyy h:mm a')}</div>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteLog}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminLogsPage);
