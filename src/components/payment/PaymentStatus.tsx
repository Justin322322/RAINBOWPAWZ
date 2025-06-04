'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface PaymentStatusProps {
  bookingId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatusChange?: (status: string) => void;
  showDetails?: boolean;
}

interface PaymentData {
  transaction_id?: number;
  booking_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  provider: string;
  created_at?: string;
  updated_at?: string;
  service_name?: string;
  provider_name?: string;
  pet_name?: string;
  failure_reason?: string;
}

export default function PaymentStatus({
  bookingId,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  onStatusChange,
  showDetails = true
}: PaymentStatusProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPaymentStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/payments/status?booking_id=${bookingId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const newStatus = data.data.status;
        const oldStatus = paymentData?.status;

        setPaymentData(data.data);
        setLastUpdated(new Date());

        // Call status change callback if status changed
        if (onStatusChange && newStatus !== oldStatus) {
          onStatusChange(newStatus);
        }
      } else {
        setError(data.error || 'Failed to fetch payment status');
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      setError('Failed to fetch payment status');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, paymentData?.status, onStatusChange]);

  useEffect(() => {
    fetchPaymentStatus();

    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh) {
      interval = setInterval(fetchPaymentStatus, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchPaymentStatus, autoRefresh, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      case 'pending':
      case 'processing':
        return <ClockIcon className="h-6 w-6 text-yellow-600" />;
      case 'failed':
        return <XCircleIcon className="h-6 w-6 text-red-600" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Payment Successful';
      case 'pending':
        return 'Payment Pending';
      case 'processing':
        return 'Processing Payment';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      default:
        return 'Unknown Status';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin mr-2" />
          <span className="text-gray-600">Loading payment status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600">
          <XCircleIcon className="h-6 w-6 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchPaymentStatus}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600">
          No payment information found for this booking.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {getStatusIcon(paymentData.status)}
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {getStatusText(paymentData.status)}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(paymentData.status)}`}>
              {paymentData.status.charAt(0).toUpperCase() + paymentData.status.slice(1)}
            </span>
          </div>
        </div>

        {autoRefresh && (
          <button
            onClick={fetchPaymentStatus}
            className="text-gray-400 hover:text-gray-600"
            title="Refresh status"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {showDetails && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-medium">
                ₱{Number(paymentData.amount).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Method:</span>
              <span className="ml-2 font-medium capitalize">
                {paymentData.payment_method}
              </span>
            </div>
            {paymentData.transaction_id && (
              <div>
                <span className="text-gray-600">Transaction ID:</span>
                <span className="ml-2 font-medium">#{paymentData.transaction_id}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Provider:</span>
              <span className="ml-2 font-medium capitalize">{paymentData.provider}</span>
            </div>
          </div>

          {paymentData.service_name && (
            <div className="text-sm">
              <span className="text-gray-600">Service:</span>
              <span className="ml-2 font-medium">{paymentData.service_name}</span>
              {paymentData.pet_name && (
                <span className="text-gray-500"> for {paymentData.pet_name}</span>
              )}
            </div>
          )}

          {paymentData.failure_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Failure Reason:</strong> {paymentData.failure_reason}
              </p>
            </div>
          )}

          {lastUpdated && (
            <div className="text-xs text-gray-500 pt-2 border-t">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
