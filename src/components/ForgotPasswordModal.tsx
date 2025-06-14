'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { motion } from 'framer-motion';
import { sendPasswordResetEmail } from '@/lib/emailService';
import { Button, Input } from '@/components/ui';

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onShowLogin: () => void;
};

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onShowLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleClose = () => {
    setEmail('');
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Call the forgot-password API endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // Handle the "No account exists" error as a user-friendly message
      if (!response.ok) {
        if (response.status === 404 && data.error === 'No account exists with this email address.') {
          setErrorMessage('No account exists with this email address. Please check your email or create a new account.');
          return;
        }
        throw new Error(data.error || 'Failed to send reset instructions');
      }

      setSuccessMessage(data.message || 'Password reset instructions have been sent to your email.');

      // Automatically return to login after success
      setTimeout(() => {
        handleClose();
        onShowLogin();
      }, 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send reset instructions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    handleClose();
    onShowLogin();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password" size="small">
      <div className="space-y-6">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 p-4 rounded-lg border border-red-100"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-red-600">{errorMessage}</p>
            </div>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 p-4 rounded-lg border border-green-100"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-green-600">{successMessage}</p>
            </div>
          </motion.div>
        )}

        <p className="text-gray-600 dark:text-gray-400 text-center font-light">
          Enter your email address and we&apos;ll send you instructions to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            id="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            rounded="default"
            size="lg"
            labelClassName="font-light"
          />

          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            fullWidth
            size="lg"
            rounded="default"
            className="font-light tracking-wide text-lg"
          >
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </Button>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-light">
            Remember your password?{' '}
            <Button
              type="button"
              variant="link"
              onClick={handleLoginClick}
              className="font-medium p-0"
            >
              Log in
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;