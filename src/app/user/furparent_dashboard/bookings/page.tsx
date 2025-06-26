'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProductionImagePath } from '@/utils/imageUtils';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  CalendarIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  CreditCardIcon,
  StarIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import FurParentDashboardWrapper from '@/components/navigation/FurParentDashboardWrapper';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';
import ReviewModal from '@/components/reviews/ReviewModal';
import ReviewDisplay from '@/components/reviews/ReviewDisplay';
import CremationCertificate from '@/components/certificates/CremationCertificate';
import BookingTimeline from '@/components/booking/BookingTimeline';
import { RefundButton } from '@/components/refund';

interface BookingData {
  id: number;
  user_id: number;
  pet_id?: number;
  provider_id?: number;
  package_id?: number;
  business_service_id?: number;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  total_amount?: number;
  price?: number;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  service_name: string;
  service_price: number;
  provider_name: string;
  provider_address: string;
  pet_name: string;
  pet_type: string;
  pet_breed?: string;
  pet_image_url?: string;
  cause_of_death?: string;
  payment_method?: string;
  payment_status?: 'not_paid' | 'partially_paid' | 'paid' | 'refunded';
  delivery_option?: string;
  delivery_address?: string;
  delivery_distance?: number;
  delivery_fee?: number;
  first_name?: string;
  last_name?: string;
}

interface BookingsPageProps {
  userData?: any;
}

