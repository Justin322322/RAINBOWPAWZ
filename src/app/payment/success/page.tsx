'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const bookingId = searchParams.get('booking_id');

  const verifyPaymentStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/payments/status?booking_id=${bookingId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentDetails(data.data);

        // Show success toast based on payment status
        if (data.data.status === 'succeeded') {
          toast.success('Payment completed successfully!');
        } else if (data.data.status === 'pending' || data.data.status === 'processing') {
          toast.loading('Payment is being processed...');
        } else if (data.data.status === 'failed') {
          toast.error('Payment verification failed. Please contact support.');
          setError('Payment verification failed');
        }
      } else {
        setError(data.error || 'Failed to verify payment status');
        toast.error('Failed to verify payment status');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Failed to verify payment status');
      toast.error('Failed to verify payment status');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) {
      setError('Missing booking ID');
      setIsLoading(false);
      return;
    }

    // Verify payment status
    verifyPaymentStatus();
  }, [bookingId, verifyPaymentStatus]);

  const handleContinue = () => {
    // Redirect to booking details or dashboard
    router.push(`/user/furparent_dashboard/bookings`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/user/furparent_dashboard/bookings')}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go to Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully.
        </p>

        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium">#{paymentDetails.booking_id || bookingId}</span>
              </div>
              {paymentDetails.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium">#{paymentDetails.transaction_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  ₱{Number(paymentDetails.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium capitalize">{paymentDetails.payment_method || 'QR Transfer'}</span>
              </div>
              {paymentDetails.service_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{paymentDetails.service_name}</span>
                </div>
              )}
              {paymentDetails.pet_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pet:</span>
                  <span className="font-medium">{paymentDetails.pet_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  paymentDetails.status === 'succeeded'
                    ? 'bg-green-100 text-green-800'
                    : paymentDetails.status === 'pending' || paymentDetails.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {paymentDetails.status === 'succeeded' ? 'Completed' :
                   paymentDetails.status === 'pending' ? 'Pending' :
                   paymentDetails.status === 'processing' ? 'Processing' :
                   paymentDetails.status === 'failed' ? 'Failed' : 'Paid'}
                </span>
              </div>
              {paymentDetails.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(paymentDetails.created_at).toLocaleDateString('en-PH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            View My Bookings
          </button>

          <button
            onClick={() => router.push('/user/furparent_dashboard')}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            You will receive a confirmation email shortly. If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
