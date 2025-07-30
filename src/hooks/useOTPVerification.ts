import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseOTPVerificationProps {
  userEmail: string;
  userId: number; // Note: API expects string conversion for userId
  onVerificationSuccess: () => void;
}

export const useOTPVerification = ({
  userEmail,
  userId,
  onVerificationSuccess,
}: UseOTPVerificationProps) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Memoize stable keys that only depend on userId
  const cooldownKey = useMemo(() => `otp_cooldown_${userId}`, [userId]);
  const initialOtpSentKey = useMemo(() => `initial_otp_sent_${userId}`, [userId]);

  // Memoize request body for OTP generation - API expects userId as string
  const generateOTPRequestBody = useMemo(() => ({
    userId: userId.toString(), // API expects string type for userId
    email: userEmail,
  }), [userId, userEmail]);

  const getStoredCooldownEndTime = useCallback((): number | null => {
    try {
      const stored = sessionStorage.getItem(cooldownKey);
      return stored ? parseInt(stored, 10) : null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error getting stored cooldown end time:', error);
      }
      return null;
    }
  }, [cooldownKey]);

  const setStoredCooldownEndTime = useCallback((durationInSeconds: number) => {
    try {
      const endTime = Date.now() + durationInSeconds * 1000;
      sessionStorage.setItem(cooldownKey, endTime.toString());
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error setting stored cooldown end time:', error);
      }
    }
  }, [cooldownKey]);

  const clearStoredCooldown = useCallback(() => {
    try {
      sessionStorage.removeItem(cooldownKey);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error clearing stored cooldown:', error);
      }
    }
  }, [cooldownKey]);

  const generateOTP = useCallback(async (signal?: AbortSignal) => {
    if (isResending || resendCooldown > 0) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateOTPRequestBody),
        signal, // Pass the AbortSignal to fetch
      });

      // Check if the operation was aborted before proceeding
      if (signal?.aborted) return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      // Check for abort again before setting state
      if (signal?.aborted) return;

      const cooldownDuration = data.cooldownDuration || 60;
      setResendCooldown(cooldownDuration);
      setStoredCooldownEndTime(cooldownDuration);
      sessionStorage.setItem(initialOtpSentKey, 'true');
    } catch (error) {
      // Don't set error state if the operation was aborted
      if (signal?.aborted) return;
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Error generating OTP:', error);
      }
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      // Only update loading state if not aborted
      if (!signal?.aborted) {
        setIsResending(false);
      }
    }
    // Removed isResending and resendCooldown from dependencies as they are state values
    // that would cause unnecessary recreations. The function handles the current state internally.
  }, [generateOTPRequestBody, setStoredCooldownEndTime, initialOtpSentKey]);

  const verifyOTP = useCallback(async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    setVerificationStatus('loading');
    setErrorMessage('');

    try {
      // Memoize request body inline since it depends on current otp state
      const requestBody = {
        userId: userId.toString(), // API expects string type for userId
        otpCode: otpString,
      };

      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }
      
      setVerificationStatus('success');
      clearStoredCooldown();
      sessionStorage.removeItem(initialOtpSentKey);
      onVerificationSuccess();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error verifying OTP:', error);
      }
      setVerificationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
    // Only include stable dependencies - userId is stable, otp changes trigger re-creation as needed
  }, [otp, userId, onVerificationSuccess, clearStoredCooldown, initialOtpSentKey]);

  useEffect(() => {
    const initialOtpSent = sessionStorage.getItem(initialOtpSentKey) === 'true';
    if (!initialOtpSent) {
      const abortController = new AbortController();
      generateOTP(abortController.signal);
      
      // Cleanup function to abort the operation on unmount
      return () => {
        abortController.abort();
      };
    }
    // Return undefined when no cleanup is needed
    return undefined;
  }, [generateOTP, initialOtpSentKey]);

  useEffect(() => {
    const cooldownEndTime = getStoredCooldownEndTime();
    if (cooldownEndTime) {
      const remainingTime = Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000));
      if (remainingTime > 0) {
        setResendCooldown(remainingTime);
      }
    }
  }, [getStoredCooldownEndTime]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (/^\d{6}$/.test(pastedData)) {
      setOtp(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  return {
    otp,
    errorMessage,
    isLoading,
    isResending,
    resendCooldown,
    verificationStatus,
    inputRefs,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    generateOTP,
    verifyOTP,
  };
}; 