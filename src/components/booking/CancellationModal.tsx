'use client';

import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  petName: string;
  isCancelling: boolean;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  petName,
  isCancelling
}) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [error, setError] = useState('');

  const predefinedReasons = [
    'Change of plans',
    'Found another service provider',
    'Financial reasons',
    'Pet condition improved',
    'Scheduling conflict',
    'Other'
  ];

  const handleConfirm = async () => {
    const finalReason = selectedReason === 'Other' ? reason : selectedReason;
    
    if (!finalReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    setError('');
    await onConfirm(finalReason);
  };

  const handleClose = () => {
    if (!isCancelling) {
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
                    Cancel Booking
                  </Dialog.Title>
                  {!isCancelling && (
                    <button
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  )}
                </div>

                <div className="mt-2">
                  <div className="flex items-center p-4 mb-4 text-yellow-800 bg-yellow-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p className="text-sm">
                      Are you sure you want to cancel the booking for <strong>{petName}</strong>?
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for cancellation <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {predefinedReasons.map((reasonOption) => (
                          <label
                            key={reasonOption}
                            className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="radio"
                              name="cancellation-reason"
                              value={reasonOption}
                              checked={selectedReason === reasonOption}
                              onChange={(e) => {
                                setSelectedReason(e.target.value);
                                setError('');
                              }}
                              disabled={isCancelling}
                              className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300"
                            />
                            <span className="ml-3 text-sm text-gray-700">{reasonOption}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {selectedReason === 'Other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Please specify
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                          }}
                          disabled={isCancelling}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent"
                          placeholder="Please provide more details..."
                        />
                      </div>
                    )}

                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isCancelling}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Booking
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isCancelling || !selectedReason}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
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

export default CancellationModal;
