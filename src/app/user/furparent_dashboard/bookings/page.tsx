'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';

interface BookingData {
  id: number;
  user_id: number;
  pet_id: number;
  business_service_id: number;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_amount: number;
  special_requests: string;
  created_at: string;
  updated_at: string;
  service_name: string;
  service_description: string;
  service_price: number;
  provider_name: string;
  provider_address: string;
  pet_name: string;
  pet_type: string;
}

interface BookingsPageProps {
  userData?: any;
}

function BookingsPage({ userData }: BookingsPageProps) {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allBookings, setAllBookings] = useState<BookingData[]>([]);
  const [dbCheckResult, setDbCheckResult] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setIsLoading(true);
        console.log('Fetching bookings...');

        // Add a small delay to ensure the skeleton is visible
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Always fetch all bookings
        const response = await fetch('/api/bookings');

        if (!response.ok) {
          console.error('API response not OK:', response.status, response.statusText);
          let errorMessage = `Failed to fetch bookings: ${response.status} ${response.statusText}`;

          try {
            const errorData = await response.json();
            console.error('Error response data:', errorData);
            if (errorData.error) {
              errorMessage = errorData.error;
              if (errorData.details) {
                errorMessage += ` - ${errorData.details}`;
              }
            }
          } catch (parseError) {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Bookings data received:', data);

        // Check if there's a warning message
        if (data.warning) {
          console.warn('API warning:', data.warning);
          // We could display this warning to the user if needed
        }

        const fetchedBookings = data.bookings || [];

        if (fetchedBookings.length === 0) {
          console.log('No bookings found');
        } else {
          console.log(`Found ${fetchedBookings.length} bookings`);
        }

        setAllBookings(fetchedBookings);

        // Apply filter if active
        if (activeFilter) {
          const filtered = fetchedBookings.filter((booking: BookingData) => booking.status === activeFilter);
          console.log(`Filtered to ${filtered.length} ${activeFilter} bookings`);
          setBookings(filtered);
        } else {
          setBookings(fetchedBookings);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (err instanceof Error) {
          setError(err.message || 'Failed to load your bookings. Please try again later.');
        } else {
          setError('An unknown error occurred while fetching bookings.');
        }
        setBookings([]);
        setAllBookings([]);
      } finally {
        // Ensure loading state is shown for at least 1 second
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }

    fetchBookings();
  }, [activeFilter]);

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);

    if (filter) {
      // Apply filter to the already fetched bookings
      setBookings(allBookings.filter(booking => booking.status === filter));
    } else {
      // Show all bookings
      setBookings(allBookings);
    }

    console.log('Filter applied:', filter);
    console.log('Filtered bookings:', filter ? allBookings.filter(booking => booking.status === filter).length : allBookings.length);
  };

  const checkDatabaseConnection = async () => {
    try {
      setIsCheckingDb(true);
      setDbCheckResult(null);

      const response = await fetch('/api/db-check');
      const data = await response.json();

      console.log('Database check result:', data);
      setDbCheckResult(data);

      if (data.status === 'success') {
        // If the database check is successful, try fetching bookings again
        setError(null);
        setIsLoading(true);
        setActiveFilter(activeFilter); // Force a re-fetch
      } else {
        setError(`Database check failed: ${data.message}`);
      }
    } catch (err) {
      console.error('Error checking database:', err);
      if (err instanceof Error) {
        setDbCheckResult({ status: 'error', message: err.message });
      } else {
        setDbCheckResult({ status: 'error', message: 'An unknown error occurred during database check.' });
      }
    } finally {
      setIsCheckingDb(false);
    }
  };

  // Handle viewing booking details
  const handleViewDetails = (booking: BookingData) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  // Handle initiating booking cancellation
  const handleCancelBooking = (booking: BookingData) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  // Handle confirming booking cancellation
  const confirmCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    setCancelSuccess(false);

    try {
      // In a real app, this would be an API call to cancel the booking
      const response = await fetch(`/api/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update the booking status locally
        const updatedBookings = allBookings.map(booking =>
          booking.id === selectedBooking.id
            ? { ...booking, status: 'cancelled' as BookingData['status'] }
            : booking
        );

        setAllBookings(updatedBookings);

        // Apply current filter
        if (activeFilter) {
          setBookings(updatedBookings.filter(booking => booking.status === activeFilter));
        } else {
          setBookings(updatedBookings);
        }

        setCancelSuccess(true);

        // Close the modal after a delay
        setTimeout(() => {
          setShowCancelModal(false);
          setSelectedBooking(null);
        }, 2000);
      } else {
        throw new Error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      // In a real app, we would show an error message
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClipboardDocumentListIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date and time
  const formatDateTime = (date: string, time: string) => {
    if (!date) return 'Not scheduled';

    try {
      // Handle different date formats
      let dateObj;
      if (date.includes('T')) {
        // ISO format
        dateObj = new Date(date);
      } else {
        // YYYY-MM-DD format
        dateObj = new Date(`${date}T${time || '00:00:00'}`);
      }

      return format(dateObj, 'MMM d, yyyy • h:mm a');
    } catch (error) {
      console.error('Error formatting date/time:', error, { date, time });
      return `${date} at ${time || '00:00'}`;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage="bookings" userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--primary-green)] mb-2">My Bookings</h1>
              <p className="text-gray-600">View and manage your service bookings</p>
            </div>
            <div className="mt-4 md:mt-0">
              <a
                href="/user/furparent_dashboard/services"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] transition-all duration-300"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Book New Service
              </a>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange(null)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeFilter === null
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeFilter === 'pending'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => handleFilterChange('confirmed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeFilter === 'confirmed'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => handleFilterChange('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeFilter === 'completed'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => handleFilterChange('cancelled')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeFilter === 'cancelled'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {isLoading ? (
            <FurParentPageSkeleton type="bookings" />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-start">
              <XCircleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <p className="text-red-700 text-sm mt-1">Please try refreshing the page or check your internet connection.</p>

                {dbCheckResult && (
                  <div className="mt-3 p-3 bg-white rounded-md border border-red-100">
                    <h4 className="text-sm font-medium text-gray-900">Database Check Results:</h4>
                    <pre className="mt-1 text-xs text-gray-700 overflow-auto max-h-40">
                      {JSON.stringify(dbCheckResult, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-3 flex justify-end space-x-3">
                  <button
                    onClick={checkDatabaseConnection}
                    disabled={isCheckingDb}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isCheckingDb ? 'Checking...' : 'Check Database'}
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      // Force a re-fetch by changing a state value
                      setActiveFilter(activeFilter);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings found</h3>
              <p className="mt-2 text-gray-600">
                {activeFilter
                  ? `You don't have any ${activeFilter} bookings.`
                  : "You haven't made any bookings yet."}
              </p>
              <div className="mt-6">
                <a
                  href="/user/furparent_dashboard/services"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-md text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] transition-all duration-300"
                >
                  <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                  Browse Services to Book
                </a>
              </div>
            </div>
          ) : (
            bookings.map((booking) => (
              <motion.div
                key={booking.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div className="mb-4 md:mb-0">
                      <div className="flex items-center">
                        <h3 className="text-xl font-semibold text-gray-900 mr-3">
                          {booking.provider_name || 'Service Provider'}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                          <div className="flex items-center">
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </div>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{booking.service_name || 'Service'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[var(--primary-green)]">
                        ₱{booking.total_amount?.toLocaleString() || booking.service_price?.toLocaleString() || '0.00'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(booking.booking_date, booking.booking_time)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Pet Information</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {booking.pet_name ? `${booking.pet_name} (${booking.pet_type})` : 'No pet information'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Service Location</h4>
                        <p className="mt-1 text-sm text-gray-900">{booking.provider_address || 'No address available'}</p>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-500">Special Instructions</h4>
                        <p className="mt-1 text-sm text-gray-900">{booking.special_requests}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 flex items-center"
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </button>
                    )}
                    <button
                      onClick={() => handleViewDetails(booking)}
                      className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-green-hover)] flex items-center"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Booking Details Modal */}
      <Transition appear show={showDetailsModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDetailsModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {selectedBooking && (
                    <>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900 border-b pb-3 mb-4"
                      >
                        Booking Details
                      </Dialog.Title>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Service Information</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-lg font-semibold text-gray-900 mb-1">{selectedBooking.service_name}</p>
                            <p className="text-sm text-gray-600 mb-3">{selectedBooking.service_description}</p>
                            <p className="text-lg font-semibold text-[var(--primary-green)]">
                              ₱{selectedBooking.total_amount?.toLocaleString() || selectedBooking.service_price?.toLocaleString() || '0.00'}
                            </p>
                          </div>

                          <h4 className="text-sm font-medium text-gray-500 mt-4 mb-2">Provider Information</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-lg font-semibold text-gray-900 mb-1">{selectedBooking.provider_name}</p>
                            <div className="flex items-start mt-2">
                              <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="ml-2 text-sm text-gray-600">{selectedBooking.provider_address}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Booking Information</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                              <p className="text-sm text-gray-600">Status</p>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedBooking.status)}`}>
                                <div className="flex items-center">
                                  {getStatusIcon(selectedBooking.status)}
                                  <span className="ml-1 capitalize">{selectedBooking.status}</span>
                                </div>
                              </span>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                              <p className="text-sm text-gray-600">Date & Time</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDateTime(selectedBooking.booking_date, selectedBooking.booking_time)}
                              </p>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                              <p className="text-sm text-gray-600">Booking ID</p>
                              <p className="text-sm font-medium text-gray-900">#{selectedBooking.id}</p>
                            </div>

                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-600">Created On</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(selectedBooking.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <h4 className="text-sm font-medium text-gray-500 mt-4 mb-2">Pet Information</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-lg font-semibold text-gray-900 mb-1">{selectedBooking.pet_name}</p>
                            <p className="text-sm text-gray-600">{selectedBooking.pet_type}</p>
                          </div>
                        </div>
                      </div>

                      {selectedBooking.special_requests && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Special Requests</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">{selectedBooking.special_requests}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-6 flex justify-end">
                        {selectedBooking.status === 'pending' && (
                          <button
                            type="button"
                            className="mr-3 inline-flex justify-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none"
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleCancelBooking(selectedBooking);
                            }}
                          >
                            <XCircleIcon className="h-5 w-5 mr-2" />
                            Cancel Booking
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-[var(--primary-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-green-hover)] focus:outline-none"
                          onClick={() => setShowDetailsModal(false)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Cancel Booking Confirmation Modal */}
      <Transition appear show={showCancelModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isCancelling && setShowCancelModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {cancelSuccess ? (
                    <div className="text-center py-4">
                      <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Booking Cancelled
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-gray-500">
                        Your booking has been successfully cancelled.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                        </div>
                      </div>
                      <Dialog.Title as="h3" className="text-center text-lg font-medium leading-6 text-gray-900">
                        Cancel Booking
                      </Dialog.Title>
                      <div className="mt-3">
                        <p className="text-sm text-gray-500 text-center">
                          Are you sure you want to cancel this booking? This action cannot be undone.
                        </p>
                      </div>

                      <div className="mt-6 flex justify-center space-x-3">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                          onClick={() => setShowCancelModal(false)}
                          disabled={isCancelling}
                        >
                          No, Keep It
                        </button>
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50"
                          onClick={confirmCancelBooking}
                          disabled={isCancelling}
                        >
                          {isCancelling ? (
                            <>
                              <div className="spinner-sm mr-2"></div>
                              Cancelling...
                            </>
                          ) : (
                            'Yes, Cancel'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

// Export the component wrapped with OTP verification
export default withOTPVerification(BookingsPage);