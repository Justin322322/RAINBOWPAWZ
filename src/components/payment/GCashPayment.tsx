'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface GCashPaymentProps {
  bookingId: number;
  amount: number;
  description?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
  onSuccess?: (transactionId: number) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export default function GCashPayment({
  bookingId,
  amount,
  description,
  customerInfo,
  onSuccess,
  onError,
  onCancel
}: GCashPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const maxRetries = 3;

  const handlePayment = async (isRetry = false) => {
    if (isRetry && retryCount >= maxRetries) {
      toast.error(`Maximum retry attempts (${maxRetries}) reached. Please contact support.`);
      return;
    }

    setIsProcessing(true);
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }

    try {
      // Validate amount
      if (amount < 1 || amount > 50000) {
        throw new Error('Amount must be between ₱1.00 and ₱50,000.00 for GCash payments');
      }

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
          description: description || `Payment for booking #${bookingId}${isRetry ? ` (Retry ${retryCount + 1})` : ''}`,
          customer_info: customerInfo,
          return_url: returnUrl,
          cancel_url: cancelUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Payment creation failed');
      }

      if (data.success && data.data.checkout_url) {
        setPaymentUrl(data.data.checkout_url);
        setLastError(null); // Clear any previous errors

        // Show success message
        toast.success('Redirecting to GCash payment...');

        // Redirect to GCash payment page
        window.location.href = data.data.checkout_url;

        // Call success callback with transaction ID
        if (onSuccess && data.data.transaction_id) {
          onSuccess(data.data.transaction_id);
        }
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setLastError(errorMessage);

      if (isRetry) {
        toast.error(`Retry ${retryCount + 1} failed: ${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    handlePayment(true);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="gcash-payment-component">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">GCash Payment</h3>
            <p className="text-sm text-gray-600">Pay securely with your GCash account</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Amount to pay:</span>
            <span className="text-xl font-bold text-gray-900">
              ₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {description && (
            <div className="mb-4">
              <span className="text-sm text-gray-600">{description}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Payment Instructions</h4>
                  <div className="mt-1 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>You will be redirected to GCash to complete your payment</li>
                      <li>Make sure you have sufficient balance in your GCash account</li>
                      <li>Keep your transaction reference for your records</li>
                      <li>You will receive a confirmation once payment is successful</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handlePayment(false)}
                disabled={isProcessing}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  'Pay with GCash'
                )}
              </button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      {paymentUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Redirecting to GCash</h3>
              <p className="text-sm text-gray-600 mb-4">
                You will be redirected to GCash to complete your payment. Please do not close this window.
              </p>
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
