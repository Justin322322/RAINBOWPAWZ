'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ExclamationTriangleIcon, CurrencyDollarIcon, CalendarIcon, ClockIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/contexts/ToastContext';
import { REFUND_REASONS } from '@/types/refund';

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: number;
    pet_name: string;
    booking_date: string;
    booking_time: string;
    price: number;
    payment_method: string;
    status: string;
  };
  onRefundRequested?: () => void;
}

export default function RefundRequestModal({
  isOpen,
  onClose,
  booking,
  onRefundRequested
}: RefundRequestModalProps) {
  const [reason, setReason] = useState<string>(REFUND_REASONS.USER_REQUESTED);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          notes: notes.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Refund request submitted successfully', 'success');
        onRefundRequested?.();
        onClose();
      } else {
        showToast(data.error || 'Failed to submit refund request', 'error');
      }
    } catch (error) {
      console.error('Error submitting refund request:', error);
      showToast('Failed to submit refund request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[95vh] overflow-hidden shadow-2xl transform transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-white">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Refund Request</h2>
              <p className="text-red-100 text-sm">Submit your refund request for review</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(95vh-140px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Booking Details */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                </div>
                Booking Details
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600">Pet Name</span>
                  <span className="font-medium text-gray-900">{booking.pet_name}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Date
                  </span>
                  <span className="font-medium text-gray-900">{new Date(booking.booking_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Time
                  </span>
                  <span className="font-medium text-gray-900">{booking.booking_time}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                    Amount
                  </span>
                  <span className="font-bold text-green-600">₱{parseFloat(booking.price.toString()).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center">
                    <CreditCardIcon className="h-4 w-4 mr-1" />
                    Payment Method
                  </span>
                  <span className="font-medium text-gray-900 uppercase">{booking.payment_method}</span>
                </div>
              </div>
            </div>

            {/* Process Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-lg mr-4 flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-3">Refund Process Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-blue-800">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                      <span>Review within 1-2 business days</span>
                    </div>
                    <div className="flex items-center text-sm text-blue-800">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                      <span>Email notification upon approval</span>
                    </div>
                    <div className="flex items-center text-sm text-blue-800">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                      <span>5-10 business days for GCash refunds</span>
                    </div>
                    <div className="flex items-center text-sm text-blue-800">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                      <span>Cash refunds coordinated with support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason Selection */}
            <div>
              <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 mb-3">
                Reason for Refund *
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-gray-50 hover:bg-white"
                required
              >
                <option value={REFUND_REASONS.USER_REQUESTED}>Customer requested cancellation</option>
                <option value={REFUND_REASONS.SERVICE_UNAVAILABLE}>Service no longer available</option>
                <option value={REFUND_REASONS.TECHNICAL_ISSUE}>Technical issue with booking</option>
                <option value={REFUND_REASONS.DUPLICATE_BOOKING}>Duplicate booking</option>
                <option value={REFUND_REASONS.OTHER}>Other reason</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-3">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-gray-50 hover:bg-white resize-none"
                placeholder="Please provide any additional details about your refund request..."
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the document body level
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
