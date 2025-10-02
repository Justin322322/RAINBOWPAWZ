'use client';

import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  DocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,

  ArrowPathIcon,
  HashtagIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { StatsCardSkeleton } from '@/components/ui/LoadingComponents';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

interface RefundRecord {
  id: number;
  booking_id: number;
  user_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'pending_approval' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
  payment_reference_number?: string; // GCash reference number
}

function CremationRefundsPageEnhanced({ userData }: { userData: any }) {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [_error, _setError] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      _setError(null);

      // Fetch refunds with payment receipt data
      const response = await fetch('/api/cremation/refunds?includeReceipts=true');

      if (response.ok) {
        const data = await response.json();
        setRefunds(data.refunds || []);
      } else {
        throw new Error('Failed to fetch refunds');
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
      _setError(error instanceof Error ? error.message : 'Failed to fetch refunds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRefund = async (refundId: number) => {
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_refund', approved: true })
      });

      if (response.ok) {
        await fetchRefunds();
        setSelectedRefund(null);
        showToast('Refund approved successfully', 'success');
      } else {
        const error = await response.json();
        showToast(`Action failed: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Approve error:', error);
      showToast('Action failed. Please try again.', 'error');
    }
  };

  const handleRejectRefund = async (refundId: number, reason: string) => {
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_refund',
          approved: false,
          rejection_reason: reason
        })
      });

      if (response.ok) {
        await fetchRefunds();
        setSelectedRefund(null);
        showToast('Refund rejected', 'warning');
      } else {
        const error = await response.json();
        showToast(`Action failed: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Reject error:', error);
      showToast('Action failed. Please try again.', 'error');
    }
  };

  const viewPaymentReceipt = (receiptUrl: string) => {
    setSelectedReceiptUrl(receiptUrl);
    setShowReceiptModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'pending_approval':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
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
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    switch (filter) {
      case 'pending':
        return refund.status === 'pending' || refund.status === 'pending_approval';
      case 'completed':
        return refund.status === 'completed';
      default:
        return true;
    }
  });

  const totalRefundAmount = refunds
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRefunds = refunds.filter(r =>
    r.status === 'pending' || r.status === 'pending_approval'
  ).length;

  return (
    <CremationDashboardLayout activePage="refunds" userData={userData}>
      {/* Header */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
            <p className="text-gray-600 mt-1">Review and process refund requests from customers</p>
          </div>
          <button
            onClick={fetchRefunds}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <StatsCardSkeleton count={3} />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Refunded</p>
                  <p className="text-2xl font-bold text-gray-900">₱{totalRefundAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingRefunds}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DocumentCheckIcon className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{refunds.length}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex space-x-4">
          {[
            { key: 'all', label: 'All Refunds' },
            { key: 'pending', label: 'Pending Review' },
            { key: 'completed', label: 'Completed' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Refund Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : filteredRefunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getStatusIcon(refund.status)}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Refund #{refund.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Booking #{refund.booking_id}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(refund.initiated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{refund.customer_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{refund.customer_email || 'N/A'}</div>
                    {refund.pet_name && (
                      <div className="text-xs text-gray-400">Pet: {refund.pet_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      ₱{refund.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">{refund.payment_method}</div>
                  </td>
                  <td className="px-6 py-4">
                    {refund.payment_reference_number ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <HashtagIcon className="h-3 w-3" />
                          <span className="font-mono">{refund.payment_reference_number}</span>
                        </div>
                        <button
                          onClick={() => refund.receipt_path && viewPaymentReceipt(refund.receipt_path)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <EyeIcon className="h-3 w-3" />
                          View Receipt
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No reference</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(refund.status)}`}>
                      {refund.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {(refund.status === 'pending' || refund.status === 'pending_approval') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRefund(refund.id)}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) handleRejectRefund(refund.id, reason);
                            }}
                            className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedRefund(refund)}
                        className="w-full px-3 py-1.5 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 text-xs font-medium rounded transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRefunds.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No refunds found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No refunds have been processed yet.' : `No ${filter} refunds found.`}
            </p>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceiptUrl && (
        <Modal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedReceiptUrl(null);
          }}
          title="Payment Receipt"
          size="large"
        >
          <div className="relative w-full h-96">
            <Image
              src={selectedReceiptUrl}
              alt="Payment Receipt"
              fill
              className="object-contain"
            />
          </div>
        </Modal>
      )}

      {/* Refund Details Modal */}
      {selectedRefund && (
        <Modal
          isOpen={Boolean(selectedRefund)}
          onClose={() => setSelectedRefund(null)}
          title={`Refund Details #${selectedRefund.id}`}
          size="large"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Name:</span> {selectedRefund.customer_name}</p>
                <p><span className="text-gray-600">Email:</span> {selectedRefund.customer_email}</p>
                {selectedRefund.pet_name && (
                  <p><span className="text-gray-600">Pet:</span> {selectedRefund.pet_name}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Refund Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Amount:</span> ₱{selectedRefund.amount.toLocaleString()}</p>
                <p><span className="text-gray-600">Reason:</span> {selectedRefund.reason}</p>
                <p><span className="text-gray-600">Status:</span> {selectedRefund.status}</p>
                {selectedRefund.payment_reference_number && (
                  <p><span className="text-gray-600">GCash Ref:</span> {selectedRefund.payment_reference_number}</p>
                )}
              </div>
            </div>

            {(selectedRefund.status === 'pending' || selectedRefund.status === 'pending_approval') && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleApproveRefund(selectedRefund.id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve Refund
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason) handleRejectRefund(selectedRefund.id, reason);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject Refund
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationRefundsPageEnhanced);
