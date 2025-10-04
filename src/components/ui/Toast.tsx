'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseTime?: number;
}

export default function Toast({
  message,
  type = 'info',
  isVisible,
  onClose,
  autoClose = true,
  autoCloseTime = 3000,
}: ToastProps) {
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isVisible && autoClose && onClose) {
      timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, autoClose, autoCloseTime, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-100',
          text: 'text-green-600',
          icon: (
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-100',
          text: 'text-red-600',
          icon: (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-100',
          text: 'text-yellow-600',
          icon: (
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          text: 'text-blue-600',
          icon: (
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const styles = getToastStyles();

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
            layout: { duration: 0.15 }
          }}
          className={`toast-message w-full shadow-lg rounded-lg ${styles.bg} border ${styles.border} p-4 sm:p-5 mx-auto shadow-xl relative backdrop-blur-sm`}
          style={{ zIndex: 999999 }}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {styles.icon}
            </div>
            <div className="ml-3 sm:ml-4 flex-grow">
              <p className={`text-sm sm:text-base ${styles.text} leading-relaxed font-medium`}>{message}</p>
            </div>
            {onClose && (
              <div className="ml-2 sm:ml-4 flex-shrink-0 flex">
                <button
                  type="button"
                  className={`inline-flex ${styles.text} hover:opacity-75 focus:outline-none p-1`}
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


