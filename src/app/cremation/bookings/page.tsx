'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';

function CremationBookingsPage({ userData }: { userData: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [_stats, setStats] = useState({
    totalBookings: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    totalRevenue: 0
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { showToast: showToastOriginal } = useToast();

  // Memoize the showToast function to prevent it from causing infinite re-renders
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => {
    showToastOriginal(message, type, duration);
  }, [showToastOriginal]);

  // Fetch bookings function
  const fetchBookings = async () => {
    if (!userData?.business_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const providerId = userData?.business_id || userData?.provider_id || 999;
      
      // Build query parameters including search and filter terms
      const queryParams = new URLSearchParams({
        providerId: providerId.toString()
      });

      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }

      const bookingsResponse = await fetch(`/api/cremation/bookings?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!bookingsResponse.ok) {
        throw new Error(`HTTP error! status: ${bookingsResponse.status}`);
      }

      const data = await bookingsResponse.json();
      
      if (data.success) {
        setBookings(data.bookings || []);
        setStats(data.stats || {
          totalBookings: 0,
          scheduled: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          totalRevenue: 0
        });
      } else {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings data when component mounts or search/filter changes
  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.business_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const providerId = userData?.business_id || userData?.provider_id || 999;
        
        // Build query parameters including search and filter terms
        const queryParams = new URLSearchParams({
          providerId: providerId.toString()
        });
        
        if (searchTerm.trim()) {
          queryParams.append('search', searchTerm.trim());
        }
        
        const response = await fetch(`/api/cremation/bookings?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch bookings data: ${response.status} ${errorData.error || ''}`);
        }

        const data = await response.json();

        setBookings(data.bookings || []);
        setStats(data.stats || {
          totalBookings: 0,
          scheduled: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          totalRevenue: 0
        });
      } catch {
        setFetchError('Failed to load bookings data. Please try again later.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData, searchTerm]);

  // Show toast when fetchError changes
  useEffect(() => {
    if (fetchError) {
      showToast(fetchError, 'error');
      setFetchError(null); // Reset error after showing toast
    }
  }, [fetchError, showToast]);

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };



  const handleConfirmPayment = (booking: any) => {
    setSelectedBookingForPayment(booking);
    setShowConfirmPaymentModal(true);
  };

  const handleCancelBooking = (booking: any) => {
    setSelectedBookingForCancel(booking);
    setCancelReason('');
    setCancelNotes('');
    setShowCancelModal(true);
  };

  const handleConfirmPaymentAction = async (action: 'confirm' | 'reject', reason?: string) => {
    if (!selectedBookingForPayment) return;

    try {
      const response = await fetch('/api/payments/offline/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBookingForPayment.id,
          action,
          reason: reason || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment confirmation');
      }

      const data = await response.json();
      showToast(data.message, 'success');

      // Close modal and refresh bookings
      setShowConfirmPaymentModal(false);
      setSelectedBookingForPayment(null);

      // Refresh the bookings data
      const providerId = userData?.business_id || userData?.provider_id || 999;
      const queryParams = new URLSearchParams({
        providerId: providerId.toString()
      });

      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }

      const refreshResponse = await fetch(`/api/cremation/bookings?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBookings(refreshData.bookings || []);
      }

    } catch (error) {
      console.error('Error confirming payment:', error);
      showToast(error instanceof Error ? error.message : 'Failed to process payment confirmation', 'error');
    }
  };

  const handleCancelBookingAction = async () => {
    if (!selectedBookingForCancel || !cancelReason.trim()) return;

    try {
      const response = await fetch(`/api/cremation/bookings/${selectedBookingForCancel.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
          notes: cancelNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const data = await response.json();
      showToast(data.message, 'success');

      // Close modal and refresh bookings
      setShowCancelModal(false);
      setSelectedBookingForCancel(null);
      setCancelReason('');
      setCancelNotes('');

      // Refresh the bookings data
      await fetchBookings();

    } catch (error) {
      console.error('Error cancelling booking:', error);
      showToast(error instanceof Error ? error.message : 'Failed to cancel booking', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled':
      case 'confirmed':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Scheduled
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            In Progress
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Cancelled
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

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch(paymentStatus) {
      case 'paid':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Partially Paid
          </span>
        );
      case 'awaiting_payment_confirmation':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 min-w-[90px] justify-center">
            Awaiting Confirmation
          </span>
        );
      case 'payment_rejected':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Payment Rejected
          </span>
        );
      case 'not_paid':
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Not Paid
          </span>
        );
    }
  };

  return (
    <CremationDashboardLayout activePage="bookings" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Active Bookings</h1>
            <p className="text-gray-600 mt-1">Manage your active cremation service bookings (completed and cancelled bookings are not shown here)</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search bookings..."
              />
            </div>
          </div>
        </div>
      </div>



      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Booking List</h2>
        </div>

        {loading ? (
          <LoadingSpinner
            message="Loading bookings..."
            className="py-12"
          />
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
              <Image
                src="/no-bookings.png"
                alt="No bookings found"
                width={192}
                height={192}
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm
                ? 'Try changing your search to see more results.'
                : 'There are no active cremation service bookings to display at this time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pet Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {booking.petImageUrl ? (
                            <Image
                              className="h-10 w-10 rounded-full object-cover"
                              src={booking.petImageUrl}
                              alt={booking.petName || 'Pet image'}
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-xs">{booking.petName?.charAt(0) || '?'}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{booking.petName}</div>
                          <div className="text-sm text-gray-500">{booking.petType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.owner.name}</div>
                      <div className="flex items-center text-sm text-gray-500 space-x-2">
                        <EnvelopeIcon className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{booking.owner.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.package}</div>
                      <div className="text-sm text-gray-500">
                        ₱{parseFloat(booking.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.scheduledDate}</div>
                      <div className="text-sm text-gray-500">{booking.scheduledTime}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(booking.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-white bg-gray-600 hover:bg-gray-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        {booking.paymentStatus === 'awaiting_payment_confirmation' && booking.paymentReceipt && (
                          <button
                            onClick={() => handleConfirmPayment(booking)}
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Confirm Payment
                          </button>
                        )}
                        {booking.paymentStatus === 'paid' && ['pending', 'confirmed'].includes(booking.status) && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Cancel & Refund
                          </button>
                        )}
                        <Link
                          href={`/cremation/bookings/${booking.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <PencilSquareIcon className="h-4 w-4 mr-1" />
                          Manage
                        </Link>
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
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-[var(--primary-green)] text-white px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg sm:text-xl font-medium text-white">Booking Details</h1>
                  <p className="text-sm text-white/80 mt-1">
                    Booking #{selectedBooking.id} • {selectedBooking.scheduledDate}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-white/80 transition-colors duration-200 p-2 rounded-lg hover:bg-white/10 flex-shrink-0 ml-2"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Pet Information Card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pet Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Pet Name</span>
                    <span className="text-sm text-gray-900">{selectedBooking.petName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Pet Type</span>
                    <span className="text-sm text-gray-900">{selectedBooking.petType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Owner</span>
                    <span className="text-sm text-gray-900">{selectedBooking.owner.name}</span>
                  </div>
                </div>
              </div>

              {/* Booking Information Card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Service</span>
                    <span className="text-sm text-gray-900">{selectedBooking.service}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Date & Time</span>
                    <span className="text-sm text-gray-900">
                      {selectedBooking.scheduledDate} at {selectedBooking.scheduledTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <span className="text-sm text-gray-900 capitalize">{selectedBooking.status}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Amount</span>
                    <span className="text-lg font-bold text-[var(--primary-green)]">
                      ₱{parseFloat(selectedBooking.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Requests Card */}
              {selectedBooking.notes && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="inline-flex items-center px-6 py-3 bg-[var(--primary-green)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmPaymentModal && selectedBookingForPayment && (
        <ConfirmPaymentModal
          booking={selectedBookingForPayment}
          onClose={() => {
            setShowConfirmPaymentModal(false);
            setSelectedBookingForPayment(null);
          }}
          onConfirm={handleConfirmPaymentAction}
        />
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBookingForCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-medium text-white">Cancel Booking</h1>
                  <p className="text-sm text-white/80 mt-1">
                    Booking #{selectedBookingForCancel.id} • {selectedBookingForCancel.petName}
                  </p>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-white hover:text-white/80 transition-colors duration-200 p-2 rounded-lg hover:bg-white/10"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Important Notice</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Cancelling this booking will automatically initiate a refund process. The customer will be notified.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="Service not available">Service not available</option>
                  <option value="Customer request">Customer request</option>
                  <option value="Emergency situation">Emergency situation</option>
                  <option value="Equipment issue">Equipment issue</option>
                  <option value="Weather conditions">Weather conditions</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any additional details about this cancellation..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelBookingAction}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel Booking & Initiate Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
}

// Confirm Payment Modal Component
function ConfirmPaymentModal({
  booking,
  onClose,
  onConfirm
}: {
  booking: any;
  onClose: () => void;
  onConfirm: (action: 'confirm' | 'reject', reason?: string) => void;
}) {
  const [action, setAction] = useState<'confirm' | 'reject'>('confirm');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(action, action === 'reject' ? rejectionReason : undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--primary-green)] text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl font-medium text-white">Confirm Payment</h1>
              <p className="text-sm text-white/80 mt-1">
                Booking #{booking.id} • {booking.petName}
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
          {/* Booking Details */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Pet Name</span>
                <span className="text-sm text-gray-900">{booking.petName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Owner</span>
                <span className="text-sm text-gray-900">{booking.owner.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Service</span>
                <span className="text-sm text-gray-900">{booking.package}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Amount</span>
                <span className="text-lg font-bold text-[var(--primary-green)]">
                  ₱{parseFloat(booking.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Receipt */}
          {booking.paymentReceipt && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Receipt</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <DocumentIcon className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Payment Receipt</h3>
                        <p className="text-sm text-gray-500">Uploaded on {booking.paymentReceipt.uploadedAt}</p>
                        {booking.paymentReceipt.notes && (
                          <p className="text-sm text-gray-600 mt-1">{booking.paymentReceipt.notes}</p>
                        )}
                      </div>
                      <a
                        href={booking.paymentReceipt.receiptPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Receipt
                      </a>
                    </div>
                  </div>
                </div>
                {booking.paymentReceipt.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <XCircleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Previous Rejection Reason</h3>
                        <p className="text-sm text-red-700 mt-1">{booking.paymentReceipt.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Selection */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Action</h2>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentAction"
                    value="confirm"
                    checked={action === 'confirm'}
                    onChange={(e) => setAction(e.target.value as 'confirm')}
                    className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">Confirm Payment</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentAction"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => setAction(e.target.value as 'reject')}
                    className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">Reject Payment</span>
                </label>
              </div>

              {action === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this payment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || (action === 'reject' && !rejectionReason.trim())}
              className={`inline-flex items-center px-6 py-3 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                action === 'confirm'
                  ? 'bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : action === 'confirm' ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              ) : (
                <>
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  Reject Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withBusinessVerification(CremationBookingsPage);
