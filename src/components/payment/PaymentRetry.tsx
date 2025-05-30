'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PaymentRetryProps {
  bookingId: number;
  amount: number;
  paymentMethod: 'gcash' | 'cash';
  onSuccess?: (transactionId: number) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  maxRetries?: number;
}

export default function PaymentRetry({
  bookingId,
  amount,
  paymentMethod,
  onSuccess,
  onError,
  onCancel,
  maxRetries = 3
}: PaymentRetryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const checkPaymentStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/payments/status?booking_id=${bookingId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentStatus(data.data.status);

        if (data.data.status === 'succeeded') {
          toast.success('Payment already completed!');
          if (onSuccess && data.data.transaction_id) {
            onSuccess(data.data.transaction_id);
          }
        } else if (data.data.status === 'failed') {
          setLastError(data.data.failure_reason || 'Payment failed');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }, [bookingId, onSuccess]);

  useEffect(() => {
    // Check current payment status on component mount
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  const retryPayment = async () => {
    if (retryCount >= maxRetries) {
      toast.error(`Maximum retry attempts (${maxRetries}) reached. Please contact support.`);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // For GCash payments, create a new payment intent
      if (paymentMethod === 'gcash') {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const returnUrl = `${baseUrl}/payment/success?booking_id=${bookingId}`;
        const cancelUrl = `${baseUrl}/payment/cancel?booking_id=${bookingId}`;

        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: bookingId,
            amount: amount,
            currency: 'PHP',
            payment_method: 'gcash',
            description: `Retry payment for booking #${bookingId}`,
            return_url: returnUrl,
            cancel_url: cancelUrl
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Payment retry failed');
        }

        if (data.success && data.data.checkout_url) {
          toast.success('Redirecting to payment...');

          // Redirect to GCash payment page
          window.location.href = data.data.checkout_url;

          // Call success callback with transaction ID
          if (onSuccess && data.data.transaction_id) {
            onSuccess(data.data.transaction_id);
          }
        } else {
          throw new Error('No checkout URL received');
        }
      } else {
        // For cash payments, just update the booking
        toast.success('Payment method updated to cash');
        if (onSuccess) {
          onSuccess(0); // No transaction ID for cash payments
        }
      }

    } catch (error) {
      console.error('Payment retry error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment retry failed';
      setLastError(errorMessage);
      toast.error(`Retry ${retryCount} failed: ${errorMessage}`);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Don't show retry component if payment already succeeded
  if (paymentStatus === 'succeeded') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center mb-4">
        <ExclamationTriangleIcon className="h-8 w-8 text-orange-500 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payment Issue</h3>
          <p className="text-sm text-gray-600">
            {paymentStatus === 'failed' ? 'Payment failed' : 'Payment needs to be completed'}
          </p>
        </div>
      </div>

      {lastError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">
            <strong>Error:</strong> {lastError}
          </p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Booking ID:</span>
            <span className="font-medium">#{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">₱{amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium capitalize">{paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Retry Attempts:</span>
            <span className="font-medium">{retryCount} / {maxRetries}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={retryPayment}
          disabled={isRetrying || retryCount >= maxRetries}
          className={`w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-colors ${
            isRetrying || retryCount >= maxRetries
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRetrying ? (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              Retrying Payment...
            </>
          ) : retryCount >= maxRetries ? (
            'Maximum Retries Reached'
          ) : (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Retry Payment ({retryCount + 1}/{maxRetries})
            </>
          )}
        </button>

        <button
          onClick={handleCancel}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>

      {retryCount >= maxRetries && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Need help?</strong> Contact our support team with booking ID #{bookingId} for assistance.
          </p>
        </div>
      )}
    </div>
  );
}
