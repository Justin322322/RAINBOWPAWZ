'use client';

import React, { useState } from 'react';
import { ArrowPathIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';

interface RefundRequestProps {
  bookingId: number;
  amount: number;
  onRefundRequested?: () => void;
}

export default function RefundRequest({ bookingId, amount, onRefundRequested }: RefundRequestProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { showToast } = useToast();

  const handleRequestRefund = async () => {
    if (!reason.trim()) {
      showToast('Please provide a reason for the refund', 'error');
      return;
    }

    setIsRequesting(true);
    try {
      const response = await fetch('/api/bookings/refund-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId,
          amount,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Refund request submitted successfully', 'success');
        setShowForm(false);
        setReason('');
        onRefundRequested?.();
      } else {
        showToast(data.error || 'Failed to submit refund request', 'error');
      }
    } catch (error) {
      console.error('Refund request error:', error);
      showToast('Failed to submit refund request', 'error');
    } finally {
      setIsRequesting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <ArrowPathIcon className="h-5 w-5" />
        Request Refund
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-red-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ArrowPathIcon className="h-6 w-6 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Request Refund</h3>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Refund Amount: <span className="font-bold text-gray-900">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        <div>
          <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Refund <span className="text-red-500">*</span>
          </label>
          <textarea
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Please explain why you're requesting a refund..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div className="flex items-start gap-2">
            <DocumentTextIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Refund Process:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Your request will be reviewed by the business</li>
                <li>If approved, you&apos;ll receive a refund receipt</li>
                <li>Processing time: 3-5 business days</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRequestRefund}
            disabled={isRequesting || !reason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Submit Request
              </>
            )}
          </button>
          <button
            onClick={() => {
              setShowForm(false);
              setReason('');
            }}
            disabled={isRequesting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
