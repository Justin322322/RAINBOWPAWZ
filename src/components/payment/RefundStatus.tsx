'use client';

import React from 'react';
import Image from 'next/image';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface RefundStatusProps {
  refund: {
    id: number;
    amount: number;
    reason: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    receipt_path?: string;
    notes?: string;
    initiated_at: string;
    processed_at?: string;
    completed_at?: string;
  };
}

export default function RefundStatus({ refund }: RefundStatusProps) {
  const getStatusConfig = () => {
    switch (refund.status) {
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Refund Completed'
        };
      case 'processing':
        return {
          icon: ClockIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Processing Refund'
        };
      case 'pending':
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Refund Pending'
        };
      case 'failed':
      case 'cancelled':
        return {
          icon: XCircleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Refund Failed'
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown Status'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`rounded-xl border-2 ${statusConfig.borderColor} ${statusConfig.bgColor} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <StatusIcon className={`h-8 w-8 ${statusConfig.color}`} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{statusConfig.label}</h3>
          <p className="text-sm text-gray-600">
            Requested on {new Date(refund.initiated_at).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Refund Amount</p>
              <p className="text-lg font-bold text-gray-900">
                ₱{refund.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                refund.status === 'completed' ? 'bg-green-100 text-green-800' :
                refund.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                refund.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {refund.reason && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Reason</p>
            <p className="text-sm text-gray-700">{refund.reason}</p>
          </div>
        )}

        {refund.notes && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Provider Notes</p>
            <p className="text-sm text-gray-700">{refund.notes}</p>
          </div>
        )}

        {refund.receipt_path && refund.status === 'completed' && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">Refund Receipt</p>
              </div>
              <a
                href={refund.receipt_path}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download
              </a>
            </div>
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={refund.receipt_path}
                alt="Refund Receipt"
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}

        {refund.status === 'pending' && (
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              Your refund request is being reviewed by the business. You&apos;ll be notified once it&apos;s processed.
            </p>
          </div>
        )}

        {refund.status === 'completed' && refund.completed_at && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-sm text-green-800">
              Refund completed on {new Date(refund.completed_at).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
