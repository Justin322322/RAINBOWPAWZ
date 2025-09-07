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
import CremationSidebar from '@/components/navigation/CremationSidebar';
import withBusinessVerification from '@/components/withBusinessVerification';

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

function CremationRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'manual' | 'completed'>('all');
  const [uploadingReceipt, setUploadingReceipt] = useState<number | null>(null);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cremation/refunds');
      if (response.ok) {
        const data = await response.json();
        setRefunds(data.refunds || []);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
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
        alert('Receipt uploaded successfully!');
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
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
        alert(approved ? 'Refund approved successfully!' : 'Refund rejected.');
      } else {
        const error = await response.json();
        alert(`Action failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Verify error:', error);
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

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <CremationSidebar activePage="refunds" />
        <div className="flex-1 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <CremationSidebar activePage="refunds" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund Management</h1>
            <p className="text-gray-600">Manage refunds for your cremation services</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  {filteredRefunds.map((refund) => (
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
        </div>
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
    </div>
  );
}

export default withBusinessVerification(CremationRefundsPage);
