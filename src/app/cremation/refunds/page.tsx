'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import RefundStatus from '@/components/refund/RefundStatus';
import { Modal } from '@/components/ui/Modal';
import { motion } from 'framer-motion';
import { SectionLoader } from '@/components/ui/SectionLoader';

// Types
interface Refund {
  id: number;
  booking_id: number;
  amount: number | string;
  reason: string;
  status: string;
  processed_by?: number;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  pet_name?: string;
  booking_date?: string;
  booking_time?: string;
}

interface Pagination {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

interface Statistics {
  total_refunds: number;
  pending_count: number;
  processing_count: number;
  processed_count: number;
  failed_count: number;
  cancelled_count: number;
  total_refunded_amount: number;
  today_count: number;
}

// Helper functions
const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
    processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
    processed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Denied' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Refund Card Component
const RefundCard = React.memo(function RefundCard({
  refund,
  onViewDetails,
  onApprove,
  onDeny,
  processingApproval,
  processingDenial
}: {
  refund: Refund;
  onViewDetails: (refund: Refund) => void;
  onApprove: (id: number) => void;
  onDeny: (id: number) => void;
  processingApproval: Set<number>;
  processingDenial: Set<number>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-medium text-gray-900">
              Booking #{refund.booking_id}
            </h3>
            {getStatusBadge(refund.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Customer:</span> {refund.user_name}
            </div>
            <div>
              <span className="font-medium">Pet:</span> {refund.pet_name}
            </div>
            <div>
              <span className="font-medium">Amount:</span> ₱{parseFloat(refund.amount.toString()).toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Requested:</span> {formatDate(refund.created_at)}
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-700">
            <span className="font-medium">Reason:</span> {refund.reason}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {refund.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(refund.id)}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processingApproval.has(refund.id) || processingDenial.has(refund.id)}
              >
                {processingApproval.has(refund.id) ? (
                  <div className="h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                )}
                Approve
              </button>
              <button
                onClick={() => onDeny(refund.id)}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processingApproval.has(refund.id) || processingDenial.has(refund.id)}
              >
                {processingDenial.has(refund.id) ? (
                  <div className="h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircleIcon className="h-4 w-4 mr-1" />
                )}
                Deny
              </button>
            </>
          )}
          <button
            onClick={() => onViewDetails(refund)}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// Main Component
function CremationRefundsPage({ userData }: { userData: any }) {
  // State
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [processingApproval, setProcessingApproval] = useState<Set<number>>(new Set());
  const [processingDenial, setProcessingDenial] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 20,
    hasMore: false
  });
  const [_statistics, setStatistics] = useState<Statistics>({
    total_refunds: 0,
    pending_count: 0,
    processing_count: 0,
    processed_count: 0,
    failed_count: 0,
    cancelled_count: 0,
    total_refunded_amount: 0,
    today_count: 0
  });

  const { showToast } = useToast();

  // Fetch refunds function
  const fetchRefunds = useCallback(async () => {
    if (!userData?.business_id) {
      console.log('❌ No business_id found, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Starting fetchRefunds...');
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.currentPage - 1) * pagination.limit).toString()
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      console.log('📡 Making API request to /api/cremation/refunds');
      const response = await fetch(`/api/cremation/refunds?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 API Response:', data);

      if (data.success) {
        console.log('✅ Setting refunds data:', data.refunds?.length || 0, 'items');
        setRefunds(data.refunds || []);
        setPagination(data.pagination || {
          total: 0,
          currentPage: 1,
          totalPages: 1,
          limit: 20,
          hasMore: false
        });
        setStatistics(data.statistics || {
          total_refunds: 0,
          pending_count: 0,
          processing_count: 0,
          processed_count: 0,
          failed_count: 0,
          cancelled_count: 0,
          total_refunded_amount: 0,
          today_count: 0
        });
      } else {
        console.error('❌ API returned error:', data.error);
        showToast(data.error || 'Failed to fetch refunds', 'error');
      }
    } catch (error) {
      console.error('❌ Error fetching refunds:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        showToast(`Failed to fetch refunds: ${error.message}`, 'error');
      }
    } finally {
      console.log('🏁 fetchRefunds completed - setting loading to false');
      setLoading(false);
    }
  }, [userData?.business_id, pagination.limit, pagination.currentPage, searchTerm, statusFilter, showToast]);

  // Effects
  useEffect(() => {
    console.log('🚀 Component mounted, initializing...');

    if (userData?.business_name) {
      setUserName(userData.business_name);
      console.log('👤 User name set:', userData.business_name);
    }

    if (userData?.business_id) {
      console.log('📡 Triggering initial fetchRefunds...');
      fetchRefunds();
    } else {
      console.log('⏳ No business_id found, stopping loading');
      setLoading(false);
    }
  }, [userData?.business_id, userData?.business_name, fetchRefunds]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log('🚨 Safety timeout triggered - forcing loading to false');
        setLoading(false);
      }
    }, 15000);

    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  // Event handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      currentPage: 1
    }));
  };

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
  };

  const handleApproveRefund = async (refundId: number) => {
    try {
      setProcessingApproval(prev => new Set(prev).add(refundId));

      const response = await fetch(`/api/cremation/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Refund approved and processed successfully', 'success');
        fetchRefunds();
      } else {
        if (response.status === 403) {
          showToast('Access denied. Cremation center privileges required.', 'error');
        } else if (response.status === 401) {
          showToast('Authentication expired. Please log in again.', 'error');
        } else {
          showToast(data.error || 'Failed to approve refund', 'error');
        }
      }
    } catch (error) {
      console.error('Error approving refund:', error);
      showToast('Failed to approve refund', 'error');
    } finally {
      setProcessingApproval(prev => {
        const newSet = new Set(prev);
        newSet.delete(refundId);
        return newSet;
      });
    }
  };

  const handleDenyRefund = async (refundId: number) => {
    try {
      setProcessingDenial(prev => new Set(prev).add(refundId));

      const response = await fetch(`/api/cremation/refunds/${refundId}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Refund request denied', 'success');
        fetchRefunds();
      } else {
        if (response.status === 403) {
          showToast('Access denied. Cremation center privileges required.', 'error');
        } else if (response.status === 401) {
          showToast('Authentication expired. Please log in again.', 'error');
        } else {
          showToast(data.error || 'Failed to deny refund', 'error');
        }
      }
    } catch (error) {
      console.error('Error denying refund:', error);
      showToast('Failed to deny refund', 'error');
    } finally {
      setProcessingDenial(prev => {
        const newSet = new Set(prev);
        newSet.delete(refundId);
        return newSet;
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <CremationDashboardLayout activePage="refunds" userName={userName}>
        <div className="space-y-6">
          <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
                <p className="text-gray-600 mt-1">Loading refund requests...</p>
              </div>
              <button
                onClick={fetchRefunds}
                className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          <SectionLoader />
        </div>
      </CremationDashboardLayout>
    );
  }

  // Main render
  return (
    <CremationDashboardLayout activePage="refunds" userName={userName}>
      <div className="space-y-6">
        {/* Header section */}
        <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
              <p className="text-gray-600 mt-1">
                Manage refund requests for your cremation bookings
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {refunds.length} {refunds.length === 1 ? 'refund' : 'refunds'} found
              </p>
            </div>
            <button
              onClick={fetchRefunds}
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full mb-6">
          <div className="relative flex-grow sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search refunds..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="processing">Processing</option>
              <option value="processed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Denied</option>
            </select>
            <FunnelIcon className="h-4 w-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Refunds List */}
        {refunds.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md border border-gray-100">
            <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Refunds Found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No refunds match your search criteria.'
                : 'You don\'t have any refund requests yet. Refunds will appear here when customers request them for your cremation services.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="text-xs text-gray-400 mt-4 p-4 bg-gray-50 rounded-lg">
                <p><strong>Note:</strong> Refunds are automatically created when:</p>
                <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                  <li>• Customers cancel their bookings</li>
                  <li>• You cancel a booking as the service provider</li>
                  <li>• Payment issues occur that require refunding</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => (
              <RefundCard
                key={refund.id}
                refund={refund}
                onViewDetails={handleViewDetails}
                onApprove={handleApproveRefund}
                onDeny={handleDenyRefund}
                processingApproval={processingApproval}
                processingDenial={processingDenial}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of {pagination.total} results
                </span>

                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                  if (pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm border rounded-lg ${pageNum === pagination.currentPage
                        ? 'bg-[var(--primary-green)] text-white border-[var(--primary-green)]'
                        : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Refund Request Details"
          size="small"
        >
          {selectedRefund && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking ID
                  </label>
                  <p className="text-sm text-gray-900">#{selectedRefund.booking_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div>{getStatusBadge(selectedRefund.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <p className="text-sm text-gray-900">{selectedRefund.user_name}</p>
                  <p className="text-xs text-gray-500">{selectedRefund.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Name
                  </label>
                  <p className="text-sm text-gray-900">{selectedRefund.pet_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount
                  </label>
                  <p className="text-sm text-gray-900">₱{parseFloat(selectedRefund.amount.toString()).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <p className="text-sm text-gray-900">{selectedRefund.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedRefund.booking_date ? formatDate(selectedRefund.booking_date) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Date
                  </label>
                  <p className="text-sm text-gray-900">{formatDate(selectedRefund.created_at)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Reason
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedRefund.reason}
                </p>
              </div>

              {selectedRefund.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing Notes
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedRefund.notes}
                  </p>
                </div>
              )}

              {selectedRefund.transaction_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedRefund.transaction_id}
                  </p>
                </div>
              )}

              <RefundStatus
                status={selectedRefund.status}
                amount={selectedRefund.amount}
                reason={selectedRefund.reason}
                createdAt={selectedRefund.created_at?.toString()}
                updatedAt={selectedRefund.updated_at?.toString()}
                transactionId={selectedRefund.transaction_id}
                notes={selectedRefund.notes}
              />
            </div>
          )}
        </Modal>
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationRefundsPage);