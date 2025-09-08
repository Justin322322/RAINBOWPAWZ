'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CurrencyDollarIcon, 
  DocumentCheckIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import { StatsCardSkeleton } from '@/components/ui/LoadingComponents';

interface RefundRecord {
  id: number;
  booking_id: number;
  user_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  refund_type: 'automatic' | 'manual';
  payment_method: string;
  receipt_path?: string;
  receipt_verified?: boolean;
  notes?: string;
  initiated_at: string;
  processed_at?: string;
  completed_at?: string;
  customer_name?: string;
  customer_email?: string;
  pet_name?: string;
  provider_name?: string;
  provider_id?: number;
}

interface RefundStats {
  total_refunds: number;
  total_amount: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
  manual_count: number;
  automatic_count: number;
}

export default function AdminRefundsPage({ adminData }: { adminData: any }) {
  const userName = adminData?.full_name || adminData?.username || 'System Administrator';
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [stats, setStats] = useState<RefundStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'manual' | 'completed' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchRefunds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/refunds?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRefunds(data.refunds || []);
      } else {
        throw new Error('Failed to fetch refunds');
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch refunds');
    } finally {
      setIsLoading(false);
    }
  }, [filter, dateRange.start, dateRange.end, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);

      const response = await fetch(`/api/admin/refunds/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchRefunds();
    fetchStats();
  }, [filter, dateRange, fetchRefunds, fetchStats]);

  const handleSearch = () => {
    fetchRefunds();
  };

  const handleOverrideRefund = async (refundId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'verify_receipt',
          approved: action === 'approve',
          rejection_reason: reason
        })
      });

      if (response.ok) {
        await fetchRefunds();
        await fetchStats();
        setSelectedRefund(null);
        alert(`Refund ${action}d successfully!`);
      } else {
        const error = await response.json();
        alert(`Action failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Override error:', error);
      alert('Action failed. Please try again.');
    }
  };

  const getStatusIcon = (status: string, refundType: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'pending':
        if (refundType === 'manual') {
          return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
        }
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed':
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = searchTerm === '' || 
      refund.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.booking_id.toString().includes(searchTerm);
    
    return matchesSearch;
  });

  return (
    <AdminDashboardLayout activePage="refunds" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage all refunds across the platform</p>
          </div>
        </div>
      </div>

          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <StatsCardSkeleton count={4} />
        ) : error ? (
          <div className="col-span-4 bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Refund Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={() => {
                  setError(null);
                  fetchRefunds();
                  fetchStats();
                }}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : stats ? (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Refunded</p>
                  <p className="text-2xl font-bold text-gray-900">₱{stats.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_count}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed_count}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DocumentCheckIcon className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Manual Processing</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.manual_count}</p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex space-x-4">
                  {[
                    { key: 'all', label: 'All Refunds' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'manual', label: 'Manual' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'failed', label: 'Failed' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        filter === key
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <input
                    type="text"
                    placeholder="Search customers, providers, booking IDs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex space-x-4 mt-4">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Dates
                </button>
              </div>
            </div>
          </div>

          {/* Refunds List */}
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refund Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    // Table skeleton loading state
                    Array(5).fill(0).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                            <div className="ml-4">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-40 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredRefunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(refund.status, refund.refund_type)}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              Refund #{refund.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              Booking #{refund.booking_id} • {refund.refund_type}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(refund.initiated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{refund.customer_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{refund.customer_email || 'N/A'}</div>
                        {refund.pet_name && (
                          <div className="text-xs text-gray-400">Pet: {refund.pet_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₱{refund.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">{refund.payment_method}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(refund.status)}`}>
                          {refund.status}
                        </span>
                        {refund.refund_type === 'manual' && refund.receipt_path && (
                          <div className="text-xs text-green-600 mt-1">Receipt uploaded</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedRefund(refund)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            View
                          </button>
                          {refund.status === 'pending' && refund.refund_type === 'manual' && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleOverrideRefund(refund.id, 'approve')}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                Override Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Rejection reason:');
                                  if (reason) handleOverrideRefund(refund.id, 'reject', reason);
                                }}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                Override Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRefunds.length === 0 && (
              <div className="text-center py-12">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No refunds found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'all' ? 'No refunds have been processed yet.' : `No ${filter} refunds found.`}
                </p>
              </div>
            )}
          </div>

      {/* Refund Details Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Refund Details #{selectedRefund.id}
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Booking ID:</span> #{selectedRefund.booking_id}
                </div>
                <div>
                  <span className="font-medium">Customer:</span> {selectedRefund.customer_name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Provider:</span> {selectedRefund.provider_name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Amount:</span> ₱{selectedRefund.amount.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Payment Method:</span> {selectedRefund.payment_method}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {selectedRefund.refund_type}
                </div>
                <div>
                  <span className="font-medium">Reason:</span> {selectedRefund.reason}
                </div>
                <div>
                  <span className="font-medium">Initiated:</span>{' '}
                  {new Date(selectedRefund.initiated_at).toLocaleString()}
                </div>
                {selectedRefund.notes && (
                  <div>
                    <span className="font-medium">Notes:</span> {selectedRefund.notes}
                  </div>
                )}
                {selectedRefund.receipt_path && (
                  <div>
                    <span className="font-medium">Receipt:</span>
                    <a 
                      href={selectedRefund.receipt_path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      View Receipt
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedRefund(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}
