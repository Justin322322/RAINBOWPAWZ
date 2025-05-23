'use client';

import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/classNames';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'fullscreen';
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  onBack?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  hideHeader?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'info';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  className = '',
  contentClassName = '',
  headerClassName = '',
  onBack,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  hideHeader = false,
  headerContent,
  footerContent,
  variant = 'default',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, closeOnEsc]);

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl',
    fullscreen: 'max-w-[80vw] max-h-[90vh]'
  };

  const variantClasses = {
    default: 'bg-[var(--primary-green)] text-white',
    danger: 'bg-red-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-600 text-white',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 mt-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative bg-white rounded-xl shadow-2xl w-full",
              sizeClasses[size],
              "max-h-[90vh] overflow-hidden flex flex-col",
              "z-[9999]",
              className
            )}
          >
            {!hideHeader && (headerContent || title) && (
              <div className={cn(
                variantClasses[variant],
                "px-6 py-4 flex justify-between items-center",
                headerClassName
              )}>
                {headerContent || (
                  <div className="flex items-center">
                    {onBack && (
                      <button
                        onClick={onBack}
                        className="text-white hover:text-white/80 transition-colors duration-200 mr-4 flex items-center"
                        aria-label="Go back"
                      >
                        <ArrowLeftIcon className="w-5 h-5" />
                      </button>
                    )}
                    {title && (
                      <h2
                        id="modal-title"
                        className="text-xl font-medium"
                      >
                        {title}
                      </h2>
                    )}
                  </div>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-white hover:text-white/80 transition-colors duration-200"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}

            <div className={cn(
              "px-6 py-4 overflow-y-auto flex-1",
              "max-h-[calc(90vh-120px)]",
              contentClassName
            )}>
              {children}
            </div>

            {footerContent && (
              <div className="px-6 py-4 border-t border-gray-200">
                {footerContent}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export { Modal };
