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
} from '@heroicons/react/24/outline';

function BookingDetailsPage({ userData }: { userData: any }) {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
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
      const data = await response.json();
      console.log('Status update response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking status');
      }

      // Update the local booking state
      setBooking({
        ...booking,
        status: newStatus,
      });

      showToast(`Booking status updated to ${newStatus}`, 'success');
      
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
  
  // Extract the fetchBookingDetails function to make it reusable
  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching booking details for ID: ${bookingId}`);
      const response = await fetch(`/api/cremation/bookings/${bookingId}?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`Booking details response status: ${response.status}`);
      const data = await response.json();
      console.log('Booking details response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch booking details');
      }
      
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to load booking details. Please try again.');
      showToast('Error loading booking details: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]); // Remove showToast from the dependency array since we're using it in fetchBookingDetails

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
    return (
      <CremationDashboardLayout activePage="bookings" userData={userData}>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Booking Not Found</h3>
            <p className="text-gray-500 text-center mb-6">
              {error || "The booking you're looking for doesn't exist or couldn't be loaded."}
            </p>
            <div className="flex space-x-4">
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
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Booking #{bookingId}
            </h1>
            <div className="flex items-center space-x-3">
              {getStatusBadge(booking.status)}
              <span className="text-gray-500 text-sm">
                Created on {booking.createdAt}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('confirmed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                  ) : (
                    <CheckIcon className="h-5 w-5 inline-block mr-1" />
                  )}
                  Confirm
                </button>
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 inline-block mr-1" />
                  )}
                  Reject
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                ) : (
                  <ClockIcon className="h-5 w-5 inline-block mr-1" />
                )}
                Mark as In Progress
              </button>
            )}
            {booking.status === 'in_progress' && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                ) : (
                  <CheckIcon className="h-5 w-5 inline-block mr-1" />
                )}
                Mark as Completed
              </button>
            )}
            {/* Add ability to cancel from any non-final state */}
            {['pending', 'confirmed', 'in_progress'].includes(booking.status) && booking.status !== 'pending' && (
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 inline-block mr-1 animate-spin" />
                ) : (
                  <XMarkIcon className="h-5 w-5 inline-block mr-1" />
                )}
                Mark as Cancelled
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
          <h2 className="text-lg font-medium text-gray-800 mb-4">Pet Details</h2>
          <div className="flex items-center mb-4">
            {booking.petImageUrl ? (
              <img 
                src={booking.petImageUrl} 
                alt={booking.petName} 
                className="h-20 w-20 rounded-full object-cover mr-4"
              />
            ) : (
              <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                <span className="text-gray-500 text-lg">{booking.petName?.charAt(0) || '?'}</span>
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{booking.petName}</h3>
              <p className="text-gray-500">{booking.petType}</p>
            </div>
          </div>
          {booking.causeOfDeath && booking.causeOfDeath !== 'Not specified' && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Cause of Death</p>
              <p className="text-base font-medium text-gray-900">{booking.causeOfDeath}</p>
            </div>
          )}
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
          <h2 className="text-lg font-medium text-gray-800 mb-4">Payment Details</h2>
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
                <p className="font-semibold text-gray-900">₱{(parseFloat(booking.price || 0) + parseFloat(booking.deliveryFee || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
            </div>
            <div className="pt-3">
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="text-base font-medium text-gray-900 capitalize">{booking.paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery Option</p>
              <p className="text-base font-medium text-gray-900 capitalize">{booking.deliveryOption}</p>
            </div>
            {booking.deliveryOption === 'delivery' && booking.deliveryDistance > 0 && (
              <div>
                <p className="text-sm text-gray-500">Delivery Distance</p>
                <p className="text-base font-medium text-gray-900">{booking.deliveryDistance} km</p>
              </div>
            )}
          </div>
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Update Status</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleStatusUpdate('confirmed')}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 flex items-center"
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Mark as Scheduled
          </button>

          <button
            onClick={() => handleStatusUpdate('in_progress')}
            className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 flex items-center"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Mark as In Progress
          </button>

          <button
            onClick={() => handleStatusUpdate('completed')}
            className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 flex items-center"
          >
            <CheckIcon className="h-5 w-5 mr-2" />
            Mark as Completed
          </button>

          <button
            onClick={() => handleStatusUpdate('cancelled')}
            className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 mr-2" />
            Mark as Cancelled
          </button>
        </div>
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(BookingDetailsPage); 