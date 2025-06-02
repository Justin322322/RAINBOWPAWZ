'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface RestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (duration: string, reason: string) => void;
  title: string;
  message: string;
  confirmText: string;
  confirmButtonClass?: string;
  isProcessing?: boolean;
}

const RestrictionModal: React.FC<RestrictionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  isProcessing = false
}) => {
  const [duration, setDuration] = useState('indefinite');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(duration, reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={isProcessing}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">{message}</p>

          <div className="mb-4">
            <label htmlFor="restriction-duration" className="block text-sm font-medium text-gray-700 mb-1">
              Restriction Duration
            </label>
            <select
              id="restriction-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isProcessing}
            >
              <option value="indefinite">Indefinite</option>
              <option value="1_week">1 Week</option>
              <option value="2_weeks">2 Weeks</option>
              <option value="1_month">1 Month</option>
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="restriction-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Restriction Reason
            </label>
            <textarea
              id="restriction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              rows={3}
              placeholder="Enter reason for restriction..."
              disabled={isProcessing}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
              disabled={isProcessing || !reason.trim()}
            >
              {isProcessing ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestrictionModal;
