'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { sendPasswordResetEmail } from '../lib/emailService';

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
      // Generate a random token (in a real app, store this in your database)
      const resetToken = Math.random().toString(36).substring(2, 15);

      await sendPasswordResetEmail(email, resetToken);
      setSuccessMessage('Password reset instructions have been sent to your email.');

      // Automatically return to login after success
      setTimeout(() => {
        handleClose();
        onShowLogin();
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error);
      setErrorMessage('Failed to send reset instructions. Please try again.');
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
          Enter your email address and we'll send you instructions to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-light text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent transition-all duration-200 font-light"
              placeholder="Enter your email address"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full bg-[var(--primary-green)] text-white py-4 px-6 rounded-full
              hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2
              focus:ring-offset-2 focus:ring-[var(--primary-green)] transition-all duration-200
              flex items-center justify-center space-x-2 font-light tracking-wide text-lg
              ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              'Send Reset Instructions'
            )}
          </button>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-light">
            Remember your password?{' '}
            <button
              type="button"
              onClick={handleLoginClick}
              className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] font-medium transition-colors duration-200"
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;