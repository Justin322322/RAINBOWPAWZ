'use client';

import React, { ReactNode, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/classNames';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | '2xl' | 'fullscreen';
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  dialogClassName?: string; // Additional class names for the modal dialog container
  onBack?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  hideHeader?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'info';
  // Accessibility props
  ariaLabel?: string;
  ariaDescribedBy?: string;
  initialFocus?: React.RefObject<HTMLElement>;
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
  dialogClassName = '',
  onBack,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  hideHeader = false,
  headerContent,
  footerContent,
  variant = 'default',
  ariaLabel,
  ariaDescribedBy,
  initialFocus,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Generate unique ID for this modal instance to prevent duplicate IDs
  const modalTitleId = useMemo(() => `modal-title-${Math.random().toString(36).substring(2, 11)}`, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Add event listeners
      window.addEventListener('keydown', handleEscape);

      // Focus management
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, closeOnEsc, initialFocus]);

  // Separate useEffect for focus restoration
  useEffect(() => {
    // Only restore focus when the modal closes
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  const sizeClasses = {
    small: 'w-[98vw] sm:w-full max-w-md mx-4 sm:mx-auto',
    medium: 'w-[98vw] sm:w-full max-w-lg mx-4 sm:mx-auto',
    large: 'w-[98vw] sm:w-full max-w-2xl mx-4 sm:mx-auto',
    xlarge: 'w-[98vw] sm:w-full max-w-4xl mx-4 sm:mx-auto',
    '2xl': 'w-[98vw] sm:w-full max-w-5xl mx-4 sm:mx-auto', 
    fullscreen: 'w-[98vw] sm:w-full max-w-[95vw] sm:max-w-[80vw] max-h-[95vh] sm:max-h-[90vh] mx-2 sm:mx-auto'
  };

  const variantClasses = {
    default: 'bg-[var(--primary-green,#10b981)] text-white',
    danger: 'bg-red-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-600 text-white',
  };

  // Accessibility: use aria-labelledby only when the header (with title) is rendered.
  // If the header is hidden, fall back to aria-label (prefer explicit prop, else use title).
  // Ensure every modal has an accessible name by providing a default label when needed.
  const shouldUseAriaLabelledBy = Boolean(title) && !hideHeader;
  const computedAriaLabel = ariaLabel ?? (!shouldUseAriaLabelledBy && title ? title : undefined);

  // Runtime check: ensure modal has an accessible name
  const hasAccessibleName = shouldUseAriaLabelledBy || computedAriaLabel;

  // Provide fallback label when hideHeader is true and no accessible name is available
  const finalAriaLabel = computedAriaLabel || (hideHeader && !hasAccessibleName ? 'Dialog' : computedAriaLabel);

  // Development warning for accessibility issues
  if (process.env.NODE_ENV === 'development' && !hasAccessibleName && hideHeader && !finalAriaLabel) {
    console.warn('Modal: Missing accessible name. When hideHeader is true, provide either ariaLabel or title prop for accessibility.');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={shouldUseAriaLabelledBy ? modalTitleId : undefined}
          aria-label={finalAriaLabel}
          aria-describedby={ariaDescribedBy}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          <motion.div
            ref={modalRef}
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "relative bg-white rounded-xl shadow-2xl",
              sizeClasses[size],
              // Make mobile layout more spacious; ensure full width on >= sm within max-w
              "max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col",
              "z-[9999] focus:outline-none",
              className,
              dialogClassName // For backward compatibility
            )}
            tabIndex={-1}
          >
            {!hideHeader && (headerContent || title) && (
              <div className={cn(
                variantClasses[variant],
                "px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center",
                headerClassName
              )}>
                {headerContent || (
                  <div className="flex items-center min-w-0 flex-1">
                    {onBack && (
                      <button
                        onClick={onBack}
                        className="text-white hover:text-white/80 transition-colors duration-200 mr-2 sm:mr-4 flex items-center flex-shrink-0"
                        aria-label="Go back"
                      >
                        <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    {title && (
                      <h2
                        id={modalTitleId}
                        className="text-lg sm:text-xl font-medium truncate"
                      >
                        {title}
                      </h2>
                    )}
                  </div>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-white hover:text-white/80 transition-colors duration-200 flex-shrink-0 ml-2 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-md p-1"
                    aria-label="Close modal"
                    type="button"
                  >
                    <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
              </div>
            )}

            <div className={cn(
              "px-4 sm:px-6 py-4 overflow-y-auto flex-1",
              "max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]",
              contentClassName
            )}>
              {children}
            </div>

            {footerContent && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
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
