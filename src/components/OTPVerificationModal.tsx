'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@/components/ui';

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

  // Global variable to track if OTP has been sent for this user across all instances
  // This helps prevent duplicate OTPs when multiple components are mounted/unmounted
  const globalOtpSentKey = `global_otp_sent_${userId}`;

  // Track all timeout IDs for proper cleanup
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

  // Helper function to add timeout with tracking
  const addTrackedTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timeoutId = setTimeout(callback, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  };

  // Helper function to clear tracked timeout
  const clearTrackedTimeout = (timeoutId: NodeJS.Timeout) => {
    clearTimeout(timeoutId);
    timeoutIdsRef.current = timeoutIdsRef.current.filter(id => id !== timeoutId);
  };

  // Cleanup all timeouts
  const clearAllTimeouts = () => {
    timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  // Check if we've already sent the initial OTP for this user
  const hasInitialOtpBeenSent = useCallback((): boolean => {
    try {
      return sessionStorage.getItem(initialOtpSentKey) === 'true';
    } catch (_error) {
      return false;
    }
  }, [initialOtpSentKey]);

  // Mark that we've sent the initial OTP
  const markInitialOtpSent = useCallback((): void => {
    try {
      // Store in both session storage (for current session) and local storage (for persistence)
      sessionStorage.setItem(initialOtpSentKey, 'true');
      window.localStorage.setItem(globalOtpSentKey, 'true');
    } catch (_error) {
    }
  }, [initialOtpSentKey, globalOtpSentKey]);

  const getStoredCooldownEndTime = useCallback((): number | null => {
    try {
      const stored = sessionStorage.getItem(cooldownKey);
      return stored ? parseInt(stored) : null;
    } catch (_error) {
      return null;
    }
  }, [cooldownKey]);

  const setStoredCooldownEndTime = useCallback((durationInSeconds: number) => {
    try {
      const endTime = Date.now() + (durationInSeconds * 1000);
      sessionStorage.setItem(cooldownKey, endTime.toString());
    } catch (_error) {
    }
  }, [cooldownKey]);

  const clearStoredCooldownEndTime = useCallback(() => {
    try {
      sessionStorage.removeItem(cooldownKey);
    } catch (_error) {
    }
  }, [cooldownKey]);

  // Initialize countdown timer from storage
  // This effect runs once when component mounts and isOpen changes
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isOpen) {
      const updateTimerFromStorage = () => {
        const cooldownEndTime = getStoredCooldownEndTime();

        if (cooldownEndTime && cooldownEndTime > Date.now()) {
          const remainingTime = Math.ceil((cooldownEndTime - Date.now()) / 1000);
          setResendCooldown(remainingTime);
        } else {
          setResendCooldown(0);
        }
      };

      // Update timer immediately
      updateTimerFromStorage();

      // Update timer every second to ensure it stays in sync
      intervalId = setInterval(updateTimerFromStorage, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen, getStoredCooldownEndTime]);

  // Track if an OTP request is in progress
  const isGeneratingOtpRef = useRef(false);

  // Memoize the OTP generation function to avoid recreating it on every render
  const generateOTP = useCallback(async () => {
    // Prevent duplicate OTP generation
    if (isGeneratingOtpRef.current) {
      return;
    }

    isGeneratingOtpRef.current = true;
    setIsResending(true);

    try {
      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      // Set the cooldown period from the server response (usually 60 seconds)
      const cooldownDuration = data.cooldownDuration || 60;
      setResendCooldown(cooldownDuration);
      setStoredCooldownEndTime(cooldownDuration);

      // Show a success message
      const successElement = document.getElementById('success-message');
      if (successElement) {
        successElement.textContent = data.message || 'Verification code sent successfully. Please check your email.';
        successElement.classList.remove('hidden');

        // Hide the success message after 5 seconds with tracking
        addTrackedTimeout(() => {
          successElement.classList.add('hidden');
        }, 5000);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send OTP. Please try again.');
    } finally {
      setIsResending(false);
      // Reset the flag to allow future OTP generation
      isGeneratingOtpRef.current = false;
    }
  }, [userId, userEmail, setStoredCooldownEndTime, markInitialOtpSent]);

  // Initialize OTP sending (only once after login)
  // Using a ref to track initialization across renders
  const hasInitializedRef = useRef(false);

  // Check if OTP has been sent globally
  const hasOtpBeenSentGlobally = useCallback((): boolean => {
    try {
      return window.localStorage.getItem(globalOtpSentKey) === 'true';
    } catch (_error) {
      return false;
    }
  }, [globalOtpSentKey]);

  // Mark OTP as sent globally
  const markOtpSentGlobally = useCallback((): void => {
    try {
      window.localStorage.setItem(globalOtpSentKey, 'true');
      // Also set the session storage for backward compatibility
      sessionStorage.setItem(initialOtpSentKey, 'true');
    } catch (_error) {
    }
  }, [globalOtpSentKey, initialOtpSentKey]);

  useEffect(() => {
    // Only proceed if the modal is open and we haven't initialized yet
    if (isOpen && !hasInitializedRef.current) {
      // Set the ref immediately to prevent double calls during this render cycle
      hasInitializedRef.current = true;

      // Check both global and session storage
      const initialOtpAlreadySent = hasOtpBeenSentGlobally() || hasInitialOtpBeenSent();

      if (!initialOtpAlreadySent && !isGeneratingOtpRef.current) {
        // No OTP has been sent yet - first login

        // Mark as sent before generating to prevent race conditions
        markOtpSentGlobally();

        // Set a short debounce before sending OTP to prevent duplicate generation with tracking
        addTrackedTimeout(() => {
          // Double-check no other component has generated an OTP in the meantime
          if (!isGeneratingOtpRef.current && hasOtpBeenSentGlobally()) {
            generateOTP();
          }
        }, 500); // Extended delay to prevent race conditions
      }

      // Mark as initialized in state too
      setHasInitialized(true);
    }
  }, [isOpen, generateOTP, hasOtpBeenSentGlobally, hasInitialOtpBeenSent, markOtpSentGlobally]);

  // Countdown timer effect to update stored countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (resendCooldown > 0) {
      timer = setTimeout(() => {
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
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [resendCooldown, setStoredCooldownEndTime, clearStoredCooldownEndTime]);

  // Success animation timeout
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (verificationStatus === 'success') {
      // We'll use a very simple approach here - just close the modal after
      // a brief delay to show the success animation
      timer = setTimeout(() => {
        // Close the modal if needed, but only after verification is fully complete
        if (typeof onClose === 'function') {
          onClose();
        }
      }, 1500);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [verificationStatus, onClose]);

  // Cleanup timeouts when modal closes or component unmounts
  useEffect(() => {
    if (!isOpen) {
      clearAllTimeouts();
    }
    
    return () => {
      clearAllTimeouts();
    };
  }, [isOpen]);

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


      // CRITICAL: Complete persistence for verification status
      // 1. Session Storage - immediate updates for current session
      sessionStorage.setItem('otp_verified', 'true');
      sessionStorage.removeItem('needs_otp_verification');

      // 2. Update user data in multiple storage locations
      try {
        const userDataStr = sessionStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          userData.is_otp_verified = 1;

          // Update session storage
          sessionStorage.setItem('user_data', JSON.stringify(userData));

          // Update global state if available
          try {
            // @ts-ignore - access global variable from HOC
            if (typeof globalUserAuthState !== 'undefined') {
              // @ts-ignore
              globalUserAuthState.verified = true;
              // @ts-ignore
              globalUserAuthState.userData = userData;
            }
          } catch (_e) {
          }

          // Also update localStorage as an extra backup
          try {
            localStorage.setItem('user_verified', 'true');
          } catch (_e) {
          }
        }
      } catch (_e) {
      }

      // Clear the persistence flags for OTP generation
      clearStoredCooldownEndTime();
      try {
        sessionStorage.removeItem(initialOtpSentKey);
        window.localStorage.removeItem(globalOtpSentKey);
      } catch (_e) {
      }

      // Set success state to trigger animation
      setVerificationStatus('success');

      // Call the success callback directly but with a delay to ensure
      // all state updates have propagated
      addTrackedTimeout(() => {
        onVerificationSuccess();

        // The modal will be closed by the animation effect
      }, 1000);
    } catch (error) {
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
                We&apos;ve sent a 6-digit verification code to <span className="font-medium">{userEmail}</span>
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
                          Click &quot;Resend verification code&quot; below to get a new code.
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
                <div className="flex justify-center space-x-2 md:space-x-3">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={el => { inputRefs.current[index] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleInputChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-12 text-center text-xl font-semibold"
                      rounded="default"
                      size="lg"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <Button
                  onClick={verifyOTP}
                  disabled={isLoading || verificationStatus === 'loading'}
                  isLoading={verificationStatus === 'loading'}
                  fullWidth
                  size="lg"
                  rounded="default"
                >
                  {verificationStatus === 'loading' ? 'Verifying...' : 'Verify Account'}
                </Button>

                <Button
                  onClick={generateOTP}
                  disabled={isResending || resendCooldown > 0}
                  variant={errorMessage && errorMessage.includes('expired') ? "outline" : "link"}
                  size="sm"
                  fullWidth
                  className={errorMessage && errorMessage.includes('expired') ? "bg-green-50 border-green-100 hover:bg-green-100" : ""}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : isResending
                      ? 'Sending...'
                      : 'Resend verification code'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
