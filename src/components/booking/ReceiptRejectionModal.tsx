'use client';

import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ReceiptRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  bookingId: number;
  petName: string;
  isRejecting: boolean;
}

const ReceiptRejectionModal: React.FC<ReceiptRejectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  petName,
  isRejecting
}) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [error, setError] = useState('');

  const predefinedReasons = [
    'Receipt image is unclear or blurry',
    'Receipt amount does not match booking total',
    'Receipt is not for this booking',
    'Receipt appears to be fraudulent',
    'Receipt is missing required information',
    'Receipt format is not accepted',
    'Other'
  ];

  const handleConfirm = async () => {
    const finalReason = selectedReason === 'Other' ? reason : selectedReason;
    
    if (!finalReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setError('');
    await onConfirm(finalReason);
  };

  const handleClose = () => {
    if (!isRejecting) {
      setReason('');
      setSelectedReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Reject Payment Receipt
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    disabled={isRejecting}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="mt-2">
                  <div className="flex items-center p-4 mb-4 text-red-800 bg-red-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p className="text-sm">
                      Are you sure you want to reject the payment receipt for <strong>{petName}</strong>?
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for rejection <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {predefinedReasons.map((reasonOption) => (
                          <label
                            key={reasonOption}
                            className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="radio"
                              name="rejection-reason"
                              value={reasonOption}
                              checked={selectedReason === reasonOption}
                              onChange={(e) => {
                                setSelectedReason(e.target.value);
                                setError('');
                              }}
                              disabled={isRejecting}
                              className="h-4 w-4 text-red-600 focus:ring-red-600 border-gray-300"
                            />
                            <span className="ml-3 text-sm text-gray-700">{reasonOption}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {selectedReason === 'Other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Please specify the reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                          }}
                          disabled={isRejecting}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:bg-gray-100"
                          placeholder="Please provide details about why the receipt is being rejected..."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isRejecting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isRejecting || (!selectedReason || (selectedReason === 'Other' && !reason.trim()))}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:bg-gray-400"
                  >
                    {isRejecting ? 'Rejecting...' : 'Reject Receipt'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ReceiptRejectionModal;
