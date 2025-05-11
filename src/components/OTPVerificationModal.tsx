'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onVerificationSuccess: () => void;
  userEmail: string;
  userId: number;
  onClose: () => void;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onVerificationSuccess,
  userEmail,
  userId,
  onClose,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [hasInitialized, setHasInitialized] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Key for tracking if initial OTP has been sent for this user (persistent across refreshes)
  const initialOtpSentKey = `initial_otp_sent_${userId}`;

  // Helper function to get/set cooldown in sessionStorage
  const cooldownKey = `otp_cooldown_${userId}`;

  // Check if we've already sent the initial OTP for this user
  const hasInitialOtpBeenSent = (): boolean => {
    try {
      return sessionStorage.getItem(initialOtpSentKey) === 'true';
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return false;
    }
  };

  // Mark that we've sent the initial OTP
  const markInitialOtpSent = (): void => {
    try {
      sessionStorage.setItem(initialOtpSentKey, 'true');
      console.log('Initial OTP marked as sent in sessionStorage');
    } catch (error) {
      console.error('Error writing to sessionStorage:', error);
    }
  };

  const getStoredCooldownEndTime = (): number | null => {
    try {
      const stored = sessionStorage.getItem(cooldownKey);
      return stored ? parseInt(stored) : null;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return null;
    }
  };

  const setStoredCooldownEndTime = (durationInSeconds: number) => {
    try {
      const endTime = Date.now() + (durationInSeconds * 1000);
      sessionStorage.setItem(cooldownKey, endTime.toString());
      console.log(`Cooldown end time set: ${new Date(endTime).toLocaleTimeString()}`);
    } catch (error) {
      console.error('Error writing to sessionStorage:', error);
    }
  };

  const clearStoredCooldownEndTime = () => {
    try {
      sessionStorage.removeItem(cooldownKey);
      console.log('Cooldown timer cleared from storage');
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  };

  // Initialize countdown timer from storage
  // This effect runs once when component mounts and isOpen changes
  useEffect(() => {
    if (isOpen) {
      const updateTimerFromStorage = () => {
        const cooldownEndTime = getStoredCooldownEndTime();

        if (cooldownEndTime && cooldownEndTime > Date.now()) {
          const remainingTime = Math.ceil((cooldownEndTime - Date.now()) / 1000);
          console.log(`Setting cooldown timer: ${remainingTime}s remaining`);
          setResendCooldown(remainingTime);
        } else {
          setResendCooldown(0);
        }
      };

      // Update timer immediately
      updateTimerFromStorage();

      // Update timer every second to ensure it stays in sync
      const intervalId = setInterval(updateTimerFromStorage, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isOpen]);

  // Track if an OTP request is in progress
  const isGeneratingOtpRef = useRef(false);

  // Memoize the OTP generation function to avoid recreating it on every render
  const generateOTP = useCallback(async () => {
    // Prevent duplicate calls
    if (isGeneratingOtpRef.current) {
      console.log('OTP generation already in progress, skipping duplicate call');
      return;
    }

    try {
      // Set flag to prevent duplicate calls
      isGeneratingOtpRef.current = true;

      setIsResending(true);
      setErrorMessage('');
      console.log(`Attempting to generate OTP for user ID ${userId}`);

      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail
        }),
      });

      const data = await response.json();
      console.log('OTP generation response:', data);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate OTP');
      }

      // Set the cooldown and store the end time in sessionStorage
      const cooldownDuration = 60; // 60 seconds cooldown
      setResendCooldown(cooldownDuration);
      setStoredCooldownEndTime(cooldownDuration);
      console.log(`Cooldown set for ${cooldownDuration}s`);

      // Mark that initial OTP has been sent for this user
      markInitialOtpSent();

      // Show success message
      setErrorMessage('');

      // Show a success message
      const successElement = document.getElementById('success-message');
      if (successElement) {
        successElement.textContent = data.message || 'Verification code sent successfully. Please check your email.';
        successElement.classList.remove('hidden');

        // Hide the success message after 5 seconds
        setTimeout(() => {
          successElement.classList.add('hidden');
        }, 5000);
      }
    } catch (error) {
      console.error('OTP generation error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send OTP. Please try again.');
    } finally {
      setIsResending(false);
      // Reset the flag to allow future OTP generation
      isGeneratingOtpRef.current = false;
    }
  }, [userId, userEmail]);

  // Initialize OTP sending (only once after login)
  // Using a ref to track initialization across renders
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Only proceed if the modal is open and we haven't initialized yet
    if (isOpen && !hasInitializedRef.current) {
      const initialOtpAlreadySent = hasInitialOtpBeenSent();
      console.log(`Initial OTP already sent: ${initialOtpAlreadySent}`);

      if (!initialOtpAlreadySent) {
        // No OTP has been sent yet - first login
        console.log('First time opening modal, generating initial OTP');
        // Set the ref immediately to prevent double calls
        hasInitializedRef.current = true;
        // Generate OTP
        generateOTP(); // This will also mark initialOtpSent
      } else {
        console.log('Modal reopened after initial OTP was already sent');
      }

      // Mark as initialized in state too
      setHasInitialized(true);
      hasInitializedRef.current = true;
    }
  }, [isOpen, generateOTP]);

  // Countdown timer effect to update stored countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        const newCount = resendCooldown - 1;
        setResendCooldown(newCount);

        // If countdown is still active, update the stored end time
        // This ensures consistency between the UI and stored value
        if (newCount > 0) {
          setStoredCooldownEndTime(newCount);
        } else {
          // When countdown reaches zero, clear the stored end time
          clearStoredCooldownEndTime();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Success animation timeout
  useEffect(() => {
    if (verificationStatus === 'success') {
      // Set a session storage flag to indicate OTP has been verified
      sessionStorage.setItem('otp_verified', 'true');

      // Clear the persistence flags on successful verification
      clearStoredCooldownEndTime();
      try {
        sessionStorage.removeItem(initialOtpSentKey);
      } catch (e) {
        console.error('Error clearing initialOtpSentKey:', e);
      }

      const timer = setTimeout(() => {
        onVerificationSuccess();
        // Only call onClose if it exists
        if (typeof onClose === 'function') {
          onClose(); // Close the modal after success animation
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [verificationStatus, onVerificationSuccess, onClose, initialOtpSentKey]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    // Clear error message when user starts typing a new code
    if (errorMessage) {
      setErrorMessage('');
      setVerificationStatus('idle');
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');

    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);

      // Focus the last input
      inputRefs.current[5]?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join('');

    // Validate OTP format
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      setErrorMessage('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setVerificationStatus('loading');

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          otpCode: otpString
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases with user-friendly messages
        if (data.error === 'No valid verification code found. Please request a new code.') {
          setErrorMessage('Your verification code has expired. Please request a new one.');
        } else if (data.error === 'Invalid verification code. Please try again.') {
          setErrorMessage('The code you entered is incorrect. Please check and try again.');
        } else {
          setErrorMessage(data.message || data.error || 'Invalid verification code. Please try again.');
        }
        setVerificationStatus('error');
        return;
      }

      // Set a session storage flag to indicate OTP has been verified
      sessionStorage.setItem('otp_verified', 'true');

      setVerificationStatus('success');
      // onVerificationSuccess will be called after animation completes
    } catch (error) {
      console.error('OTP verification error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.');
      setVerificationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? 'block' : 'hidden'}`}>
      {/* Blurred background overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 md:p-8">
        <AnimatePresence mode="wait">
          {verificationStatus === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verification Successful!</h2>
              <p className="text-gray-600 text-center">Your account has been verified successfully.</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verify Your Account</h2>
              <p className="text-gray-600 mb-6">
                We've sent a 6-digit verification code to <span className="font-medium">{userEmail}</span>
              </p>

              {/* Success message */}
              <motion.div
                id="success-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border mb-6 bg-green-50 border-green-100 hidden"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800 font-medium">Verification code sent successfully. Please check your email.</p>
                  </div>
                </div>
              </motion.div>

              {/* Error message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border mb-6 bg-red-50 border-red-100"
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                      {errorMessage.includes('expired') && (
                        <p className="text-xs mt-1 text-red-700">
                          Click "Resend verification code" below to get a new code.
                        </p>
                      )}
                      {errorMessage.includes('incorrect') && (
                        <p className="text-xs mt-1 text-red-700">
                          Double-check the code in your email and try again.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter verification code
                </label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleInputChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  onClick={verifyOTP}
                  disabled={isLoading || verificationStatus === 'loading'}
                  className="w-full py-3 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-medium flex items-center justify-center"
                >
                  {verificationStatus === 'loading' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : 'Verify Account'}
                </button>

                <button
                  onClick={generateOTP}
                  disabled={isResending || resendCooldown > 0}
                  className={`text-sm font-medium ${
                    errorMessage && errorMessage.includes('expired')
                      ? 'text-[var(--primary-green)] bg-green-50 px-4 py-2 rounded-lg border border-green-100 hover:bg-green-100 transition-colors'
                      : 'text-[var(--primary-green)] hover:underline'
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : isResending
                      ? 'Sending...'
                      : 'Resend verification code'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
