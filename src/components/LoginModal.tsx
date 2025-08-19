'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Input, Button, Checkbox, Alert } from '@/components/ui';
import { EyeIcon, EyeSlashIcon, ArrowRightIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import ForgotPasswordModal from './ForgotPasswordModal';
import { redirectToDashboard } from '@/utils/auth';
import { useToast } from '@/context/ToastContext';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onShowSignup: () => void;
};

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onShowSignup }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [userName, setUserName] = useState('');
  const redirectTimeoutRef = useRef<number | null>(null);

  // Clear any pending redirect timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

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
      } catch {
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        // Handle all error cases with inline error messages only
        if (response.status === 401) {
          setErrorMessage(data.message || 'Invalid email or password. Please try again.');
        } else if (response.status === 500) {
          setErrorMessage('Server error. Please try again later or contact support if the problem persists.');
        } else {
          setErrorMessage(data.error || data.message || 'Login failed. Please try again.');
        }
        return;
      }

      // Validate the response data
      if (!data.success || !data.user || !data.account_type) {
        setErrorMessage('Invalid response from server. Please try again.');
        return;
      }

      // Get user ID and account type from response
      const userId = data.user.id;
      const accountType = data.account_type;
      const isRestricted = data.isRestricted;
      // Note: No token in response - using secure httpOnly cookies instead
      const firstName = data.user.first_name || '';
      const lastName = data.user.last_name || '';

      if (!userId) {
        throw new Error('User ID missing from login response');
      }

      // With secure authentication, we don't need to handle tokens client-side
      // The server has already set secure httpOnly cookies for us
      // We can just proceed with the user data

      // Set success state and user name for the success animation
      setUserName(firstName ? `${firstName} ${lastName}` : email.split('@')[0]);
      setLoginSuccess(true);

      // Show success toast
      showToast('Login successful! Redirecting to your dashboard...', 'success');

      // Redirect to the appropriate dashboard after a delay for the animation
      if (redirectTimeoutRef.current !== null) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      redirectTimeoutRef.current = window.setTimeout(() => {
        let redirectUrl;

        if (isRestricted) {
          // Redirect restricted users to their respective restricted pages
          if (accountType === 'business') {
            redirectUrl = '/cremation/restricted';
          } else {
            redirectUrl = '/restricted';
          }
        } else {
          // Normal dashboard redirect for non-restricted users
          redirectUrl = redirectToDashboard(accountType);
        }

        // Use window.location.replace for a cleaner redirect
        window.location.replace(redirectUrl);
      }, 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Connection error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        size="medium"
        dialogClassName="sm:max-w-[514px]"
      >
        <div className="relative">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-2 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        <AnimatePresence mode="wait">
          {loginSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-8 flex flex-col items-center justify-center text-center"
            >
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome back{userName ? `, ${userName}` : ''}!</h2>
              <p className="text-gray-600 mb-6">You&apos;ve successfully logged in. Redirecting...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <motion.div
                  className="bg-green-500 h-2.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="login-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 pt-10"
            >
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
                <p className="text-gray-500 mt-2">Sign in to continue your journey with us.</p>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <Alert
                    variant="error"
                    title="Login Error"
                    onClose={() => setErrorMessage('')}
                    dismissible
                  >
                    <p>{errorMessage}</p>
                  </Alert>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  size="lg"
                  className="transition-all duration-300"
                />

                <Input
                  label="Password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  size="lg"
                  className="transition-all duration-300"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-[var(--primary-green)] transition-colors"
                    >
                      {showPassword ? <EyeSlashIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                    </button>
                  }
                />

                <div className="flex items-center justify-between">
                  <Checkbox
                    id="remember-me"
                    name="remember-me"
                    label="Remember me"
                    labelClassName="font-normal text-gray-600"
                    checkboxSize="md"
                  />
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleForgotPasswordClick}
                    className="font-semibold text-[var(--primary-green)] hover:text-[var(--primary-green-hover)]"
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                  className="bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] text-white font-bold tracking-wide flex items-center justify-center group"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                  {!isLoading && <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>

                <div className="text-center text-md text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Button
                    type="button"
                    variant="link"
                    onClick={onShowSignup}
                    className="font-semibold text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] p-0"
                  >
                    Sign up
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
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
