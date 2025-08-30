'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { useOTPVerification } from '@/hooks/useOTPVerification';

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
  const {
    otp,
    errorMessage,
    isLoading,
    isResending,
    isGeneratingInitial,
    resendCooldown,
    verificationStatus,
    inputRefs,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    generateOTP,
    verifyOTP,
  } = useOTPVerification({
    userEmail,
    userId,
    onVerificationSuccess,
  });

  // Stable callback ref function to prevent unnecessary re-renders
  const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current[index] = el;
    }
  };

  useEffect(() => {
    if (verificationStatus === 'success') {
      const timer = setTimeout(() => {
        // Don't call onClose() for successful verification - let parent handle it
        // onClose(); // Commented out to prevent unwanted redirects
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [verificationStatus]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-[var(--primary-green)] text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-medium">
            {verificationStatus === 'success' ? 'Verification Successful!' : 'Verify Your Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
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
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p className="text-gray-600 text-center">Your account has been verified successfully.</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-gray-600 mb-6">
                  We&apos;ve sent a 6-digit verification code to <span className="font-medium">{userEmail}</span>.
                </p>

                {errorMessage && (
                  <div className="p-4 rounded-lg border mb-6 bg-red-50 border-red-100 text-red-800">
                    {errorMessage}
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter verification code
                  </label>
                  <div className="flex justify-center space-x-3">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={setInputRef(index)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        className="w-12 h-12 text-center text-xl font-semibold"
                        rounded="default"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col space-y-4">
                  <Button
                    onClick={verifyOTP}
                    disabled={isLoading}
                    isLoading={isLoading}
                    fullWidth
                    size="lg"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Account'}
                  </Button>
                  <Button
                    onClick={() => generateOTP(undefined, true)} // undefined = no abort signal, true = this is a resend
                    disabled={(isResending || isGeneratingInitial) || resendCooldown > 0}
                    variant="link"
                    size="sm"
                    fullWidth
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : isResending
                      ? 'Sending...'
                      : isGeneratingInitial
                      ? 'Generate OTP'
                      : 'Resend verification code'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
