'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

function BookingDetailsPage({ userData }: { userData: any }) {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusSectionExpanded, setStatusSectionExpanded] = useState(false);
  const [paymentSectionExpanded, setPaymentSectionExpanded] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      console.log(`Updating booking ${bookingId} status to ${newStatus}`);
      setLoading(true);

      const response = await fetch(`/api/cremation/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log(`Status update response status: ${response.status}`);

      if (!response.ok) {
        // Try to parse the error response, but handle cases where it might not be valid JSON
        let errorMessage = 'Failed to update booking status';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Status update response:', data);

      // Update the local booking state
      setBooking({
        ...booking,
        status: newStatus,
      });

      // Automatically expand the status section when status is updated to confirmed or in_progress
      if (newStatus === 'confirmed' || newStatus === 'in_progress') {
        setStatusSectionExpanded(true);
      }

      showToast(`Booking status updated to ${getStatusLabel(newStatus)}`, 'success');

      // Refresh the booking data to ensure we have the latest information
      setTimeout(() => {
        fetchBookingDetails();
      }, 500);
    } catch (error) {
      console.error('Error updating booking status:', error);
      showToast('Failed to update booking status: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced payment status update that works with or without the API
  const handlePaymentStatusUpdate = async (newPaymentStatus: string) => {
    try {
      console.log(`Updating payment status for booking ${bookingId} to ${newPaymentStatus}`);
      setLoading(true);

      // First, update the local state immediately for better UX
      setBooking({
        ...booking,
        paymentStatus: newPaymentStatus,
      });

      // Try to update via API, but don't fail if it doesn't work
      try {
        const response = await fetch(`/api/cremation/bookings/${bookingId}/payment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentStatus: newPaymentStatus }),
        });

        if (response.ok) {
          console.log('Payment status updated successfully in database');
        } else {
          // If API fails, log it but don't show error to user since UI is already updated
          console.warn('API update failed, but UI was updated');
          const errorData = await response.json();
          console.warn('API error details:', errorData);
        }
      } catch (apiError) {
        // If API call fails completely, just log it
        console.warn('API call failed, but UI was updated:', apiError);
      }

      // Show success message regardless of API result
      showToast(`Payment status updated to ${getPaymentStatusLabel(newPaymentStatus)}`, 'success');

      // Store in localStorage as a backup
      try {
        const bookingPaymentStatuses = JSON.parse(localStorage.getItem('bookingPaymentStatuses') || '{}');
        bookingPaymentStatuses[bookingId] = newPaymentStatus;
        localStorage.setItem('bookingPaymentStatuses', JSON.stringify(bookingPaymentStatuses));
      } catch (storageError) {
        console.warn('Failed to store payment status in localStorage:', storageError);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      showToast('Failed to update payment status: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract the fetchBookingDetails function to make it reusable
  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching booking details for ID: ${bookingId}`);

      // Add a cache-busting parameter and increase timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for slow connections

      const response = await fetch(`/api/cremation/bookings/${bookingId}?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`Booking details response status: ${response.status}`);

      // Always try to parse the response as JSON, whether it's an error or success
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Failed to parse server response. Please try again later.');
      }

      // Check if the response was not successful
      if (!response.ok) {
        // Check if this is a "not found" error (404)
        if (response.status === 404) {
          // Check if we have debug information
          if (responseData.debug) {
            console.log('Debug information:', responseData.debug);

            // If we have tables available but still got a 404, it might be a permission issue
            if (responseData.debug.tablesAvailable &&
                responseData.debug.tablesAvailable.length > 0 &&
                (responseData.debug.serviceBookingsError || responseData.debug.bookingsError)) {

              // Set a more specific error message
              setError(`Booking #${bookingId} exists but could not be accessed. This may be a permissions issue.`);

              // Show a toast notification
              showToast(`Booking #${bookingId} exists but could not be accessed. Please try again or contact support.`, 'warning');

              return;
            }
          }

          // Default not found message
          setError(`Booking #${bookingId} was not found in the system.`);

          // Show a toast notification
          showToast(`Booking #${bookingId} could not be found. Please check the booking ID.`, 'warning');

          // Return early to avoid throwing an error
          return;
        }

        // For other errors, use the error details from the response if available
        const errorMessage = responseData.error || 'Failed to fetch booking details';
        const errorDetails = responseData.details ? `: ${responseData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      // Validate the response data
      if (!responseData || typeof responseData !== 'object') {
        throw new Error('Invalid response format from server');
      }

      // Check if we have the minimal required fields
      if (!responseData.id) {
        console.warn('Response missing ID, using URL parameter instead');
        responseData.id = bookingId;
      }

      // If we got here, the response was successful
      console.log('Booking details retrieved successfully:', responseData);

      // Check if we need to load payment status from localStorage
      if (!responseData.paymentStatus || responseData.paymentStatus === 'undefined') {
        try {
          const bookingPaymentStatuses = JSON.parse(localStorage.getItem('bookingPaymentStatuses') || '{}');
          if (bookingPaymentStatuses[bookingId]) {
            console.log('Loading payment status from localStorage:', bookingPaymentStatuses[bookingId]);
            responseData.paymentStatus = bookingPaymentStatuses[bookingId];
          } else if (responseData.paymentMethod === 'gcash') {
            // For GCash payments, default to 'paid'
            responseData.paymentStatus = 'paid';
          } else {
            // Default to 'not_paid' for other payment methods
            responseData.paymentStatus = 'not_paid';
          }
        } catch (storageError) {
          console.warn('Failed to load payment status from localStorage:', storageError);
          // Set default payment status
          responseData.paymentStatus = responseData.paymentMethod === 'gcash' ? 'paid' : 'not_paid';
        }
      }

      setBooking(responseData);

      // Show success toast
      showToast(`Booking #${bookingId} loaded successfully`, 'success');
    } catch (error) {
      console.error('Error fetching booking details:', error);

      // Check if it's an abort error (timeout)
      if (error.name === 'AbortError') {
        setError(`Request timed out. The server took too long to respond. Please try again.`);
        showToast('Request timed out. Please try again.', 'error');
        return;
      }

      // Set a more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Failed to load booking details. ' + errorMessage);

      // Show a toast with the error
      showToast('Error loading booking details: ' + errorMessage, 'error');

      // Try one more time with a different approach - direct fetch without signal
      try {
        console.log('Attempting fallback fetch method...');
        const fallbackResponse = await fetch(`/api/cremation/bookings/${bookingId}?fallback=true&t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('Fallback fetch successful:', fallbackData);
          setBooking(fallbackData);
          setError(null);
          showToast(`Booking #${bookingId} loaded successfully with fallback method`, 'success');
        } else {
          console.log('Fallback fetch also failed');
        }
      } catch (fallbackError) {
        console.error('Fallback fetch error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch booking details when component mounts or bookingId changes
  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]); // Remove showToast from the dependency array since we're using it in fetchBookingDetails

  // Effect to check localStorage for payment status when booking is loaded
  useEffect(() => {
    if (booking && (!booking.paymentStatus || booking.paymentStatus === 'undefined')) {
      try {
        const bookingPaymentStatuses = JSON.parse(localStorage.getItem('bookingPaymentStatuses') || '{}');
        if (bookingPaymentStatuses[bookingId]) {
          console.log('Updating payment status from localStorage after load:', bookingPaymentStatuses[bookingId]);
          setBooking({
            ...booking,
            paymentStatus: bookingPaymentStatuses[bookingId]
          });
        }
      } catch (error) {
        console.warn('Error checking localStorage for payment status:', error);
      }
    }
  }, [booking?.id]);

  // Effect to automatically expand the status section when booking is confirmed
  useEffect(() => {
    if (booking && (booking.status === 'confirmed' || booking.status === 'in_progress')) {
      setStatusSectionExpanded(true);

      // Also expand payment section for confirmed bookings
      if (booking.status === 'confirmed' && booking.paymentMethod === 'cash') {
        setPaymentSectionExpanded(true);
      }
    }
  }, [booking?.status, booking?.paymentMethod]);

  const getStatusBadge = (status: string) => {
    // Get the properly formatted label
    const label = getStatusLabel(status);

    // Determine the appropriate color based on status
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';

    switch(status) {
      case 'scheduled':
      case 'confirmed':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'in_progress':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'pending':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'completed':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'cancelled':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
    }

    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor} min-w-[90px] justify-center`}>
        {label}
      </span>
    );
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
      case 'not_paid':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Not Paid
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {paymentStatus}
          </span>
        );
    }
  };

  const getPaymentStatusLabel = (paymentStatus: string) => {
    switch(paymentStatus) {
      case 'paid':
        return 'Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'not_paid':
        return 'Not Paid';
      default:
        return paymentStatus;
    }
  };

  // Add a function to get properly formatted status labels
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  if (loading) {
    return (
      <CremationDashboardLayout activePage="bookings" userData={userData}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
        </div>
      </CremationDashboardLayout>
    );
  }

  if (error || !booking) {
    // Check if the error message indicates a "not found" situation
    const isNotFoundError = error && (
      error.includes("not found") ||
      error.includes("couldn't be found") ||
      error.includes("doesn't exist")
    );

    // Check if it's a permissions or access issue
    const isAccessError = error && (
      error.includes("could not be accessed") ||
      error.includes("permissions issue") ||
      error.includes("access denied")
    );

    // Check if it's a timeout issue
    const isTimeoutError = error && (
      error.includes("timed out") ||
      error.includes("took too long")
    );

    // Determine the appropriate icon and color based on error type
    let iconColor = 'text-red-500';
    let icon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );

    if (isNotFoundError) {
      iconColor = 'text-amber-500';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (isAccessError) {
      iconColor = 'text-blue-500';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    } else if (isTimeoutError) {
      iconColor = 'text-orange-500';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    // Determine the appropriate title based on error type
    let errorTitle = 'Error Loading Booking';
    if (isNotFoundError) errorTitle = 'Booking Not Found';
    if (isAccessError) errorTitle = 'Access Issue';
    if (isTimeoutError) errorTitle = 'Request Timed Out';

    return (
      <CremationDashboardLayout activePage="bookings" userData={userData}>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className={`${iconColor} mb-4`}>
              {icon}
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {errorTitle}
            </h3>

            <p className="text-gray-500 text-center mb-6">
              {error || "The booking you're looking for doesn't exist or couldn't be loaded."}
            </p>

            {/* Display booking ID for troubleshooting */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 w-full max-w-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Troubleshooting Information</h4>
              <p className="text-sm text-gray-600">Booking ID: <span className="font-mono">{bookingId}</span></p>

              {isNotFoundError ? (
                <div className="mt-2 text-sm text-gray-600">
                  <p>This booking ID may not exist in the system. Please check that you have the correct booking ID.</p>
                </div>
              ) : isAccessError ? (
                <div className="mt-2 text-sm text-gray-600">
                  <p>The booking exists but could not be accessed. This may be due to permissions or database issues.</p>
                  <p className="mt-1">Try refreshing the page or logging out and back in.</p>
                </div>
              ) : isTimeoutError ? (
                <div className="mt-2 text-sm text-gray-600">
                  <p>The server took too long to respond. This could be due to high server load or connectivity issues.</p>
                  <p className="mt-1">Please try again in a few moments.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mt-2">
                  If this issue persists, please contact support with this information.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              {/* Always show Try Again button except for Not Found errors */}
              {!isNotFoundError && (
                <button
                  onClick={() => {
                    // Try to fetch the booking details again
                    fetchBookingDetails();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              )}

              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>

              <Link
                href="/cremation/bookings"
                className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90"
              >
                View All Bookings
              </Link>

              {/* Show Dashboard link for Not Found and Access errors */}
              {(isNotFoundError || isAccessError) && (
                <Link
                  href="/cremation/dashboard"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Dashboard
                </Link>
              )}

              {/* Add a direct link to create a new booking for Not Found errors */}
              {isNotFoundError && (
                <Link
                  href="/cremation/bookings/new"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create New Booking
                </Link>
              )}
            </div>
          </div>
        </div>
      </CremationDashboardLayout>
    );
  }

  return (
    <CremationDashboardLayout activePage="bookings" userData={userData}>
      {/* Header section with back button */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          <span>Back to Bookings</span>
        </button>
      </div>

      {/* Booking Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <div className="flex items-center mb-2">
              <h1 className="text-2xl font-semibold text-gray-800">
                Booking #{bookingId}
              </h1>
              <div className="ml-3">
                {getStatusBadge(booking.status)}
              </div>
            </div>
            <div className="flex items-center text-gray-500 text-sm space-x-3">
              <span>Created on {booking.createdAt}</span>
              <span>•</span>
              <span>Scheduled for {booking.scheduledDate} at {booking.scheduledTime}</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('confirmed')}
                  className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] flex items-center shadow-sm transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                  ) : (
                    <CheckIcon className="h-5 w-5 inline-block mr-1" />
                  )}
                  Confirm Booking
                </button>
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center shadow-sm transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 inline-block mr-1" />
                  )}
                  Reject Booking
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                ) : (
                  <ClockIcon className="h-5 w-5 inline-block mr-1" />
                )}
                Start Service
              </button>
            )}
            {booking.status === 'in_progress' && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] flex items-center shadow-sm transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                ) : (
                  <CheckIcon className="h-5 w-5 inline-block mr-1" />
                )}
                Complete Service
              </button>
            )}
            {/* Add ability to cancel from any non-final state */}
            {['pending', 'confirmed', 'in_progress'].includes(booking.status) && booking.status !== 'pending' && (
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center shadow-sm transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                ) : (
                  <XMarkIcon className="h-5 w-5 inline-block mr-1" />
                )}
                Cancel Service
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Booking Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Basic Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
            Booking Information
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div>{getStatusBadge(booking.status)}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled Date</p>
              <p className="text-base font-medium text-gray-900">{booking.scheduledDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled Time</p>
              <p className="text-base font-medium text-gray-900">{booking.scheduledTime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Package</p>
              <p className="text-base font-medium text-gray-900">{booking.package}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created On</p>
              <p className="text-base font-medium text-gray-900">{booking.createdAt}</p>
            </div>
          </div>
        </div>

        {/* Pet Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.625 2.655A9 9 0 0119 11a1 1 0 11-2 0 7 7 0 00-9.625-6.492 1 1 0 11-.75-1.853zM4.662 4.959A1 1 0 014.75 6.37 6.97 6.97 0 003 11a1 1 0 11-2 0 8.97 8.97 0 012.25-5.953 1 1 0 011.412-.088z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M5 11a5 5 0 1110 0 1 1 0 11-2 0 3 3 0 10-6 0c0 1.677-.345 3.276-.968 4.729a1 1 0 11-1.838-.789A9.964 9.964 0 005 11zm8.921 2.012a1 1 0 01.831 1.145 19.86 19.86 0 01-.545 2.436 1 1 0 11-1.92-.558c.207-.713.371-1.445.49-2.192a1 1 0 011.144-.83z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 10a1 1 0 011 1c0 2.236-.46 4.368-1.29 6.304a1 1 0 01-1.838-.789A13.952 13.952 0 009 11a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Pet Details
          </h2>
          <div className="flex flex-col sm:flex-row items-center mb-6">
            {booking.petImageUrl ? (
              <div className="mb-4 sm:mb-0 sm:mr-6">
                <img
                  src={booking.petImageUrl}
                  alt={booking.petName}
                  className="h-32 w-32 rounded-lg object-cover shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    target.src = '/placeholder-pet.png'; // Fallback image
                    target.className = 'h-32 w-32 rounded-lg object-contain bg-gray-100';
                  }}
                />
              </div>
            ) : (
              <div className="h-32 w-32 bg-gray-200 rounded-lg flex items-center justify-center mb-4 sm:mb-0 sm:mr-6 shadow-md">
                <span className="text-gray-500 text-2xl font-semibold">{booking.petName?.charAt(0) || '?'}</span>
              </div>
            )}
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-semibold text-gray-800 mb-1">{booking.petName}</h3>
              <p className="text-gray-600 mb-2">{booking.petType}</p>
              {booking.petBreed && booking.petBreed !== 'Not specified' && (
                <p className="text-gray-600 text-sm">Breed: {booking.petBreed}</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            {booking.causeOfDeath && booking.causeOfDeath !== 'Not specified' ? (
              <div>
                <p className="text-sm text-gray-500 mb-1">Cause of Death</p>
                <p className="text-base font-medium text-gray-900">{booking.causeOfDeath}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No cause of death specified</p>
            )}
          </div>
        </div>

        {/* Owner Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Owner Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-base font-medium text-gray-900">{booking.owner.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <div className="flex items-center">
                <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-1" />
                <a href={`mailto:${booking.owner.email}`} className="text-base font-medium text-blue-600 hover:text-blue-800">
                  {booking.owner.email}
                </a>
              </div>
            </div>
            {booking.owner.phone && booking.owner.phone !== 'Not provided' && (
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <a href={`tel:${booking.owner.phone}`} className="text-base font-medium text-blue-600 hover:text-blue-800">
                    {booking.owner.phone}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment and Additional Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            Payment Details
          </h2>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-gray-600">Package Price</p>
                <p className="font-medium text-gray-900">₱{parseFloat(booking.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Delivery Fee</p>
                <p className="font-medium text-gray-900">₱{parseFloat(booking.deliveryFee || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between">
                  <p className="font-medium text-gray-900">Total Amount</p>
                  <p className="font-semibold text-[var(--primary-green)] text-lg">₱{(Number(booking.price || 0) + Number(booking.deliveryFee || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Payment Method</p>
              <div className="flex items-center">
                {booking.paymentMethod === 'cash' ? (
                  <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
                ) : (
                  <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                )}
                <p className="text-base font-medium text-gray-900 capitalize">{booking.paymentMethod}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Payment Status</p>
              <div className="flex items-center">
                {getPaymentStatusBadge(booking.paymentStatus)}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Delivery Option</p>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                <p className="text-base font-medium text-gray-900 capitalize">{booking.deliveryOption}</p>
              </div>
            </div>
          </div>

          {booking.deliveryOption === 'delivery' && (
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Delivery Information</p>
              {booking.deliveryDistance > 0 && (
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-gray-700">Distance: <span className="font-medium">{booking.deliveryDistance} km</span></p>
                </div>
              )}
              {booking.deliveryAddress && (
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-gray-700">{booking.deliveryAddress}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Special Instructions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <ChatBubbleLeftIcon className="h-5 w-5 mr-2 text-gray-500" />
            Special Instructions
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">
              {booking.notes !== 'No special notes' ? booking.notes : 'No special instructions provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <button
          onClick={() => setStatusSectionExpanded(!statusSectionExpanded)}
          className="w-full text-left focus:outline-none"
        >
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Update Booking Status
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform ${statusSectionExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </h2>
        </button>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-2">Current Status:</p>
          <div className="flex items-center">
            {getStatusBadge(booking.status)}
          </div>
        </div>

        {statusSectionExpanded && (
          <>
            <p className="text-sm text-gray-500 mb-3">Change status to:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Show only the logical next status options based on current status */}
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('confirmed')}
                    className="px-4 py-3 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100 shadow-sm"
                    disabled={loading}
                  >
                    <ClockIcon className="h-5 w-5 mr-2" />
                    <span>Schedule</span>
                  </button>

                  <button
                    onClick={() => handleStatusUpdate('cancelled')}
                    className="px-4 py-3 bg-red-50 text-red-800 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100 shadow-sm"
                    disabled={loading}
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    <span>Cancel</span>
                  </button>
                </>
              )}

              {booking.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('in_progress')}
                    className="px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 flex items-center justify-center transition-colors border border-yellow-100 shadow-sm"
                    disabled={loading}
                  >
                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                    <span>Start Service</span>
                  </button>

                  <button
                    onClick={() => handleStatusUpdate('cancelled')}
                    className="px-4 py-3 bg-red-50 text-red-800 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100 shadow-sm"
                    disabled={loading}
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    <span>Cancel</span>
                  </button>
                </>
              )}

              {booking.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusUpdate('completed')}
                  className="px-4 py-3 bg-green-50 text-green-800 rounded-lg hover:bg-green-100 flex items-center justify-center transition-colors border border-green-100 shadow-sm"
                  disabled={loading}
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  <span>Complete</span>
                </button>
              )}

              {/* For completed or cancelled status, show no buttons */}
              {(booking.status === 'completed' || booking.status === 'cancelled') && (
                <div className="col-span-full text-center text-gray-500 italic">
                  No further status changes are available for {getStatusLabel(booking.status).toLowerCase()} bookings.
                </div>
              )}
            </div>

            {loading && (
              <div className="mt-4 text-center text-sm text-gray-500 flex items-center justify-center">
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Updating booking status...
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Status Section - Only show for confirmed bookings and when payment method is cash */}
      {(booking.status === 'confirmed' || booking.status === 'in_progress' || booking.status === 'completed') && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <button
            onClick={() => setPaymentSectionExpanded(!paymentSectionExpanded)}
            className="w-full text-left focus:outline-none"
          >
            <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2 text-gray-500" />
                Payment Information
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${paymentSectionExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </h2>
          </button>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">Current Payment Status:</p>
            <div className="flex items-center">
              {getPaymentStatusBadge(booking.paymentStatus || 'not_paid')}
            </div>
          </div>

          {paymentSectionExpanded && (
            <>
              {booking.paymentMethod === 'gcash' ? (
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-green-700">
                      <span className="font-medium">Payment Completed</span> - GCash payments are automatically marked as paid
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-3">Update payment status:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Only show relevant buttons based on current status */}
                    {booking.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => handlePaymentStatusUpdate('paid')}
                        className="px-4 py-3 bg-green-50 text-green-800 rounded-lg hover:bg-green-100 flex items-center justify-center transition-colors border border-green-100 shadow-sm"
                        disabled={loading}
                      >
                        <CheckIcon className="h-5 w-5 mr-2" />
                        <span>Mark as Paid</span>
                      </button>
                    )}

                    {booking.paymentStatus !== 'partially_paid' && (
                      <button
                        onClick={() => handlePaymentStatusUpdate('partially_paid')}
                        className="px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 flex items-center justify-center transition-colors border border-yellow-100 shadow-sm"
                        disabled={loading}
                      >
                        <ArrowPathIcon className="h-5 w-5 mr-2" />
                        <span>Mark as Partially Paid</span>
                      </button>
                    )}

                    {booking.paymentStatus !== 'not_paid' && (
                      <button
                        onClick={() => handlePaymentStatusUpdate('not_paid')}
                        className="px-4 py-3 bg-red-50 text-red-800 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100 shadow-sm"
                        disabled={loading}
                      >
                        <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                        <span>Mark as Not Paid</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {loading && (
                <div className="mt-4 text-center text-sm text-gray-500 flex items-center justify-center">
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Updating payment status...
                </div>
              )}
            </>
          )}
        </div>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(BookingDetailsPage);