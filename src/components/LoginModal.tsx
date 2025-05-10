'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import ForgotPasswordModal from './ForgotPasswordModal';
import { setAuthToken, redirectToDashboard } from '@/utils/auth';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onShowSignup: () => void;
};

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onShowSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  const handleClose = () => {
    setErrorMessage('');
    setEmail('');
    setPassword('');
    onClose();
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsForgotPasswordModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      // Use Next.js API route
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      if (!response) {
        throw new Error("Cannot connect to the server. Please check your network connection.");
      }

      // Get response as text first to handle potential JSON parsing errors
      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        // For 401 Unauthorized (invalid credentials), show the specific error message from the API
        if (response.status === 401) {
          setErrorMessage(data.message || 'Invalid email or password. Please try again.');
          return; // Don't throw an error, just show the message
        }

        // For 500 Server Error, show a more user-friendly message
        if (response.status === 500) {
          setErrorMessage('Server error. Please try again later or contact support if the problem persists.');
          return;
        }

        throw new Error(data.error || data.message || 'Login failed');
      }

      // Validate the response data
      if (!data.success || !data.user || !data.account_type) {
        throw new Error('Invalid response from server. Please try again.');
      }

      // Close the modal
      handleClose();

      // Get user ID and account type from response
      const userId = data.user.id;
      const accountType = data.account_type;

      if (!userId) {
        throw new Error('User ID missing from login response');
      }

      // Set the auth token cookie with a 30-day expiration
      // First clear any existing auth token to avoid conflicts
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Now set the new token
      setAuthToken(userId.toString(), accountType, 30);

      // Use a delay to ensure the cookie is set before redirecting
      setTimeout(() => {
        // Redirect to the appropriate dashboard
        const dashboardUrl = redirectToDashboard(accountType);

        // Use window.location.replace for a cleaner redirect (no history entry for the login page)
        window.location.replace(dashboardUrl);
      }, 300);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Connection error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Welcome Back" size="small">
        <div className="space-y-8">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 p-4 rounded-lg border border-red-100"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-grow">
                  <h3 className="text-sm font-medium text-red-800">Login Error</h3>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                  {errorMessage.includes('Incorrect password') && (
                    <p className="text-xs text-red-600 mt-1">
                      Tip: If you've forgotten your password, click "Forgot password?" below.
                    </p>
                  )}
                  {errorMessage.includes('No account exists') && (
                    <p className="text-xs text-red-600 mt-1">
                      Tip: Check your spelling or <button
                        type="button"
                        onClick={onShowSignup}
                        className="text-red-700 underline hover:text-red-800"
                      >
                        create a new account
                      </button>.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="ml-auto flex-shrink-0 text-red-400 hover:text-red-500 focus:outline-none"
                  onClick={() => setErrorMessage('')}
                  aria-label="Dismiss error"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-light text-gray-700">
                Email or Username
              </label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent transition-all duration-200 font-light"
                placeholder="Enter your email or username"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-light text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent transition-all duration-200 font-light"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-light text-gray-600">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="font-light text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>
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
                  <span>Logging in...</span>
                </>
              ) : (
                'Login'
              )}
            </button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-light">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onShowSignup}
                className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] font-medium transition-colors duration-200"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        onShowLogin={() => {
          setIsForgotPasswordModalOpen(false);
          setIsLoading(false);
          setEmail('');
          setPassword('');
          setErrorMessage('');
        }}
      />
    </>
  );
};

export default LoginModal;