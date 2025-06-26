'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  TruckIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlayIcon,

} from '@heroicons/react/24/outline';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import BookingTimeline from '@/components/booking/BookingTimeline';
import CremationCertificate from '@/components/certificates/CremationCertificate';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

interface BookingDetailsProps {
  userData?: any;
}

interface BookingData {
  id: number;
  status: string;
  booking_date: string;
  booking_time: string;
  notes: string;
  created_at: string;
  price: number;
  payment_method: string;
  payment_status?: string;
  delivery_option: string;
  delivery_address?: string;
  delivery_distance?: number;
  delivery_fee?: number;
  pet_name: string;
  pet_type: string;
  cause_of_death?: string;
  pet_image_url?: string;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  package_id: number;
  service_name: string;
  processing_time: string;
  provider_name?: string;
  provider_address?: string;
}

function BookingDetailsPage({ userData }: BookingDetailsProps) {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [_previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Flag to prevent re-fetching after successful updates
  const hasInitiallyLoaded = useRef(false);
  // Flag to prevent multiple simultaneous operations
  const isOperationInProgress = useRef(false);

  // Create a ref to store the showToast function to avoid dependency issues
  const showToastRef = useRef(showToast);

  // Update the ref when showToast changes - but prevent unnecessary re-renders
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Stable fetch function that doesn't change on re-renders
  const fetchBookingDetails = useCallback(async () => {
    if (!params.id) return;

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
      hasInitiallyLoaded.current = true; // Mark as initially loaded
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching booking details';
      setError(errorMessage);
      // Use the ref to avoid dependency issues
      if (showToastRef.current) {
        showToastRef.current('Error loading booking details: ' + errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]); // Only depend on params.id - no showToast dependency

  // Fetch booking details only when params.id changes - NEVER re-fetch after status updates
  useEffect(() => {
    if (params.id && !hasInitiallyLoaded.current) {
      fetchBookingDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]); // Intentionally exclude fetchBookingDetails to prevent circular dependency

  // Prevent any accidental re-fetching by monitoring booking state changes
  useEffect(() => {
    // This effect only runs to log state changes, never to trigger re-fetches
    if (booking && hasInitiallyLoaded.current) {
      console.log('Booking state updated:', booking.status);
    }
  }, [booking]); // Monitor booking changes for logging

  // Use useRef to track ongoing requests and prevent multiple simultaneous calls
  const updateRequestRef = useRef<AbortController | null>(null);

  const updateBookingStatus = useCallback(async (newStatus: string) => {
    if (!booking || updating || !params.id || isOperationInProgress.current) return; // Prevent multiple simultaneous updates

    // Enhanced debounce mechanism - prevent rapid clicks within 1.5 seconds
    const now = Date.now();
    if (now - lastUpdateTime < 1500) {
      console.log('Update blocked by debounce mechanism');
      return;
    }

    // Set operation in progress flag
    isOperationInProgress.current = true;

    // Cancel any ongoing request
    if (updateRequestRef.current) {
      updateRequestRef.current.abort();
    }

    // Create new abort controller for this request
    updateRequestRef.current = new AbortController();
    setLastUpdateTime(now);

    try {
      setUpdating(true);

      // Store previous status for potential rollback
      const currentStatus = booking.status;
      setPreviousStatus(currentStatus);

      // Optimistically update the UI immediately for better UX
      setBooking(prev => prev ? { ...prev, status: newStatus } : null);

      // Use the consolidated API route with abort signal
      const response = await fetch(`/api/cremation/bookings/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        signal: updateRequestRef.current.signal,
      });

      if (!response.ok) {
        // Rollback on error
        setBooking(prev => prev ? { ...prev, status: currentStatus } : null);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update booking status');
      }

      // Show success message with immediate feedback
      const statusLabels: Record<string, string> = {
        'confirmed': 'confirmed',
        'cancelled': 'cancelled',
        'in_progress': 'started',
        'completed': 'completed'
      };

      // Use setTimeout to prevent immediate re-render issues
      setTimeout(() => {
        if (showToastRef.current) {
          showToastRef.current(`Booking ${statusLabels[newStatus] || newStatus} successfully`, 'success');
        }
      }, 100);

      // Show success state briefly
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);

      // CRITICAL: Never re-fetch data after successful updates - we use optimistic updates
      // The booking state has already been updated optimistically above
      // Any re-fetch would cause multiple page refreshes
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Update request was aborted');
        return;
      }

      // Use setTimeout to prevent immediate re-render issues
      setTimeout(() => {
        if (showToastRef.current) {
          showToastRef.current('Failed to update booking status', 'error');
        }
      }, 100);
    } finally {
      setUpdating(false);
      setPreviousStatus(null);
      updateRequestRef.current = null;
      isOperationInProgress.current = false; // Clear operation flag
    }
  }, [booking, updating, params.id, lastUpdateTime]); // Include booking object

  // Cleanup effect to cancel ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (updateRequestRef.current) {
        updateRequestRef.current.abort();
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid Time';
    }
  };

  // Certificate button handler
  const handleShowCertificate = () => {
    setShowCertificate(true);
  };

  // Remove the old SimpleProgressTimeline component - now using the improved BookingTimeline



  if (loading) {
    return (
      <CremationDashboardLayout activePage="bookings" userData={userData}>
        <div className="space-y-6">
          {/* Back button skeleton */}
          <SkeletonCard
            withHeader={false}
            contentLines={1}
            withFooter={false}
            withShadow={false}
            rounded="lg"
            animate={true}
            className="w-32 h-8"
          />
          
          {/* Main content skeleton */}
          <SkeletonCard
            withHeader={true}
            contentLines={8}
            withFooter={false}
            withShadow={true}
            rounded="lg"
            animate={true}
            className="min-h-[400px]"
          />
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
              <XCircleIcon className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error === 'Booking not found' ? 'Booking Not Found' : 'Error Loading Booking'}
            </h3>
            <p className="text-gray-500 text-center mb-6">
              {error || "The booking you're looking for doesn't exist or couldn't be loaded."}
            </p>
            <button
              onClick={() => router.push('/cremation/bookings')}
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-green-700"
            >
              Back to Bookings
            </button>
          </div>
        </div>
      </CremationDashboardLayout>
    );
  }

  return (
    <CremationDashboardLayout activePage="bookings" userData={userData}>
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200 group"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Bookings
          </button>
        </div>

        {booking ? (
          <div className="space-y-8">
            {/* Page Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-2xl font-semibold text-gray-900">Booking #{booking.id}</h1>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Service for <span className="font-medium text-gray-800">{booking.pet_name}</span> • {booking.service_name}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {formatDate(booking.booking_date)}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {formatTime(booking.booking_time)}
                    </div>
                    <div className="flex items-center">
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      ₱{parseFloat(booking.price.toString()).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <motion.div
                  className="flex flex-col sm:flex-row gap-2 min-w-fit"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {booking.status === 'pending' && (
                    <>
                      <motion.button
                        onClick={() => updateBookingStatus('cancelled')}
                        className={`px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                          updateSuccess ? 'bg-green-50 border-green-300 text-green-700' : ''
                        }`}
                        disabled={updating || updateSuccess}
                        whileHover={{ scale: updating || updateSuccess ? 1 : 1.02 }}
                        whileTap={{ scale: updating || updateSuccess ? 1 : 0.98 }}
                      >
                        {updating ? (
                          <ArrowPathIcon
                            className="h-4 w-4 mr-2 animate-spin"
                            style={{
                              animation: 'spin 1s linear infinite',
                              transformOrigin: 'center'
                            }}
                          />
                        ) : updateSuccess ? (
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 mr-2" />
                        )}
                        {updating ? 'Cancelling...' : updateSuccess ? 'Success!' : 'Cancel Booking'}
                      </motion.button>
                      <motion.button
                        onClick={() => updateBookingStatus('confirmed')}
                        className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                          updateSuccess ? 'bg-green-600 hover:bg-green-700' : ''
                        }`}
                        disabled={updating || updateSuccess}
                        whileHover={{ scale: updating || updateSuccess ? 1 : 1.02 }}
                        whileTap={{ scale: updating || updateSuccess ? 1 : 0.98 }}
                      >
                        {updating ? (
                          <ArrowPathIcon
                            className="h-4 w-4 mr-2 animate-spin"
                            style={{
                              animation: 'spin 1s linear infinite',
                              transformOrigin: 'center'
                            }}
                          />
                        ) : updateSuccess ? (
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                        )}
                        {updating ? 'Confirming...' : updateSuccess ? 'Success!' : 'Confirm Booking'}
                      </motion.button>
                    </>
                  )}

                  {booking.status === 'confirmed' && (
                    <motion.button
                      onClick={() => updateBookingStatus('in_progress')}
                      className={`px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        updateSuccess ? 'bg-green-600 hover:bg-green-700' : ''
                      }`}
                      disabled={updating || updateSuccess}
                      whileHover={{ scale: updating || updateSuccess ? 1 : 1.02 }}
                      whileTap={{ scale: updating || updateSuccess ? 1 : 0.98 }}
                    >
                      {updating ? (
                        <ArrowPathIcon
                          className="h-4 w-4 mr-2 animate-spin"
                          style={{
                            animation: 'spin 1s linear infinite',
                            transformOrigin: 'center'
                          }}
                        />
                      ) : updateSuccess ? (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      ) : (
                        <PlayIcon className="h-4 w-4 mr-2" />
                      )}
                      {updating ? 'Starting...' : updateSuccess ? 'Success!' : 'Start Service'}
                    </motion.button>
                  )}

                  {booking.status === 'in_progress' && (
                    <motion.button
                      onClick={() => updateBookingStatus('completed')}
                      className={`px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        updateSuccess ? 'bg-green-700' : ''
                      }`}
                      disabled={updating || updateSuccess}
                      whileHover={{ scale: updating || updateSuccess ? 1 : 1.02 }}
                      whileTap={{ scale: updating || updateSuccess ? 1 : 0.98 }}
                    >
                      {updating ? (
                        <ArrowPathIcon
                          className="h-4 w-4 mr-2 animate-spin"
                          style={{
                            animation: 'spin 1s linear infinite',
                            transformOrigin: 'center'
                          }}
                        />
                      ) : updateSuccess ? (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      {updating ? 'Completing...' : updateSuccess ? 'Success!' : 'Mark Complete'}
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Progress Timeline */}
            <BookingTimeline
              currentStatus={booking.status as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'}
              showCertificateButton={true}
              onShowCertificate={handleShowCertificate}
              className="mb-6"
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - Main Information */}
              <div className="xl:col-span-2 space-y-6">
                {/* Service Details */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Service Details</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Service Package</h3>
                        <p className="text-base font-medium text-gray-900">{booking.service_name}</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">₱{parseFloat(booking.price.toString()).toLocaleString()}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Processing Time</h3>
                        <p className="text-base font-medium text-gray-900">{booking.processing_time}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pet Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Pet Information</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Pet Name</h3>
                        <p className="text-base font-medium text-gray-900">{booking.pet_name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Pet Type</h3>
                        <p className="text-base font-medium text-gray-900">{booking.pet_type}</p>
                      </div>
                      {booking.cause_of_death && (
                        <div className="col-span-1 sm:col-span-2">
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Cause of Death</h3>
                          <p className="text-base font-medium text-gray-900">{booking.cause_of_death}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.notes && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-medium text-gray-900">Special Requests</h2>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 leading-relaxed">{booking.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Customer & Payment Info */}
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                      <p className="text-base font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                      <a href={`mailto:${booking.email}`} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {booking.email}
                      </a>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
                      {booking.phone ? (
                        <a href={`tel:${booking.phone}`} className="text-blue-600 hover:text-blue-800 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          {booking.phone}
                        </a>
                      ) : (
                        <p className="text-gray-500">Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment and Delivery Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Payment & Delivery</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h3>
                      <p className="text-base font-medium text-gray-900 flex items-center">
                        <CreditCardIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {booking.payment_method || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Delivery Option</h3>
                      <p className="text-base font-medium text-gray-900 flex items-center">
                        <TruckIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {booking.delivery_option || 'Pickup'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Total Amount</h3>
                      <p className="text-xl font-semibold text-gray-900">₱{parseFloat(booking.price.toString()).toLocaleString()}</p>
                    </div>
                    {booking.delivery_option === 'delivery' && booking.delivery_address && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Delivery Address</h3>
                        <p className="text-base font-medium text-gray-900">{booking.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(BookingDetailsPage);
