'use client';

import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { REFUND_STATUS } from '@/types/refund';

interface RefundStatusProps {
  status: string;
  amount?: number | string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
  transactionId?: string;
  notes?: string;
  className?: string;
}

export default function RefundStatus({
  status,
  amount,
  reason,
  createdAt,
  updatedAt,
  transactionId,
  notes,
  className = ''
}: RefundStatusProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case REFUND_STATUS.PENDING:
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending',
          description: 'Refund request is being reviewed'
        };
      case REFUND_STATUS.PROCESSING:
        return {
          icon: ArrowPathIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Processing',
          description: 'Refund is being processed by payment provider'
        };
      case REFUND_STATUS.PROCESSED:
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Completed',
          description: 'Refund has been successfully processed'
        };
      case REFUND_STATUS.FAILED:
        return {
          icon: ExclamationCircleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Failed',
          description: 'Refund processing failed'
        };
      case REFUND_STATUS.CANCELLED:
        return {
          icon: XCircleIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Cancelled',
          description: 'Refund request was cancelled'
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          description: 'Unknown refund status'
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent
            className={`h-6 w-6 ${config.color} ${status === REFUND_STATUS.PROCESSING ? 'animate-spin' : ''}`}
          />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${config.color}`}>
              Refund {config.label}
            </h3>
            {amount && (
              <span className="text-sm font-medium text-gray-900">
                ₱{parseFloat(amount.toString()).toFixed(2)}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-600">
            {config.description}
          </p>

          {reason && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Reason:</span> {reason}
            </p>
          )}

          {notes && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Notes:</span> {notes}
            </p>
          )}

          <div className="mt-3 space-y-1 text-xs text-gray-500">
            {createdAt && (
              <p>
                <span className="font-medium">Requested:</span>{' '}
                {new Date(createdAt).toLocaleString()}
              </p>
            )}
            {updatedAt && updatedAt !== createdAt && (
              <p>
                <span className="font-medium">Last Updated:</span>{' '}
                {new Date(updatedAt).toLocaleString()}
              </p>
            )}
            {transactionId && (
              <p>
                <span className="font-medium">Transaction ID:</span> {transactionId}
              </p>
            )}
          </div>

          {/* Processing timeline for different statuses */}
          {status === REFUND_STATUS.PROCESSING && (
            <div className="mt-3 text-xs text-blue-600">
              <p>⏱️ Processing time: 5-10 business days for GCash payments</p>
            </div>
          )}

          {status === REFUND_STATUS.PROCESSED && (
            <div className="mt-3 text-xs text-green-600">
              <p>✅ Refund completed successfully</p>
            </div>
          )}

          {status === REFUND_STATUS.FAILED && (
            <div className="mt-3 text-xs text-red-600">
              <p>❌ Please contact support for assistance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
