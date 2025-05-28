'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  TruckIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';
import { useToast } from '@/context/ToastContext';
import ReviewPrompt from '@/components/reviews/ReviewPrompt';
import CremationCertificate from '@/components/certificates/CremationCertificate';
import BookingTimeline from '@/components/booking/BookingTimeline';

interface BookingDetailsProps {
  userData?: any;
}

function BookingDetailsPage({ userData }: BookingDetailsProps) {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (!userData || !params.id) return;

    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cremation/bookings/${params.id}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch booking details');
        }

        const data = await response.json();
        setBooking(data);

        // Show review prompt if booking is completed
        if (data.status === 'completed') {
          setShowReviewPrompt(true);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching booking details');
        showToast('Error loading booking details: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params.id, userData, showToast]);

  const handleCancelBooking = async () => {
    if (!booking || booking.status !== 'pending') return;

    if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      try {
        setIsCancelling(true);

        const response = await fetch(`/api/cremation/bookings/${booking.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cancel booking');
        }

        // Update the booking status locally
        setBooking({ ...booking, status: 'cancelled' });
        showToast('Booking cancelled successfully', 'success');
      } catch (error) {
        showToast('Error cancelling booking: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      } finally {
        setIsCancelling(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'partially_paid':
        return 'bg-yellow-500';
      case 'not_paid':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'not_paid':
        return 'Not Paid';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      // Handle time formats like "14:30:00"
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <FurParentNavbar activePage="bookings" userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Bookings
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        ) : booking ? (
          <div className="space-y-6">
            {/* Review Prompt - Show only for completed bookings */}
            {showReviewPrompt && booking.status === 'completed' && (
              <ReviewPrompt
                bookingId={booking.id}
                userId={userData.id}
                providerId={booking.provider_id}
                providerName={booking.provider_name || 'this service provider'}
                onDismiss={() => setShowReviewPrompt(false)}
              />
            )}

            {/* Booking Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h1 className="text-2xl font-semibold text-gray-900">Booking #{booking.id}</h1>
                <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Booking Date</p>
                    <p className="font-medium flex items-center mt-1">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                      {formatDate(booking.booking_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Booking Time</p>
                    <p className="font-medium flex items-center mt-1">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                      {booking.booking_time ? formatTime(booking.booking_time) : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Timeline - Show progress for non-cancelled bookings */}
            {booking.status !== 'cancelled' && (
              <BookingTimeline
                currentStatus={booking.status}
                className="mb-6"
              />
            )}

            {/* Service Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Service Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Service Provider</h3>
                  <p className="mt-1 font-medium">{booking.provider_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{booking.provider_address}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Service Package</h3>
                  <p className="mt-1 font-medium">{booking.service_name}</p>
                  <p className="text-sm text-gray-600 mt-1">₱{parseFloat(booking.price).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Pet Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Pet Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Pet Name</h3>
                  <p className="mt-1 font-medium">{booking.pet_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Pet Type</h3>
                  <p className="mt-1 font-medium">{booking.pet_type || 'Not specified'}</p>
                </div>
                {booking.cause_of_death && (
                  <div className="col-span-1 md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">Cause of Death</h3>
                    <p className="mt-1 font-medium">{booking.cause_of_death}</p>
                  </div>
                )}
                {booking.special_requests && (
                  <div className="col-span-1 md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">Special Requests</h3>
                    <p className="mt-1 font-medium">{booking.special_requests}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                  <p className="mt-1 font-medium flex items-center">
                    <CreditCardIcon className="h-4 w-4 text-gray-400 mr-1" />
                    {booking.payment_method || 'Not specified'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Status</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                      {getPaymentStatusLabel(booking.payment_status)}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Delivery Option</h3>
                  <p className="mt-1 font-medium flex items-center">
                    <TruckIcon className="h-4 w-4 text-gray-400 mr-1" />
                    {booking.delivery_option || 'Pickup'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
                  <p className="mt-1 font-medium">₱{parseFloat(booking.price).toLocaleString()}</p>
                </div>
                {booking.delivery_option === 'delivery' && booking.delivery_address && (
                  <div className="col-span-1 md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">Delivery Address</h3>
                    <p className="mt-1 font-medium">{booking.delivery_address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Section - Only show for completed bookings */}
            {booking.status === 'completed' && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-sm p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentCheckIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h2 className="text-lg font-medium text-gray-900">Cremation Certificate</h2>
                      <p className="text-sm text-gray-600">
                        Your service has been completed. Download your official cremation certificate as a keepsake.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCertificate(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 shadow-sm"
                  >
                    <DocumentCheckIcon className="h-4 w-4 mr-2" />
                    View Certificate
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {booking.status === 'pending' && (
              <div className="flex justify-end">
                <button
                  onClick={handleCancelBooking}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 flex items-center"
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 mr-2" />
                  )}
                  {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              </div>
            )}

            {/* Certificate Modal */}
            {showCertificate && booking && (
              <CremationCertificate
                booking={booking}
                onClose={() => setShowCertificate(false)}
              />
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
            <p className="text-yellow-700">Booking not found. Please check the booking ID and try again.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default withOTPVerification(BookingDetailsPage);
