'use client';

import { useState } from 'react';
import { RefundListItem } from '@/types/payment';

interface RefundCardProps {
  refund: RefundListItem;
  onAction: () => void;
}

export function RefundCard({ refund, onAction: _onAction }: RefundCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Refund #{refund.id}
          </h3>
          <p className="text-sm text-gray-600">
            Booking #{refund.booking_id}
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {refund.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Amount</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(refund.amount)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Payment Method</p>
          <p className="text-sm text-gray-900 capitalize">
            {refund.payment_method}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          onClick={() => setShowDetailModal(true)}
        >
          View Details
        </button>
      </div>

      {/* Simple modal placeholder */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Refund Details</h2>
            <p className="mb-4">Refund ID: {refund.id}</p>
            <p className="mb-4">Amount: {formatCurrency(refund.amount)}</p>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
