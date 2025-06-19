'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircleIcon } from '@heroicons/react/24/solid';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [_paymentDetails, setPaymentDetails] = useState<any>(null);

  const bookingId = searchParams.get('booking_id');
  const error = searchParams.get('error');

  const getPaymentDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/payments/status?booking_id=${bookingId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentDetails(data.data);
      } else {
        console.error('Failed to get payment details:', data.error);
      }
    } catch (error) {
      console.error('Error getting payment details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      // Get payment details for retry
      getPaymentDetails();
    } else {
      setIsLoading(false);
    }
  }, [bookingId, getPaymentDetails]);

  const handleRetryPayment = () => {
    // Redirect back to checkout with the same booking
    router.push(`/user/furparent_dashboard/bookings/checkout?booking_id=${bookingId}&retry=true`);
  };

  const handleGoToBookings = () => {
    router.push('/user/furparent_dashboard/bookings');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment Details</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <XCircleIcon className="h-10 w-10 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          Unfortunately, your GCash payment could not be processed.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {decodeURIComponent(error)}
            </p>
          </div>
        )}

        {bookingId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Booking Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium">#{bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Failed
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Common Issues</h4>
              <div className="mt-1 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Insufficient GCash balance</li>
                  <li>Network connectivity issues</li>
                  <li>Payment timeout</li>
                  <li>Invalid payment details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {bookingId && (
            <button
              onClick={handleRetryPayment}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Payment Again
            </button>
          )}

          <button
            onClick={handleGoToBookings}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Go to My Bookings
          </button>

          <button
            onClick={() => router.push('/user/furparent_dashboard')}
            className="w-full text-gray-500 py-2 px-4 rounded-lg hover:text-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you continue to experience issues, please contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  );
}
