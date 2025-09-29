'use client';

import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  DocumentCheckIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import FurParentDashboardLayout from '@/components/navigation/FurParentDashboardLayout';
import withUserAuth from '@/components/withUserAuth';
import { StatsCardSkeleton } from '@/components/ui/LoadingComponents';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

interface RefundRecord {
  id: number;
  booking_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  refund_type: 'automatic' | 'manual';
  payment_method: string;
  receipt_path?: string;
  notes?: string;
  initiated_at: string;
  processed_at?: string;
  completed_at?: string;
  pet_name?: string;
  booking_date?: string;
  provider_name?: string;
}

function CustomerRefundsPage({ userData }: { userData: any }) {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [downloadingReceipt, setDownloadingReceipt] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/customer/refunds');
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

  const handleDownloadReceipt = async (refundId: number) => {
    setDownloadingReceipt(refundId);
    try {
      const response = await fetch('/api/customer/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refundId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.receiptPath) {
          // Open receipt in new tab
          window.open(data.receiptPath, '_blank');
          showToast('Receipt downloaded successfully.', 'success');
        }
      } else {
        const error = await response.json();
        showToast(`Download failed: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Download failed. Please try again.', 'error');
    } finally {
      setDownloadingReceipt(null);
    }
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
      case 'pending':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
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
      case 'completed':
        return refund.status === 'completed';
      case 'failed':
        return refund.status === 'failed' || refund.status === 'cancelled';
      default:
        return true;
    }
  });

  const totalRefundAmount = refunds
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRefunds = refunds.filter(r => r.status === 'pending').length;

  return (
    <FurParentDashboardLayout activePage="refunds" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">My Refunds</h1>
            <p className="text-gray-600 mt-1">Track your refund requests and download receipts</p>
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
                  <p className="text-sm font-medium text-gray-600">Pending</p>
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
                  Service
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
                      {getStatusIcon(refund.status)}
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
                    <div className="text-sm text-gray-900">{refund.provider_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{refund.pet_name || 'N/A'}</div>
                    {refund.booking_date && (
                      <div className="text-xs text-gray-400">
                        {new Date(refund.booking_date).toLocaleDateString()}
                      </div>
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedRefund(refund)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        <EyeIcon className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                      {refund.status === 'completed' && (
                        <button
                          onClick={() => handleDownloadReceipt(refund.id)}
                          disabled={downloadingReceipt === refund.id}
                          className="text-green-600 hover:text-green-900 text-sm disabled:opacity-50"
                        >
                          {downloadingReceipt === refund.id ? (
                            <>
                              <ClockIcon className="w-4 h-4 inline mr-1 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <ArrowDownTrayIcon className="w-4 h-4 inline mr-1" />
                              Receipt
                            </>
                          )}
                        </button>
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
        <Modal
          isOpen={Boolean(selectedRefund)}
          onClose={() => setSelectedRefund(null)}
          title={`Refund Details #${selectedRefund.id}`}
          size="large"
          variant="default"
          footerContent={
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              {selectedRefund.status === 'completed' && (
                <button
                  onClick={() => handleDownloadReceipt(selectedRefund.id)}
                  disabled={downloadingReceipt === selectedRefund.id}
                  className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 w-full sm:w-auto disabled:opacity-50"
                >
                  {downloadingReceipt === selectedRefund.id ? (
                    <>
                      <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Download Receipt
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedRefund(null)}
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Hero Section - Amount and Status */}
            <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--primary-green)] rounded-full mb-4">
                <CurrencyDollarIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                ₱{selectedRefund.amount.toLocaleString()}
              </h2>
              <div className="flex items-center justify-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedRefund.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedRefund.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  selectedRefund.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  selectedRefund.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusIcon(selectedRefund.status)}
                  <span className="ml-2 capitalize">{selectedRefund.status}</span>
                </span>
              </div>
            </div>

            {/* Refund Information Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentCheckIcon className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Refund Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Booking ID</div>
                  <div className="text-base font-medium text-gray-900">#{selectedRefund.booking_id}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Payment Method</div>
                  <div className="text-base font-medium text-gray-900 capitalize">{selectedRefund.payment_method}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Refund Type</div>
                  <div className="text-base font-medium text-gray-900">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedRefund.refund_type === 'automatic' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedRefund.refund_type === 'automatic' ? 'Automatic' : 'Manual'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Initiated</div>
                  <div className="text-base font-medium text-gray-900">
                    {new Date(selectedRefund.initiated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Service Provider</div>
                  <div className="text-base font-medium text-gray-900">{selectedRefund.provider_name || 'N/A'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Pet Name</div>
                  <div className="text-base font-medium text-gray-900">{selectedRefund.pet_name || 'N/A'}</div>
                </div>
                {selectedRefund.booking_date && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Service Date</div>
                    <div className="text-base font-medium text-gray-900">
                      {new Date(selectedRefund.booking_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Refund Reason</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{selectedRefund.reason}</p>
              </div>
            </div>

            {/* Timeline */}
            {(selectedRefund.processed_at || selectedRefund.completed_at) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-4"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Refund Initiated</div>
                      <div className="text-xs text-gray-500">
                        {new Date(selectedRefund.initiated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {selectedRefund.processed_at && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Processing Started</div>
                        <div className="text-xs text-gray-500">
                          {new Date(selectedRefund.processed_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedRefund.completed_at && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-4"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Refund Completed</div>
                        <div className="text-xs text-gray-500">
                          {new Date(selectedRefund.completed_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedRefund.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedRefund.notes}</p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </FurParentDashboardLayout>
  );
}

export default withUserAuth(CustomerRefundsPage);
