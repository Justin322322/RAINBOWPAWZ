'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import StatCard from '@/components/ui/StatCard';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  EnvelopeIcon,
  FunnelIcon,
  PencilSquareIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner, StatsCardSkeleton } from '@/app/cremation/components/LoadingComponents';

function CremationBookingsPage({ userData }: { userData: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
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

  // Fetch bookings data when component mounts or search/filter changes
  useEffect(() => {
    const fetchBookings = async () => {
      if (!userData?.business_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        // Add minimum loading delay for better UX (same as admin)
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 600));
        
        const providerId = userData?.business_id || userData?.provider_id || 999;
        
        const dataPromise = fetch(`/api/cremation/bookings?providerId=${providerId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        // Wait for both the minimum time and the data
        const [, response] = await Promise.all([minLoadingTime, dataPromise]);

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

    fetchBookings();
  }, [userData]);

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

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handlePaymentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPaymentFilter(e.target.value);
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

  return (
    <CremationDashboardLayout activePage="bookings" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
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
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Active Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <select
                value={paymentFilter}
                onChange={handlePaymentFilterChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="not_paid">Not Paid</option>
                <option value="gcash">GCash Payments</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {loading ? (
          // Using standardized stats card skeleton
          <StatsCardSkeleton count={5} />

        ) : (
          <>
            <StatCard
              icon={<CalendarIcon />}
              label="Total Bookings"
              value={stats.totalBookings}
              color="blue"
            />
            <StatCard
              icon={<ClockIcon />}
              label="Pending"
              value={stats.pending}
              color="yellow"
            />
            <StatCard
              icon={<CheckIcon />}
              label="Completed"
              value={stats.completed}
              color="green"
            />
            <StatCard
              icon={<XMarkIcon />}
              label="Cancelled"
              value={stats.cancelled}
              color="amber"
            />
            <StatCard
              icon={<BanknotesIcon />}
              label="Total Revenue"
              value={`₱${parseFloat(String(stats.totalRevenue || '0')).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
            <div className="text-gray-400 mb-4">
              <CalendarIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm || statusFilter !== 'all'
                ? 'Try changing your search or filter settings to see more results.'
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
                      {booking.paymentMethod === 'gcash' ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
                          Paid (GCash)
                        </span>
                      ) : booking.paymentStatus === 'paid' ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
                          Paid
                        </span>
                      ) : booking.paymentStatus === 'partially_paid' ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
                          Partially Paid
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
                          Not Paid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <Link
                          href={`/cremation/bookings/${booking.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
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

      {/* Details Modal - simplified for this example */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Booking ID:</span> #{selectedBooking.id}
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Pet:</span> {selectedBooking.petName} ({selectedBooking.petType})
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Owner:</span> {selectedBooking.owner.name}
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Date:</span> {selectedBooking.scheduledDate} at {selectedBooking.scheduledTime}
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Service:</span> {selectedBooking.service}
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Status:</span> {selectedBooking.status}
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Total:</span> ₱{parseFloat(selectedBooking.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              {selectedBooking.notes && (
                <p className="text-gray-700 mb-4">
                  <span className="font-medium">Notes:</span> {selectedBooking.notes}
                </p>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationBookingsPage);