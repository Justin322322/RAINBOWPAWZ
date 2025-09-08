'use client';

import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  DocumentCheckIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
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
}

function CremationRefundsPage({ userData }: { userData: any }) {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'manual' | 'completed'>('all');
  const [uploadingReceipt, setUploadingReceipt] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/cremation/refunds');
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
  };

  const handleFileUpload = async (refundId: number, file: File) => {
    if (!file) return;

    setUploadingReceipt(refundId);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await fetch(`/api/refunds/${refundId}/upload-receipt`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await fetchRefunds(); // Refresh the list
        showToast('Receipt uploaded successfully.', 'success');
      } else {
        const error = await response.json();
        showToast(`Upload failed: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploadingReceipt(null);
    }
  };

  const handleVerifyRefund = async (refundId: number, approved: boolean, reason?: string) => {
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'verify_receipt',
          approved,
          rejection_reason: reason
        })
      });

      if (response.ok) {
        await fetchRefunds();
        setSelectedRefund(null);
        showToast(approved ? 'Refund approved successfully.' : 'Refund rejected.', approved ? 'success' : 'warning');
      } else {
        const error = await response.json();
        showToast(`Action failed: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Verify error:', error);
      showToast('Action failed. Please try again.', 'error');
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
    switch (filter) {
      case 'pending':
        return refund.status === 'pending';
      case 'manual':
        return refund.refund_type === 'manual';
      case 'completed':
        return refund.status === 'completed';
      default:
        return true;
    }
  });

  const totalRefundAmount = refunds
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRefunds = refunds.filter(r => r.status === 'pending' && r.refund_type === 'manual').length;

  return (
    <CremationDashboardLayout activePage="refunds" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
            <p className="text-gray-600 mt-1">Manage refunds for your cremation services</p>
          </div>
        </div>
      </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              <StatsCardSkeleton count={3} />
            ) : error ? (
              <div className="col-span-3 bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
                    }}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
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
                      <p className="text-sm font-medium text-gray-600">Pending Action</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingRefunds}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <DocumentCheckIcon className="w-8 h-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Refunds</p>
                      <p className="text-2xl font-bold text-gray-900">{refunds.length}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex space-x-4">
                {[
                  { key: 'all', label: 'All Refunds' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'manual', label: 'Manual Processing' },
                  { key: 'completed', label: 'Completed' }
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
                          <div className="h-3 bg-gray-200 rounded w-40 mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
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
                            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {refund.status === 'pending' && refund.refund_type === 'manual' && (
                          <div className="space-y-2">
                            {!refund.receipt_path ? (
                              <div>
                                <label className="flex items-center px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                                  <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                                  <span className="text-sm">Upload Receipt</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(refund.id, file);
                                    }}
                                    disabled={uploadingReceipt === refund.id}
                                  />
                                </label>
                                {uploadingReceipt === refund.id && (
                                  <div className="text-xs text-blue-500">Uploading...</div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-xs text-green-600">Receipt uploaded</div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleVerifyRefund(refund.id, true)}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Rejection reason:');
                                      if (reason) handleVerifyRefund(refund.id, false, reason);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedRefund(refund)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          View Details
                        </button>
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
        <Modal
          isOpen={Boolean(selectedRefund)}
          onClose={() => setSelectedRefund(null)}
          title={`Refund Details #${selectedRefund.id}`}
          size="large"
          variant="info"
          footerContent={
            <div className="flex justify-end space-x-2">
              {selectedRefund.status === 'pending' && selectedRefund.refund_type === 'manual' && selectedRefund.receipt_path ? (
                <>
                  <button
                    onClick={() => handleVerifyRefund(selectedRefund.id, true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) handleVerifyRefund(selectedRefund.id, false, reason);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              ) : null}
              <button
                onClick={() => setSelectedRefund(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Booking ID:</span> #{selectedRefund.booking_id}
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
              <span className="font-medium">Status:</span> {selectedRefund.status}
            </div>
            <div>
              <span className="font-medium">Initiated:</span> {new Date(selectedRefund.initiated_at).toLocaleString()}
            </div>
            {selectedRefund.processed_at && (
              <div><span className="font-medium">Processed:</span> {new Date(selectedRefund.processed_at).toLocaleString()}</div>
            )}
            {selectedRefund.completed_at && (
              <div><span className="font-medium">Completed:</span> {new Date(selectedRefund.completed_at).toLocaleString()}</div>
            )}
            {selectedRefund.notes && (
              <div>
                <span className="font-medium">Notes:</span> {selectedRefund.notes}
              </div>
            )}
            {selectedRefund.receipt_path ? (
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
            ) : (
              selectedRefund.refund_type === 'manual' && selectedRefund.status === 'pending' ? (
                <div className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                  Waiting for receipt upload.
                </div>
              ) : null
            )}
          </div>
        </Modal>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationRefundsPage);
