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
import Image from 'next/image';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import BusinessCancellationModal from '@/components/booking/BusinessCancellationModal';
import ReceiptRejectionModal from '@/components/booking/ReceiptRejectionModal';

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
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<{ receipt_path: string; status: string; notes?: string | null } | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptActionLoading, setReceiptActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReceiptRejectionModal, setShowReceiptRejectionModal] = useState(false);
  const [isRejectingReceipt, setIsRejectingReceipt] = useState(false);

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
    }
  }, [booking]); // Monitor booking changes for logging

  // Use useRef to track ongoing requests and prevent multiple simultaneous calls
  const updateRequestRef = useRef<AbortController | null>(null);

  const updateBookingStatus = useCallback(async (newStatus: string) => {
    if (!booking || updating || !params.id || isOperationInProgress.current) return; // Prevent multiple simultaneous updates

    // Enhanced debounce mechanism - prevent rapid clicks within 1.5 seconds
    const now = Date.now();
    if (now - lastUpdateTime < 1500) {
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

  // Handle booking cancellation
  const handleCancelBooking = async (reason: string) => {
    if (!booking || isCancelling) return;

    setIsCancelling(true);

    try {
      const response = await fetch(`/api/cremation/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason,
          notes: 'Cancelled by business'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const data = await response.json();
      showToast(data.message, 'success');

      // Update booking status locally
      setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);

      // Close modal
      setShowCancelModal(false);

      // Redirect to refunds page after a short delay
      setTimeout(() => {
        router.push('/cremation/refunds');
      }, 1500);

    } catch (error) {
      console.error('Error cancelling booking:', error);
      showToast(error instanceof Error ? error.message : 'Failed to cancel booking', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

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

  // Helpers for receipt rendering
  const getReceiptUrlFromNotes = (notes?: string | null): string | null => {
    if (!notes) return null;
    const m = notes.match(/Receipt:\s*(\S+)/i);
    return m ? m[1] : null;
  };
  const filteredSpecialNotes = (() => {
    const t = booking?.notes || '';
    if (!t) return '';
    return t
      .replace(/Receipt:\s*\S+/gi, '')
      .replace(/\[ADD-ONS\]\s*\n?\s*Selected Add-ons:\s*.+?(?:\n\n|\n$|$)/gis, '')
      .replace(/Selected Add-ons:\s*.+?(?:\n|$)/gi, '')
      .trim();
  })();

  const parsedAddOns = (() => {
    const t = booking?.notes || '';
    if (!t) return '';
    // Try to match both formats: with [ADD-ONS] prefix (multiline) and without
    const m1 = t.match(/\[ADD-ONS\]\s*\n?\s*Selected Add-ons:\s*(.+?)(?:\n\n|\n$|$)/is);
    const m2 = t.match(/Selected Add-ons:\s*(.+?)(?:\n|$)/i);
    return (m1 ? m1[1].trim() : m2 ? m2[1].trim() : '');
  })();

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'Not specified';
    switch (method) {
      case 'gcash':
        return 'GCash';
      case 'qr_manual':
        return 'QR Transfer (manual confirmation)';
      case 'cash':
        return 'Cash';
      default:
        return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const openReceiptReview = async () => {
    if (!params.id) return;
    setReceiptLoading(true);
    try {
      const res = await fetch(`/api/payments/offline/receipt?bookingId=${params.id}`, { credentials: 'include' });
      const j = await res.json();
      if (res.ok && j.exists && j.receipt) {
        setReceiptData({ receipt_path: j.receipt.receipt_path, status: j.receipt.status, notes: j.receipt.notes });
        setShowReceiptModal(true);
      } else {
        showToastRef.current?.('No receipt found for this booking.', 'warning');
      }
    } catch {
      showToastRef.current?.('Failed to load receipt.', 'error');
    } finally {
      setReceiptLoading(false);
    }
  };

  const confirmOrRejectReceipt = async (action: 'confirm' | 'reject', reason?: string) => {
    if (!params.id) return;
    setReceiptActionLoading(true);
    try {
      const res = await fetch('/api/payments/offline/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId: Number(params.id), action, reason: reason || null })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Failed to update receipt');
      setShowReceiptModal(false);
      showToastRef.current?.(action === 'confirm' ? 'Payment confirmed.' : 'Receipt rejected and booking cancelled.', 'success');
      setBooking(prev => prev ? { 
        ...prev, 
        payment_status: action === 'confirm' ? 'paid' : 'awaiting_payment_confirmation',
        status: action === 'reject' ? 'cancelled' : prev.status
      } : prev);
    } catch (err) {
      showToastRef.current?.(err instanceof Error ? err.message : 'Failed to process action', 'error');
    } finally {
      setReceiptActionLoading(false);
    }
  };

  const handleReceiptRejection = async (reason: string) => {
    if (!params.id) return;
    setIsRejectingReceipt(true);
    try {
      await confirmOrRejectReceipt('reject', reason);
      setShowReceiptRejectionModal(false);
    } catch (error) {
      console.error('Receipt rejection error:', error);
      showToastRef.current?.('Failed to reject receipt. Please try again.', 'error');
    } finally {
      setIsRejectingReceipt(false);
    }
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
                  className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {booking.status === 'pending' && (
                    <>
                      <motion.button
                        onClick={() => setShowCancelModal(true)}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 flex items-center justify-center transition-all duration-200 w-full sm:w-auto"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </motion.button>
                      <motion.button
                        onClick={() => updateBookingStatus('confirmed')}
                        className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
                          updateSuccess ? 'bg-green-600 hover:bg-green-700' : ''
                        }`}
                        disabled={updating || updateSuccess || booking.payment_method === 'qr_manual' && (booking.payment_status !== 'paid')}
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
                      {booking.payment_method === 'qr_manual' && (
                        <div className="relative w-full sm:w-auto">
                          <motion.button
                            onClick={openReceiptReview}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center justify-center transition-all duration-200 disabled:opacity-50 w-full sm:w-auto"
                            disabled={receiptLoading}
                          >
                            {receiptLoading ? (
                              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CreditCardIcon className="h-4 w-4 mr-2" />
                            )}
                            Review Receipt
                          </motion.button>
                          {/* Persistent guidance bubble */}
                          {booking.payment_status !== 'paid' && (
                            <>
                              {/* Mobile: below and centered */}
                              <div className="block md:hidden absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 max-w-[250px]">
                                <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg leading-5 relative">
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-l-transparent border-r-transparent border-b-gray-900" />
                                  Please review and confirm the receipt before confirming the booking.
                                </div>
                              </div>
                              {/* Desktop: to the right, vertically centered */}
                              <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-20 max-w-[260px]">
                                <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg leading-5 relative">
                                  <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-6 border-b-6 border-r-6 border-t-transparent border-b-transparent border-r-gray-900" />
                                  Please review and confirm the receipt before confirming the booking.
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {booking.status === 'confirmed' && (
                    <motion.button
                      onClick={() => updateBookingStatus('in_progress')}
                      className={`px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
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
                      className={`px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
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

            {/* Unified Details Card (compact) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                {/* Service Details */}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Service details</h2>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Service package</p>
                      <p className="mt-1 text-base md:text-lg font-medium text-gray-900">{booking.service_name}</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900">₱{parseFloat(booking.price.toString()).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Processing time</p>
                      <p className="mt-1 text-base md:text-lg font-medium text-gray-900">{booking.processing_time}</p>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="my-4 border-t border-gray-200" />

                {/* Pet Information */}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Pet information</h2>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-600">Pet name</p>
                        <p className="mt-1 text-base md:text-lg font-medium text-gray-900">{booking.pet_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Pet type</p>
                        <p className="mt-1 text-base md:text-lg font-medium text-gray-900">{booking.pet_type}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-600">Cause of death</p>
                        <p className="mt-1 text-base md:text-lg font-medium text-gray-900">{booking.cause_of_death || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="w-full max-w-[160px] border rounded-lg overflow-hidden bg-gray-50">
                        <Image
                          src={booking.pet_image_url || '/images/pet-placeholder.svg'}
                          alt={booking.pet_name}
                          width={320}
                          height={320}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/pet-placeholder.svg'; }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="my-4 border-t border-gray-200" />

                {/* Special Requests & Add-ons */}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Special requests</h2>
                  <p className="mt-2 text-sm md:text-base text-gray-800 leading-relaxed">{filteredSpecialNotes || 'None'}</p>
                  {parsedAddOns && (
                    <p className="mt-2 text-sm md:text-base text-gray-800"><span className="font-medium">Selected add-ons:</span> {parsedAddOns}</p>
                  )}
                </div>

                {/* Separator */}
                <div className="my-4 border-t border-gray-200" />

                {/* Customer Information */}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Customer information</h2>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="mt-1 text-base md:text-lg font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <a href={`mailto:${booking.email}`} className="mt-1 text-base md:text-lg font-medium text-blue-700 hover:text-blue-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />{booking.email}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Phone</p>
                      {booking.phone ? (
                        <a href={`tel:${booking.phone}`} className="mt-1 text-base md:text-lg font-medium text-blue-700 hover:text-blue-900 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2" />{booking.phone}
                        </a>
                      ) : (
                        <p className="mt-1 text-base text-gray-500">Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="my-4 border-t border-gray-200" />

                {/* Payment & Delivery */}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Payment & delivery</h2>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Payment method</p>
                      <p className="mt-1 text-base md:text-lg font-medium text-gray-900 flex items-center"><CreditCardIcon className="h-4 w-4 mr-2 text-gray-400" />{getPaymentMethodLabel(booking.payment_method)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Delivery option</p>
                      <p className="mt-1 text-base md:text-lg font-medium text-gray-900 flex items-center"><TruckIcon className="h-4 w-4 mr-2 text-gray-400" />{booking.delivery_option || 'pickup'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600">Total amount</p>
                      <p className="mt-1 text-xl md:text-2xl font-bold text-gray-900">₱{parseFloat(booking.price.toString()).toLocaleString()}</p>
                    </div>
                  </div>
                  {booking.payment_method === 'qr_manual' && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Payment Receipt</p>
                      {getReceiptUrlFromNotes(booking.notes) ? (
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <Image src={getReceiptUrlFromNotes(booking.notes) as string} alt="Payment Receipt" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Receipt pending upload/confirmation.</p>
                      )}
                    </div>
                  )}
                  {booking.delivery_option === 'delivery' && booking.delivery_address && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                      <p className="mt-1 text-base font-medium text-gray-900">{booking.delivery_address}</p>
                    </div>
                  )}
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

      {/* Receipt Review Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Review Payment Receipt</h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">Status: <span className="font-medium">{receiptData.status}</span></div>
              {receiptData.notes && <div className="text-sm text-gray-600">Notes: {receiptData.notes}</div>}
              <div className="w-full border rounded-lg overflow-hidden bg-gray-50">
                <Image src={receiptData.receipt_path} alt="Payment receipt" width={1200} height={800} className="w-full h-auto object-contain" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50 disabled:opacity-50"
                disabled={receiptActionLoading || isRejectingReceipt}
                onClick={() => setShowReceiptRejectionModal(true)}
              >
                {isRejectingReceipt ? 'Processing...' : 'Reject'}
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                disabled={receiptActionLoading}
                onClick={() => confirmOrRejectReceipt('confirm')}
              >
                {receiptActionLoading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Cancellation Modal */}
      {booking && (
        <BusinessCancellationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelBooking}
          bookingId={booking.id}
          petName={booking.pet_name}
          isCancelling={isCancelling}
        />
      )}

      {/* Receipt Rejection Modal */}
      {booking && (
        <ReceiptRejectionModal
          isOpen={showReceiptRejectionModal}
          onClose={() => setShowReceiptRejectionModal(false)}
          onConfirm={handleReceiptRejection}
          bookingId={booking.id}
          petName={booking.pet_name}
          isRejecting={isRejectingReceipt}
        />
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(BookingDetailsPage);
