'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  icon?: React.ReactNode;
  successMessage?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
  successMessage = 'Action completed successfully!',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const variantToButtonVariant = {
    default: 'primary',
    danger: 'danger',
    warning: 'primary',
    success: 'primary',
    info: 'primary',
  } as const;

  const handleConfirm = async () => {
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
    } catch {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      variant={variant}
    >
      <div className="flex items-start mb-4">
        {icon && (
          <div className="mr-3 flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="text-sm text-gray-600">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
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
            <p className="text-sm text-gray-600 text-center">{successMessage}</p>
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
            className="mt-5 sm:mt-6 flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3"
          >
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              fullWidth
            >
              {cancelText}
            </Button>
            <Button
              variant={variantToButtonVariant[variant]}
              onClick={handleConfirm}
              isLoading={isLoading}
              fullWidth
            >
              {confirmText}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};


