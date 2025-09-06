'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import StatCard from '@/components/ui/StatCard';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner, StatsCardSkeleton } from '@/app/cremation/components/LoadingComponents';

// Utility functions for date formatting
const formatDateLocal = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatTimeLocal = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

interface Refund {
  id: number;
  booking_id: number;
  amount: number | string;
  reason: string;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  pet_name: string;
  booking_date: string;
  booking_time: string;
  payment_method: string;
  user_name: string;
  user_email: string;
}

interface RefundStats {
  total_refunds: number;
  pending_count: number;
  processing_count: number;
  processed_count: number;
  failed_count: number;
  cancelled_count: number;
  total_refunded_amount: number;
  today_count: number;
}

function CremationRefundsPage({ userData }: { userData: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [stats, setStats] = useState<RefundStats>({
    total_refunds: 0,
    pending_count: 0,
    processing_count: 0,
    processed_count: 0,
    failed_count: 0,
    cancelled_count: 0,
    total_refunded_amount: 0,
    today_count: 0
  });
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const queryParams = new URLSearchParams();

      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }

      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const response = await fetch(`/api/cremation/refunds?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch refunds: ${response.status} ${errorData.error || ''}`);
      }

      const data = await response.json();
      setRefunds(data.refunds || []);
      setStats(data.statistics || {
        total_refunds: 0,
        pending_count: 0,
        processing_count: 0,
        processed_count: 0,
        failed_count: 0,
        cancelled_count: 0,
        total_refunded_amount: 0,
        today_count: 0
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load refunds';
      setFetchError(errorMessage);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  useEffect(() => {
    if (fetchError) {
      showToast(fetchError, 'error');
      setFetchError(null);
    }
  }, [fetchError, showToast]);

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
  };

  const handleApproveRefund = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowApproveModal(true);
  };

  const handleDenyRefund = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowDenyModal(true);
  };

  const confirmApproveRefund = async () => {
    if (!selectedRefund) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/cremation/refunds/${selectedRefund.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve refund');
      }

      const data = await response.json();
      showToast(data.message || 'Refund approved successfully', 'success');

      setShowApproveModal(false);
      setSelectedRefund(null);
      fetchRefunds(); // Refresh the list
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to approve refund', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDenyRefund = async () => {
    if (!selectedRefund) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/cremation/refunds/${selectedRefund.id}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deny refund');
      }

      const data = await response.json();
      showToast(data.message || 'Refund denied successfully', 'success');

      setShowDenyModal(false);
      setSelectedRefund(null);
      fetchRefunds(); // Refresh the list
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to deny refund', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      processed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Processed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status
    };

    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  }, []);



  return (
    <CremationDashboardLayout activePage="refunds" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
            <p className="text-gray-600 mt-1">Manage and process customer refund requests</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search refunds..."
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={fetchRefunds}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <StatsCardSkeleton count={4} />
        ) : (
          <>
            <StatCard
              icon={<CurrencyDollarIcon />}
              label="Total Refunds"
              value={stats.total_refunds.toString()}
              color="blue"
            />
            <StatCard
              icon={<ClockIcon />}
              label="Pending"
              value={stats.pending_count.toString()}
              color="yellow"
            />
            <StatCard
              icon={<CheckCircleIcon />}
              label="Processed"
              value={stats.processed_count.toString()}
              color="green"
            />
            <StatCard
              icon={<CurrencyDollarIcon />}
              label="Total Amount"
              value={`₱${stats.total_refunded_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Refund Requests</h2>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading refunds..." className="py-12" />
        ) : refunds.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
              <CurrencyDollarIcon className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No refunds found</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm || statusFilter !== 'all'
                ? 'Try changing your search or filter settings to see more results.'
                : 'There are no refund requests to display at this time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">#{refund.booking_id}</div>
                        <div className="text-sm text-gray-500">{refund.pet_name}</div>
                        <div className="text-sm text-gray-500">{refund.booking_date}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{refund.user_name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">{refund.user_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₱{Number(refund.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">{refund.payment_method}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={refund.reason}>
                        {refund.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(refund.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDateLocal(refund.created_at)}</div>
                      <div className="text-sm text-gray-500">{formatTimeLocal(refund.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(refund)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        {refund.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveRefund(refund)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyRefund(refund)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Deny
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRefund && (
        <RefundDetailsModal
          key={`details-${selectedRefund.id}`}
          refund={selectedRefund}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRefund(null);
          }}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRefund && (
        <ConfirmActionModal
          key={`approve-${selectedRefund.id}`}
          title="Approve Refund"
          message={`Are you sure you want to approve the refund of ₱${Number(selectedRefund.amount).toFixed(2)} for ${selectedRefund.pet_name}?`}
          confirmText="Approve Refund"
          confirmColor="green"
          onConfirm={confirmApproveRefund}
          onCancel={() => {
            setShowApproveModal(false);
            setSelectedRefund(null);
          }}
          loading={actionLoading}
        />
      )}

      {/* Deny Modal */}
      {showDenyModal && selectedRefund && (
        <ConfirmActionModal
          key={`deny-${selectedRefund.id}`}
          title="Deny Refund"
          message={`Are you sure you want to deny the refund request for ${selectedRefund.pet_name}? This action cannot be undone.`}
          confirmText="Deny Refund"
          confirmColor="red"
          onConfirm={confirmDenyRefund}
          onCancel={() => {
            setShowDenyModal(false);
            setSelectedRefund(null);
          }}
          loading={actionLoading}
        />
      )}
    </CremationDashboardLayout>
  );
}

// Refund Details Modal Component
const RefundDetailsModal = React.memo(function RefundDetailsModal({
  refund,
  onClose
}: {
  refund: Refund;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--primary-green)] text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl font-medium text-white">Refund Details</h1>
              <p className="text-sm text-white/80 mt-1">
                Refund #{refund.id} • Booking #{refund.booking_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors duration-200 p-2 rounded-lg hover:bg-white/10 flex-shrink-0 ml-2"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Refund Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Refund Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Amount</span>
                <span className="text-lg font-bold text-[var(--primary-green)]">
                  ₱{Number(refund.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className="text-sm text-gray-900">{refund.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Payment Method</span>
                <span className="text-sm text-gray-900">{refund.payment_method}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Requested</span>
                <span className="text-sm text-gray-900">
                  {formatDateLocal(refund.created_at)} at {formatTimeLocal(refund.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Pet Name</span>
                <span className="text-sm text-gray-900">{refund.pet_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Booking Date</span>
                <span className="text-sm text-gray-900">{refund.booking_date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Booking Time</span>
                <span className="text-sm text-gray-900">{refund.booking_time}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <span className="text-sm text-gray-900">{refund.user_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <span className="text-sm text-gray-900">{refund.user_email}</span>
              </div>
            </div>
          </div>

          {/* Refund Reason */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Refund Reason</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">{refund.reason}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center px-6 py-3 bg-[var(--primary-green)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Confirm Action Modal Component
const ConfirmActionModal = React.memo(function ConfirmActionModal({
  title,
  message,
  confirmText,
  confirmColor,
  onConfirm,
  onCancel,
  loading
}: {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'green' | 'red';
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const confirmButtonClass = confirmColor === 'green'
    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${confirmColor === 'green' ? 'bg-green-100' : 'bg-red-100'
              }`}>
              {confirmColor === 'green' ? (
                <CheckCircleIcon className={`w-6 h-6 ${confirmColor === 'green' ? 'text-green-600' : 'text-red-600'}`} />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmButtonClass}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default withBusinessVerification(CremationRefundsPage);