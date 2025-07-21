'use client';

import React, { useState } from 'react';
import { Modal, Input, Button, Alert } from '@/components/ui';
import { ArrowRightIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [requestSent, setRequestSent] = useState(false);

  const handleClose = () => {
    setEmail('');
    setErrorMessage('');
    setSuccessMessage('');
    setRequestSent(false);
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

      if (!response.ok) {
        if (response.status === 404 && data.error === 'No account exists with this email address.') {
          setErrorMessage('No account exists with this email. Please check your spelling or sign up.');
        } else {
          setErrorMessage(data.error || 'Failed to send reset instructions. Please try again.');
        }
        return;
      }

      setSuccessMessage(data.message || 'If an account exists for this email, you will receive password reset instructions.');
      setRequestSent(true);
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    handleClose();
    onShowLogin();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      onBack={handleBackToLogin}
      size="small"
    >
      <div className="relative p-6 pt-10">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-2 rounded-full hover:bg-gray-100"
          aria-label="Close modal"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <AnimatePresence mode="wait">
        {requestSent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">Request Sent!</h2>
              <p className="text-gray-600 mt-2 mb-6">
                {successMessage}
              </p>
              <Button
                onClick={handleBackToLogin}
                fullWidth
                size="lg"
                className="bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] text-white font-bold"
              >
                Back to Login
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Reset Your Password</h2>
                <p className="text-gray-500 mt-2">
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6">
                  <Alert variant="error" title="Error" onClose={() => setErrorMessage('')} dismissible>
                    <p>{errorMessage}</p>
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  size="lg"
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                  className="bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] text-white font-bold tracking-wide flex items-center justify-center group"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                  {!isLoading && <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>
              <div className="text-center text-md text-gray-500 mt-8">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleBackToLogin}
                  className="font-semibold text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] p-0"
                >
                  &larr; Back to Log in
                </Button>
              </div>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;
