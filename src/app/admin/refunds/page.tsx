'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { useToast } from '@/context/ToastContext';
import RefundStatus from '@/components/refund/RefundStatus';
import Modal from '@/components/Modal';
import { motion } from 'framer-motion';
import SectionLoader from '@/components/ui/SectionLoader';

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
  // Joined data
  user_name?: string;
  user_email?: string;
  pet_name?: string;
  booking_date?: string;
  booking_time?: string;
}

function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userName, setUserName] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchRefunds();

    // Get admin name from localStorage
    const adminData = localStorage.getItem('adminData');
    if (adminData) {
      const admin = JSON.parse(adminData);
      setUserName(admin.first_name || 'Admin');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterRefunds();
  }, [refunds, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/refunds');
      const data = await response.json();

      if (data.success) {
        setRefunds(data.refunds || []);
      } else {
        showToast(data.error || 'Failed to fetch refunds', 'error');
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
      showToast('Failed to fetch refunds', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterRefunds = () => {
    let filtered = refunds;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(refund =>
        refund.user_name?.toLowerCase().includes(term) ||
        refund.user_email?.toLowerCase().includes(term) ||
        refund.pet_name?.toLowerCase().includes(term) ||
        refund.reason.toLowerCase().includes(term) ||
        refund.booking_id.toString().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(refund => refund.status === statusFilter);
    }

    setFilteredRefunds(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
  };

  const handleApproveRefund = async (refundId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('Refund approved and processed successfully', 'success');
        fetchRefunds(); // Refresh the list
      } else {
        showToast(data.error || 'Failed to approve refund', 'error');
      }
    } catch (error) {
      console.error('Error approving refund:', error);
      showToast('Failed to approve refund', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDenyRefund = async (refundId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/refunds/${refundId}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('Refund request denied', 'success');
        fetchRefunds(); // Refresh the list
      } else {
        showToast(data.error || 'Failed to deny refund', 'error');
      }
    } catch (error) {
      console.error('Error denying refund:', error);
      showToast('Failed to deny refund', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  if (loading) {
    return (
      <AdminDashboardLayout activePage="refunds" userName={userName}>
        <SectionLoader />
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout activePage="refunds" userName={userName}>
      <div className="space-y-6">
        {/* Header section */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Refund Management</h1>
              <p className="text-gray-600 mt-1">
                {filteredRefunds.length} {filteredRefunds.length === 1 ? 'refund' : 'refunds'} found
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
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
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
        {filteredRefunds.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg">
              {searchTerm || statusFilter !== 'all'
                ? 'No refunds match your search criteria.'
                : 'No refunds found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => (
              <motion.div
                key={refund.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
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
                          onClick={() => handleApproveRefund(refund.id)}
                          className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                          disabled={loading}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleDenyRefund(refund.id)}
                          className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                          disabled={loading}
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Deny
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleViewDetails(refund)}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Refund Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`Refund Details - Booking #${selectedRefund?.booking_id}`}
        >
          {selectedRefund && (
            <div className="space-y-6">
              <RefundStatus
                status={selectedRefund.status}
                amount={selectedRefund.amount}
                reason={selectedRefund.reason}
                createdAt={selectedRefund.created_at}
                updatedAt={selectedRefund.updated_at}
                transactionId={selectedRefund.transaction_id}
                notes={selectedRefund.notes}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-1 text-gray-600">
                    <p><span className="font-medium">Name:</span> {selectedRefund.user_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedRefund.user_email}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Booking Information</h4>
                  <div className="space-y-1 text-gray-600">
                    <p><span className="font-medium">Pet:</span> {selectedRefund.pet_name}</p>
                    <p><span className="font-medium">Date:</span> {selectedRefund.booking_date}</p>
                    <p><span className="font-medium">Time:</span> {selectedRefund.booking_time}</p>
                    <p><span className="font-medium">Payment Method:</span> {selectedRefund.payment_method?.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminRefundsPage);
