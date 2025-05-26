'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-green-600 hover:bg-green-700',
  icon = null
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
              <div className="flex items-center mb-4">
                {icon && (
                  <div className="mr-3 flex-shrink-0">
                    {icon}
                  </div>
                )}
                <p className="text-sm text-gray-600">{message}</p>
              </div>

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
                      className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <CheckIcon className="h-8 w-8 text-green-500" />
                    </motion.div>
                    <p className="text-sm text-gray-600 text-center">Action completed successfully!</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                      <motion.div
                        className="bg-green-500 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="buttons"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3"
                  >
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] sm:text-sm"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      {cancelText}
                    </button>
                    <button
                      type="button"
                      className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm ${confirmButtonClass} ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          await onConfirm();
                          setIsSuccess(true);
                          // Wait for success animation before closing
                          setTimeout(() => {
                            onClose();
                            // Reset states after closing
                            setTimeout(() => {
                              setIsLoading(false);
                              setIsSuccess(false);
                            }, 300);
                          }, 1500);
                        } catch (error) {
                          setIsLoading(false);
                          onClose();
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Processing...
                        </>
                      ) : (
                        confirmText
                      )}
                    </button>
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

export default ConfirmationModal;
