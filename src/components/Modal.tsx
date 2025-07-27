'use client';

import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | '2xl' | 'fullscreen';
  dialogClassName?: string;
  closeOnOverlayClick?: boolean;
  className?: string;
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'medium',
  dialogClassName = '',
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    small: 'max-w-md w-full',
    medium: 'max-w-lg w-full',
    large: 'max-w-2xl w-full',
    xlarge: 'max-w-4xl w-full',
    '2xl': 'max-w-5xl w-full',
    fullscreen: 'w-[95vw] h-[95vh]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden ${sizeClasses[size]} ${dialogClassName}`}
            style={{ maxHeight: '90vh' }}
          >
            {(title || closeOnOverlayClick) && (
              <div className="bg-[var(--primary-green)] text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
                {title && (
                  <h2 id="modal-title" className="text-lg sm:text-xl font-medium text-white">
                    {title}
                  </h2>
                )}
                {closeOnOverlayClick && (
                   <button
                   onClick={onClose}
                   className="text-white hover:text-white/80 transition-colors duration-200 flex-shrink-0 ml-2"
                   aria-label="Close modal"
                 >
                   <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                 </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto p-6 flex-grow">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
