'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Input, Button, Checkbox, Alert } from '@/components/ui';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
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

      // Get user ID and account type from response
      const userId = data.user.id;
      const accountType = data.account_type;
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
      setTimeout(() => {
        const dashboardUrl = redirectToDashboard(accountType);

        // Use window.location.replace for a cleaner redirect
        window.location.replace(dashboardUrl);
      }, 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Connection error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={loginSuccess ? "Login Successful" : "Welcome Back"} size="small">
        <AnimatePresence mode="wait">
          {loginSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-8 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome back{userName ? `, ${userName}` : ''}!</h2>
              <p className="text-gray-600 mb-6">You&apos;ve successfully logged in. Redirecting you to your dashboard...</p>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500 rounded-full"
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
              className="space-y-8"
            >
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert
                    variant="error"
                    title="Login Error"
                    onClose={() => setErrorMessage('')}
                    dismissible
                  >
                    <p>{errorMessage}</p>
                    {errorMessage.includes('Incorrect password') && (
                      <p className="text-xs mt-1">
                        Tip: If you&apos;ve forgotten your password, click &quot;Forgot password?&quot; below.
                      </p>
                    )}
                    {errorMessage.includes('No account exists') && (
                      <p className="text-xs mt-1">
                        Tip: Check your spelling or <button
                          type="button"
                          onClick={onShowSignup}
                          className="text-red-700 underline hover:text-red-800"
                        >
                          create a new account
                        </button>.
                      </p>
                    )}
                  </Alert>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email or Username"
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or username"
              required
              rounded="default"
              size="lg"
              labelClassName="font-light"
            />

            <Input
              label="Password"
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              rounded="default"
              size="lg"
              labelClassName="font-light"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <Checkbox
                id="remember-me"
                name="remember-me"
                label="Remember me"
                labelClassName="font-light text-gray-600"
                checkboxSize="md"
              />
              <div className="text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleForgotPasswordClick}
                  className="font-light"
                >
                  Forgot password?
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              fullWidth
              size="lg"
              rounded="default"
              className="font-light tracking-wide text-lg"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-light">
              Don&apos;t have an account?{' '}
              <Button
                type="button"
                variant="link"
                onClick={onShowSignup}
                className="font-medium p-0"
              >
                Sign up
              </Button>
            </div>
          </form>
            </motion.div>
          )}
        </AnimatePresence>
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
