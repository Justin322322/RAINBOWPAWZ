'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowPathIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface DeclineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecline: (reason: string, requestDocuments: boolean) => Promise<void>;
  title?: string;
  minLength?: number;
}

const DeclineModal: React.FC<DeclineModalProps> = ({
  isOpen,
  onClose,
  onDecline,
  title = 'Decline Application',
  minLength = 10
}) => {
  const [reason, setReason] = useState('');
  const [requestDocuments, setRequestDocuments] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < minLength) {
      setError(`Please provide a more detailed reason (minimum ${minLength} characters)`);
      return;
    }

    setIsLoading(true);
    try {
      await onDecline(reason, requestDocuments);
      setIsSuccess(true);

      // Wait for success animation before closing
      setTimeout(() => {
        onClose();
        // Reset states after closing
        setTimeout(() => {
          setIsLoading(false);
          setIsSuccess(false);
          setReason('');
          setRequestDocuments(false);
        }, 300);
      }, 1500);
    } catch (_error) {
      setIsLoading(false);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 md:p-6"
          style={{ zIndex: 9999 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center py-4"
                  >
                    <motion.div
                      className={`w-16 h-16 rounded-full ${requestDocuments ? 'bg-amber-100' : 'bg-red-100'} flex items-center justify-center mb-4`}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      {requestDocuments ? (
                        <CheckIcon className="h-8 w-8 text-amber-500" />
                      ) : (
                        <XCircleIcon className="h-8 w-8 text-red-500" />
                      )}
                    </motion.div>
                    <p className="text-sm text-gray-600 text-center font-medium">
                      {requestDocuments ? 'Documents requested successfully!' : 'Application declined successfully!'}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                      <motion.div
                        className={`h-1.5 rounded-full ${requestDocuments ? 'bg-amber-500' : 'bg-red-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="mb-4">
                      <label htmlFor="decline-reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Please provide a reason for declining (minimum {minLength} characters):
                      </label>
                      <textarea
                        id="decline-reason"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (error && e.target.value.trim().length >= minLength) {
                            setError('');
                          }
                        }}
                        placeholder="Enter your reason here..."
                        disabled={isLoading}
                      />
                      {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                      )}
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center">
                        <input
                          id="request-documents"
                          name="request-documents"
                          type="checkbox"
                          checked={requestDocuments}
                          onChange={(e) => setRequestDocuments(e.target.checked)}
                          className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300 rounded"
                          disabled={isLoading}
                        />
                        <label htmlFor="request-documents" className="ml-2 block text-sm text-gray-700">
                          Request additional documents instead of rejecting
                        </label>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onClose}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSubmit}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Processing...
                          </>
                        ) : (
                          requestDocuments ? 'Request Documents' : 'Decline Application'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeclineModal;