const BookingsPage: React.FC<BookingsPageProps> = ({ userData }) => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allBookings, setAllBookings] = useState<BookingData[]>([]);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  // Debug userData and track loading state
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  useEffect(() => {
    console.log('🔍 [BookingsPage] userData received:', userData);
    console.log('🔍 [BookingsPage] userData.id:', userData?.id);
    console.log('🔍 [BookingsPage] userData.user_id:', userData?.user_id);
    console.log('🔍 [BookingsPage] userData type:', typeof userData);

    if (userData && (userData.id || userData.user_id)) {
      setUserDataLoaded(true);
      setCurrentUserData(userData);
    } else {
      // Try to get user data from session storage as fallback
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        try {
          const parsedData = JSON.parse(cachedUserData);
          console.log('🔍 [BookingsPage] Using cached userData:', parsedData);
          setCurrentUserData(parsedData);
          setUserDataLoaded(true);
        } catch (error) {
          console.error('Error parsing cached user data:', error);
        }
      }
    }
  }, [userData]);

  // Check for success parameter in URL
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const bookingId = searchParams.get('bookingId');
    const showReview = searchParams.get('showReview');

    if (success === 'true' && bookingId) {
      setShowSuccessMessage(true);
      setSuccessBookingId(bookingId);

      // Clear the URL parameters after a delay
      setTimeout(() => {
        router.replace('/user/furparent_dashboard/bookings');
      }, 5000);

      // Auto-hide the success message after some time
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 8000);
    } else if (bookingId && !success) {
      // Handle notification clicks - find and show the booking details modal
      const bookingIdNum = parseInt(bookingId);
      if (!isNaN(bookingIdNum)) {
        // Wait for bookings to load, then open the modal
        const checkAndOpenModal = () => {
          const booking = allBookings.find(b => b.id === bookingIdNum);
          if (booking) {
            setSelectedBooking(booking);
            if (showReview === 'true') {
              setShowReviewModal(true);
            } else {
              setShowDetailsModal(true);
            }
            // Clear the URL parameters
            router.replace('/user/furparent_dashboard/bookings', { scroll: false });
          } else if (allBookings.length > 0) {
            // Bookings are loaded but booking not found
            console.warn('Booking not found:', bookingIdNum);
            router.replace('/user/furparent_dashboard/bookings', { scroll: false });
          }
          // If allBookings is empty, we'll try again when it loads
        };

        checkAndOpenModal();
      }
    }
  }, [searchParams, router, allBookings]);

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelledBookingIds, setCancelledBookingIds] = useState<number[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<number[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setIsLoading(true);

        // Add a small delay to ensure the skeleton is visible
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Always fetch all bookings with credentials to ensure cookies are sent
        const response = await fetch('/api/bookings', {
          credentials: 'include' // This ensures cookies (including auth_token) are sent with the request
        });

        if (!response.ok) {
          let errorMessage = `Failed to fetch bookings: ${response.status} ${response.statusText}`;

          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
              if (errorData.details) {
                errorMessage += ` - ${errorData.details}`;
              }
            }
          } catch {
            // Error parsing response
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Check if there's a warning message
        if (data.warning) {
          // We could display this warning to the user if needed
        }

        const fetchedBookings = data.bookings || [];

        if (fetchedBookings.length === 0) {
        } else {
        }

        setAllBookings(fetchedBookings);

        // Apply filter if active
        if (activeFilter) {
          const filtered = fetchedBookings.filter((booking: BookingData) => booking.status === activeFilter);
          setBookings(filtered);
        } else {
          setBookings(fetchedBookings);
        }

        // Check which completed bookings have reviews
        const completedBookings = fetchedBookings.filter(
          (booking: BookingData) => booking.status === 'completed'
        );

        if (completedBookings.length > 0) {
          checkReviewedBookings(completedBookings);
        }

        setError(null);
      } catch (err) {
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
  }, [activeFilter, refreshCounter]);

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);

    if (filter) {
      // Apply filter to the already fetched bookings
      setBookings(allBookings.filter(booking => booking.status === filter));
    } else {
      // Show all bookings
      setBookings(allBookings);
    }

  };

  // Check which bookings have reviews
  const checkReviewedBookings = async (bookings: BookingData[]) => {
    try {
      const reviewedIds: number[] = [];

      // Check each booking for reviews
      for (const booking of bookings) {
        const response = await fetch(`/api/reviews/booking/${booking.id}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasReview) {
            reviewedIds.push(booking.id);
          }
        }
      }

      setReviewedBookingIds(reviewedIds);
    } catch (error) {
      console.error('Error checking reviewed bookings:', error);
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      setIsCheckingDb(true);

      const response = await fetch('/api/db-check', {
        credentials: 'include' // This ensures cookies (including auth_token) are sent with the request
      });
      const data = await response.json();

      if (data.status === 'success') {
        // If the database check is successful, try fetching bookings again
        setError(null);
        setIsLoading(true);
        setActiveFilter(activeFilter); // Force a re-fetch
      } else {
        // Just retry loading the bookings without showing error details
        setError(null);
        setIsLoading(true);
        setActiveFilter(activeFilter); // Force a re-fetch
      }
    } catch {
      // Just retry loading the bookings without showing error details
      setError(null);
      setIsLoading(true);
      setActiveFilter(activeFilter); // Force a re-fetch
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
    // Reset cancel success state when opening the modal
    setCancelSuccess(false);
    setShowCancelModal(true);
  };

  // Handle confirming booking cancellation
  const confirmCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    setCancelSuccess(false);

    try {
      // Make API call to cancel the booking with credentials to ensure cookies are sent
      const response = await fetch(`/api/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // This ensures cookies (including auth_token) are sent with the request
      });

      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage = 'Failed to cancel booking';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      // Update the booking status locally
      const updatedBookings = allBookings.map(booking =>
        booking.id === selectedBooking.id
          ? {
              ...booking,
              status: 'cancelled' as BookingData['status'],
              payment_status: responseData.refund ? 'refunded' as BookingData['payment_status'] : booking.payment_status
            }
          : booking
      );

      setAllBookings(updatedBookings);

      // Apply current filter
      if (activeFilter) {
        setBookings(updatedBookings.filter(booking => booking.status === activeFilter));
      } else {
        setBookings(updatedBookings);
      }

      // Mark this booking as successfully cancelled
      setCancelSuccess(true);

      // Add this booking ID to the list of cancelled bookings
      if (selectedBooking.id) {
        setCancelledBookingIds(prev => [...prev, selectedBooking.id]);
      }

      // Close the modal after a delay
      setTimeout(() => {
        setShowCancelModal(false);
        setSelectedBooking(null);
      }, 2000);
    } catch (error) {
      // Show error message to the user
      setError(error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.');

      // Close the cancel modal and show the error
      setShowCancelModal(false);

      // Clear the error after a few seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle refund request
  const handleRefundRequested = () => {
    // Refresh bookings to get updated status
    setIsLoading(true);
    // Force a re-fetch by incrementing the refresh counter
    setRefreshCounter(prev => prev + 1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-orange-500" />;
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
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_paid':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'partially_paid':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'not_paid':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'refunded':
        return <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format date and time
  const formatDateTime = (date: string, time: string) => {
    if (!date) return 'Not scheduled';

    try {
      // Log the input for debugging
      console.log('Formatting date and time:', { date, time });

      // Normalize the time string
      const timeString = time || '00:00:00';

      // Parse the date components manually to avoid timezone issues
      // This is the most reliable way to handle dates consistently
      const [year, month, day] = date.split('-').map(Number);

      // Validate date components
      if (isNaN(year) || isNaN(month) || isNaN(day) ||
          month < 1 || month > 12 || day < 1 || day > 31) {
        console.error('Invalid date components:', { year, month, day });
        throw new Error('Invalid date components');
      }

      // Parse time components
      const [hours, minutes] = timeString.split(':').map(Number);

      // Create date object with local timezone (months are 0-indexed in JS)
      // This approach avoids timezone issues by explicitly setting each component
      const dateObj = new Date(year, month - 1, day,
                              isNaN(hours) ? 0 : hours,
                              isNaN(minutes) ? 0 : minutes);

      // Validate the date object
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date object created:', dateObj);
        throw new Error('Invalid date object');
      }

      // Log the parsed date for debugging
      console.log('Parsed date object:', dateObj, 'Year:', year, 'Month:', month, 'Day:', day);
      console.log('Formatted date:', format(dateObj, 'MMM d, yyyy • h:mm a'));

      // Format the date consistently
      return format(dateObj, 'MMM d, yyyy • h:mm a');
    } catch (error) {
      console.error('Date formatting error:', error, { date, time });

      // Fallback: Try a different approach for parsing
      try {
        // Try to create a date string that's unambiguous
        const dateTimeString = `${date}T${time || '00:00:00'}`;
        const fallbackDate = new Date(dateTimeString);

        if (!isNaN(fallbackDate.getTime())) {
          console.log('Fallback date parsing succeeded:', fallbackDate);
          return format(fallbackDate, 'MMM d, yyyy • h:mm a');
        }
      } catch (fallbackError) {
        console.error('Fallback date parsing failed:', fallbackError);
      }

      // If all else fails, return a formatted string
      return `${date} at ${time || '00:00'}`;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation is now handled by layout */}

      {/* Main Content wrapped with FurParentDashboardWrapper */}
      <FurParentDashboardWrapper userData={userData}>
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
              <Link
                href="/user/furparent_dashboard/services"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] transition-all duration-300"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Book New Service
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Success Message */}
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start"
          >
            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-green-800 font-medium">Booking successfully created!</p>
              <p className="text-green-700 text-sm mt-1">
                Your booking (ID: {successBookingId}) has been confirmed. You can view the details below.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </motion.div>
        )}

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
              onClick={() => handleFilterChange('in_progress')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeFilter === 'in_progress'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              In Progress
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
                <p className="text-red-800 font-medium">Database connection error</p>
                <p className="text-red-700 text-sm mt-1">We&apos;re having trouble connecting to our database. This is usually a temporary issue.</p>

                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={checkDatabaseConnection}
                    disabled={isCheckingDb}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isCheckingDb ? 'Checking...' : 'Check Connection'}
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      // Force a re-fetch by changing a state value
                      setActiveFilter(activeFilter);
                    }}
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-green-hover)] transition-colors"
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
                <Link
                  href="/user/furparent_dashboard/services"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-md text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] transition-all duration-300"
                >
                  <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                  Browse Services to Book
                </Link>
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
                          {booking.provider_name && booking.provider_name !== 'Service Provider'
                            ? booking.provider_name
                            : (booking.provider_name || 'Service Provider')}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                          <div className="flex items-center">
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status.replace('_', ' ')}</span>
                          </div>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{booking.service_name || 'Service'}</p>

                      {/* Mini Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                booking.status === 'cancelled'
                                  ? 'bg-red-500'
                                  : 'bg-[var(--primary-green)]'
                              }`}
                              style={{
                                width: booking.status === 'pending' ? '20%' :
                                       booking.status === 'confirmed' ? '40%' :
                                       booking.status === 'in_progress' ? '70%' :
                                       booking.status === 'completed' ? '100%' :
                                       booking.status === 'cancelled' ? '100%' : '0%'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[var(--primary-green)]">
                        ₱{(booking.total_amount || booking.price || booking.service_price || 0).toLocaleString()}
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
                          {booking.pet_name && booking.pet_name !== 'Pet' && booking.pet_name !== 'Unknown' ?
                            `${booking.pet_name}${booking.pet_type && booking.pet_type !== 'Unknown' ? ` (${booking.pet_type})` : ''}` :
                            'Pet information not available'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Service Location</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {booking.provider_address && booking.provider_address !== 'Provider Address' && booking.provider_address !== 'Service Address' ?
                            booking.provider_address :
                            (booking.provider_name && booking.provider_name !== 'Service Provider' ?
                              booking.provider_name : 'Location information not available')}
                        </p>
                      </div>
                    </div>

                    {booking.special_requests && booking.special_requests !== 'asdasdasd' && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-500">Special Instructions</h4>
                        <p className="mt-1 text-sm text-gray-900">{booking.special_requests}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3 flex-wrap gap-2">
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 flex items-center"
                        disabled={cancelledBookingIds.includes(booking.id)}
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        {cancelledBookingIds.includes(booking.id) ? 'Cancelled' : 'Cancel Booking'}
                      </button>
                    )}
                    {/* Refund Button - Show only for cancelled paid bookings */}
                    {booking.payment_status === 'paid' && booking.status === 'cancelled' && (
                      <RefundButton
                        booking={{
                          id: booking.id,
                          pet_name: booking.pet_name,
                          booking_date: booking.booking_date,
                          booking_time: booking.booking_time,
                          price: booking.price || booking.service_price || 0,
                          payment_method: booking.payment_method || 'cash',
                          status: booking.status,
                          payment_status: booking.payment_status || 'not_paid'
                        }}
                        onRefundRequested={handleRefundRequested}
                        size="sm"
                        variant="outline"
                      />
                    )}
                    {booking.status === 'completed' && !reviewedBookingIds.includes(booking.id) && (currentUserData?.id || currentUserData?.user_id) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 border border-blue-300 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50 flex items-center"
                      >
                        <StarIcon className="h-4 w-4 mr-2" />
                        Leave Review
                      </button>
                    )}
                    {booking.status === 'completed' && reviewedBookingIds.includes(booking.id) && (
                      <div className="px-4 py-2 bg-green-50 text-green-700 rounded-md text-sm font-medium flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Reviewed
                      </div>
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
      </FurParentDashboardWrapper>

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
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                  {selectedBooking && (
                    <>
                      {/* Header */}
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <Dialog.Title
                              as="h1"
                              className="text-xl font-semibold text-gray-900"
                            >
                              Booking Details
                            </Dialog.Title>
                            <p className="text-sm text-gray-600 mt-1">
                              Booking #{selectedBooking.id} • {formatDateTime(selectedBooking.booking_date, selectedBooking.booking_time)}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowDetailsModal(false)}
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
                            aria-label="Close modal"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Hero Section - Pet Information with Picture */}
                        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-lg border border-green-100 p-8">
                          <div className="flex items-start space-x-8">
                            {/* Pet Picture */}
                            <div className="flex-shrink-0">
                              <div className="relative">
                                <div className="w-32 h-32 bg-white rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                                  {selectedBooking.pet_image_url ? (
                                    <Image
                                      src={getProductionImagePath(selectedBooking.pet_image_url)}
                                      alt={selectedBooking.pet_name}
                                      width={128}
                                      height={128}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                {/* Status Badge Overlay */}
                                <div className="absolute -top-1 -right-1">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-lg ${getStatusClass(selectedBooking.status)}`}>
                                    {getStatusIcon(selectedBooking.status)}
                                    <span className="ml-1 capitalize">{selectedBooking.status.replace('_', ' ')}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Pet Details */}
                            <div className="flex-1">
                              <div className="mb-6">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedBooking.pet_name}</h2>
                                <p className="text-lg text-gray-600">Booking #{selectedBooking.id}</p>
                              </div>

                              <div className="grid grid-cols-1 gap-4">
                                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-600">Service Date</p>
                                      <p className="text-base font-semibold text-gray-900">{formatDateTime(selectedBooking.booking_date, selectedBooking.booking_time)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Progress Timeline Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                          <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Progress</h2>
                            <p className="text-gray-600">Track your pet&apos;s service journey with us</p>
                          </div>
                          <div className="max-w-4xl mx-auto">
                            <BookingTimeline
                              currentStatus={selectedBooking.status as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'}
                              className="border-0 bg-transparent p-0"
                            />
                          </div>
                        </div>

                                                {/* Content Grid - Responsive Layout */}
                        <div className="space-y-6">
                          {/* Top Row - Primary Information (Always Full Width) */}
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Service Information Card */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                              <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Service Information</h2>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h3 className="text-base font-medium text-gray-900 mb-1">{selectedBooking.service_name}</h3>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Service Price</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      ₱{((selectedBooking.service_price || selectedBooking.price || 0) as number).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Add-ons Section */}
                                  {(selectedBooking as any).extras && Array.isArray((selectedBooking as any).extras) && (selectedBooking as any).extras.length > 0 && (
                                    <>
                                      <div className="border-t border-gray-200 pt-3">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Add-ons</h4>
                                        <div className="space-y-2">
                                          {(selectedBooking as any).extras.map((addon: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center pl-3">
                                              <span className="text-sm text-gray-600">{addon.name}</span>
                                              <span className="text-sm font-medium text-gray-900">
                                                ₱{parseFloat(addon.price).toLocaleString()}
                                              </span>
                                            </div>
                                          ))}
                                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Add-ons Subtotal</span>
                                            <span className="text-sm font-medium text-gray-900">
                                              ₱{((selectedBooking as any).extras_total || (selectedBooking as any).extras?.reduce((sum: number, item: any) => sum + Number(item.price), 0) || 0).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {selectedBooking.delivery_fee && selectedBooking.delivery_fee > 0 && (
                                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                      <span className="text-sm text-gray-600">Delivery Fee</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        ₱{selectedBooking.delivery_fee.toLocaleString()}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                                    <span className="text-base font-semibold text-gray-900">Total Amount</span>
                                    <span className="text-xl font-bold text-[var(--primary-green)]">
                                      ₱{(
                                         Number(selectedBooking.total_amount || 0) ||
                                         (Number(selectedBooking.service_price || selectedBooking.price || 0) +
                                          Number((selectedBooking as any).extras_total || 0) +
                                          Number(selectedBooking.delivery_fee || 0))
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Booking Information Card */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                              <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Booking Information</h2>
                              </div>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Date & Time</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatDateTime(selectedBooking.booking_date, selectedBooking.booking_time)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Booking ID</span>
                                    <span className="text-sm font-medium text-gray-900">#{selectedBooking.id}</span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Created On</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {new Date(selectedBooking.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Second Row - Provider and Payment Information */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Provider Information Card */}
                            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                              <h2 className="text-lg font-semibold text-gray-900 mb-4">Provider Information</h2>
                              <div className="space-y-3">
                                <div>
                                  <h3 className="text-base font-medium text-gray-900">
                                    {selectedBooking.provider_name && selectedBooking.provider_name !== 'Service Provider'
                                      ? selectedBooking.provider_name
                                      : (selectedBooking.provider_name || 'Service Provider')}
                                  </h3>
                                </div>
                                {selectedBooking.provider_address &&
                                 selectedBooking.provider_address !== 'Service Address' &&
                                 selectedBooking.provider_address !== 'Provider Address' ? (
                                  <div className="flex items-start">
                                    <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <p className="ml-2 text-sm text-gray-600">{selectedBooking.provider_address}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Address information not available</p>
                                )}
                              </div>
                            </div>

                            {/* Delivery & Payment Card */}
                            {(selectedBooking.payment_method || selectedBooking.delivery_option) && (
                              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery & Payment</h2>
                                <div className="space-y-4">
                                  {selectedBooking.delivery_option && (
                                    <div>
                                      <h3 className="text-sm font-medium text-gray-700 mb-2">Delivery Option</h3>
                                      <p className="text-base font-medium text-gray-900 capitalize mb-2">
                                        {selectedBooking.delivery_option}
                                      </p>

                                      {selectedBooking.delivery_option === 'delivery' && selectedBooking.delivery_address && (
                                        <div className="bg-gray-50 rounded-lg p-3">
                                          <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address</p>
                                          <p className="text-sm text-gray-900">{selectedBooking.delivery_address}</p>
                                          {selectedBooking.delivery_distance && selectedBooking.delivery_distance > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              Distance: {selectedBooking.delivery_distance.toFixed(1)} km
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {selectedBooking.payment_method && (
                                    <div>
                                      <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
                                      <div className="flex items-center mb-2">
                                        {selectedBooking.payment_method === 'cash' ? (
                                          <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
                                        ) : (
                                          <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                                        )}
                                        <span className="text-base font-medium text-gray-900 capitalize">
                                          {selectedBooking.payment_method}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {selectedBooking.payment_status && (
                                    <div>
                                      <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Status</h3>
                                      <div className="flex items-center mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusClass(selectedBooking.payment_status)}`}>
                                          <div className="flex items-center">
                                            {getPaymentStatusIcon(selectedBooking.payment_status)}
                                            <span className="ml-1 capitalize">{selectedBooking.payment_status.replace('_', ' ')}</span>
                                          </div>
                                        </span>
                                      </div>

                                      {selectedBooking.payment_method === 'gcash' && selectedBooking.payment_status === 'paid' && (
                                        <p className="text-xs text-green-600 bg-green-50 rounded-lg p-2">
                                          GCash payments are automatically marked as paid
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Special Requests Card */}
                        {selectedBooking.special_requests && selectedBooking.special_requests !== 'asdasdasd' && (
                          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h2>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm text-gray-700">{selectedBooking.special_requests}</p>
                            </div>
                          </div>
                        )}

                        {/* Review Section - Only show for completed bookings */}
                        {selectedBooking.status === 'completed' && (
                          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Review</h2>
                            {reviewedBookingIds.includes(selectedBooking.id) ? (
                              (currentUserData?.id || currentUserData?.user_id) && <ReviewDisplay bookingId={selectedBooking.id} userId={currentUserData.id || currentUserData.user_id} />
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-4">You haven&apos;t reviewed this booking yet. Your feedback helps other pet parents make informed decisions.</p>
                                {currentUserData && (currentUserData.id || currentUserData.user_id) ? (
                                  <button
                                    onClick={() => {
                                      console.log('Review button clicked, currentUserData:', currentUserData);
                                      console.log('User ID:', currentUserData.id || currentUserData.user_id);
                                      setShowDetailsModal(false);
                                      setTimeout(() => {
                                        setShowReviewModal(true);
                                      }, 300);
                                    }}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                                  >
                                    <StarIcon className="h-4 w-4 mr-2" />
                                    Leave a Review
                                  </button>
                                ) : userDataLoaded ? (
                                  <p className="text-sm text-gray-500">Please log in to leave a review.</p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-sm text-gray-500">Loading user information...</p>
                                    {/* Debug info - remove in production */}
                                    <p className="text-xs text-gray-400">
                                      Debug: userData={userData ? 'exists' : 'null'}, currentUserData={currentUserData ? 'exists' : 'null'}, id={currentUserData?.id || 'undefined'}, user_id={currentUserData?.user_id || 'undefined'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Certificate Section - Only show for completed bookings */}
                        {selectedBooking.status === 'completed' && (
                          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cremation Certificate</h2>
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <DocumentCheckIcon className="h-6 w-6 text-green-600 mr-3" />
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900">Official Certificate Available</h3>
                                    <p className="text-xs text-gray-600">Download your cremation certificate as a keepsake</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setShowCertificateModal(true);
                                  }}
                                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                                >
                                  <DocumentCheckIcon className="h-4 w-4 mr-2" />
                                  View Certificate
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 mt-6 -mx-6 -mb-6 rounded-b-2xl">
                        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                          {selectedBooking.status === 'pending' && !cancelledBookingIds.includes(selectedBooking.id) && (
                            <button
                              type="button"
                              className="inline-flex justify-center items-center rounded-lg border border-red-300 bg-white px-6 py-3 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                              onClick={() => {
                                setShowDetailsModal(false);
                                handleCancelBooking(selectedBooking);
                              }}
                            >
                              <XCircleIcon className="h-5 w-5 mr-2" />
                              Cancel Booking
                            </button>
                          )}
                          {selectedBooking.status === 'pending' && cancelledBookingIds.includes(selectedBooking.id) && (
                            <div className="inline-flex items-center rounded-lg border border-green-300 px-6 py-3 text-sm font-medium text-green-700 bg-green-50">
                              <CheckCircleIcon className="h-5 w-5 mr-2" />
                              Cancellation Pending
                            </div>
                          )}
                          {/* Refund Button in Modal - Show only for cancelled paid bookings */}
                          {selectedBooking.payment_status === 'paid' && selectedBooking.status === 'cancelled' && (
                            <RefundButton
                              booking={{
                                id: selectedBooking.id,
                                pet_name: selectedBooking.pet_name,
                                booking_date: selectedBooking.booking_date,
                                booking_time: selectedBooking.booking_time,
                                price: selectedBooking.price || selectedBooking.service_price || 0,
                                payment_method: selectedBooking.payment_method || 'cash',
                                status: selectedBooking.status,
                                payment_status: selectedBooking.payment_status || 'not_paid'
                              }}
                              onRefundRequested={() => {
                                handleRefundRequested();
                                setShowDetailsModal(false);
                              }}
                              size="md"
                              variant="outline"
                              className="inline-flex justify-center items-center rounded-lg px-6 py-3"
                            />
                          )}
                          <button
                            type="button"
                            className="inline-flex justify-center items-center rounded-lg border border-transparent bg-[var(--primary-green)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                            onClick={() => setShowDetailsModal(false)}
                          >
                            Close
                          </button>
                        </div>
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
                  {selectedBooking && cancelSuccess ? (
                    <div className="text-center py-4">
                      <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Booking Cancelled
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-gray-500">
                        Your booking (ID: {selectedBooking.id}) has been successfully cancelled.
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

      {/* Review Modal */}
      {selectedBooking && currentUserData && (currentUserData.id || currentUserData.user_id) && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          bookingId={selectedBooking.id}
          userId={currentUserData.id || currentUserData.user_id}
          providerId={selectedBooking.provider_id || 0}
          providerName={selectedBooking.provider_name || 'Service Provider'}
          onSuccess={() => {
            console.log('Review submitted successfully');
            // Add the booking ID to the list of reviewed bookings
            if (selectedBooking && selectedBooking.id) {
              setReviewedBookingIds(prev => [...prev, selectedBooking.id]);
            }
            setShowReviewModal(false);
            // Refresh the bookings list
            setActiveFilter(activeFilter);
          }}
        />
      )}

      {/* Certificate Modal */}
      {selectedBooking && showCertificateModal && (
        <CremationCertificate
          booking={selectedBooking}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
};

// Export the component directly (OTP verification is now handled by layout)
export default BookingsPage;