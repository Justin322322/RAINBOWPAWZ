'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerificationModal from '@/components/OTPVerificationModal';
import GetStartedModal from '@/components/GetStartedModal';
import { decodeTokenUnsafe } from '@/lib/jwt';
import { fastAuthCheck } from '@/utils/auth';
import { useAuthState, UserData } from '@/contexts/AuthStateContext';

// Optimized HOC to wrap components that require OTP verification
const withOTPVerificationOptimized = <P extends object>(
  Component: React.ComponentType<P & { userData: UserData }>
) => {
  const WithOTPVerification: React.FC<Omit<P, 'userData'>> = (props) => {
    const router = useRouter();
    const { 
      isAuthenticated, 
      userData, 
      isOtpVerified, 
      setUserData, 
      setIsAuthenticated, 
      setIsOtpVerified,
      syncFromStorage 
    } = useAuthState();
    
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [showGetStartedModal, setShowGetStartedModal] = useState(false);
    const hasShownOTPModalRef = useRef(false);
    const hasShownGetStartedModalRef = useRef(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Show the Get Started modal once per login session for fur parents
    const checkFirstTimeLogin = useCallback(() => {
      if (userData?.user_type === 'user' || userData?.role === 'user') {
        const sessionKey = `getting_started_shown_${userData.id}`;
        const permanentKey = `getting_started_dismissed_${userData.id}`;

        const hasShownInSession = sessionStorage.getItem(sessionKey) === 'true';
        const hasPermanentlyDismissed = localStorage.getItem(permanentKey) === 'true';

        if (!hasShownInSession && !hasPermanentlyDismissed && !hasShownGetStartedModalRef.current) {
          sessionStorage.setItem(sessionKey, 'true');
          hasShownGetStartedModalRef.current = true;
          setShowGetStartedModal(true);
        }
      }
    }, [userData]);

    useEffect(() => {
      const initializeAuth = async () => {
        // First, try to sync from storage
        syncFromStorage();

        // If we have authenticated user data, check OTP status
        if (isAuthenticated && userData) {
          setIsInitialized(true);
          
          // Check for first-time login
          setTimeout(checkFirstTimeLogin, 10);

          // Check if OTP verification is needed
          if (!isOtpVerified && userData.is_otp_verified === 0 && !hasShownOTPModalRef.current) {
            hasShownOTPModalRef.current = true;
            setShowOTPModal(true);
          }
          return;
        }

        // If no cached auth, perform full auth check
        try {
          const fastCheck = fastAuthCheck();
          if (fastCheck.authenticated && fastCheck.accountType === 'user' && fastCheck.userData) {
            setUserData(fastCheck.userData);
            setIsAuthenticated(true);
            setIsInitialized(true);

            setTimeout(checkFirstTimeLogin, 10);

            const otpVerifiedInSession = sessionStorage.getItem('otp_verified') === 'true';
            if (fastCheck.userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
              hasShownOTPModalRef.current = true;
              setShowOTPModal(true);
            }
            return;
          }

          // Full auth check with API
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

          if (!authCookie) {
            router.replace('/');
            return;
          }

          const cookieParts = authCookie.split('=');
          if (cookieParts.length !== 2) {
            router.replace('/');
            return;
          }

          let authValue: string;
          try {
            authValue = decodeURIComponent(cookieParts[1]);
          } catch (_e) {
            authValue = cookieParts[1];
          }

          let userId: string | null = null;
          let accountType: string | null = null;

          if (authValue.includes('.')) {
            const payload = decodeTokenUnsafe(authValue);
            if (payload) {
              userId = payload.userId;
              accountType = payload.accountType;
            }
          } else {
            const parts = authValue.split('_');
            if (parts.length === 2) {
              userId = parts[0];
              accountType = parts[1];
            }
          }

          if (accountType !== 'user') {
            router.replace('/');
            return;
          }

          const response = await fetch(`/api/users/${userId}?t=${Date.now()}`);
          if (!response.ok) {
            router.replace('/');
            return;
          }

          const fetchedUserData = await response.json();
          if (fetchedUserData.user_type !== 'user' && fetchedUserData.user_type !== 'fur_parent') {
            router.replace('/');
            return;
          }

          setUserData(fetchedUserData);
          setIsAuthenticated(true);
          setIsInitialized(true);

          setTimeout(checkFirstTimeLogin, 10);

          const otpVerifiedInSession = sessionStorage.getItem('otp_verified') === 'true';
          if (fetchedUserData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
            hasShownOTPModalRef.current = true;
            setShowOTPModal(true);
          }

        } catch (error) {
          console.error('Auth check error:', error);
          router.replace('/');
        }
      };

      if (!isInitialized) {
        initializeAuth();
      }
    }, [isAuthenticated, userData, isOtpVerified, isInitialized, router, setUserData, setIsAuthenticated, syncFromStorage, checkFirstTimeLogin]);

    const handleVerificationSuccess = () => {
      if (userData) {
        setIsOtpVerified(true);
        setShowOTPModal(false);
      }
    };

    const handleGetStartedClose = () => {
      setShowGetStartedModal(false);
      if (userData?.id) {
        const sessionKey = `getting_started_shown_${userData.id}`;
        const permanentKey = `getting_started_dismissed_${userData.id}`;
        sessionStorage.setItem(sessionKey, 'true');
        localStorage.setItem(permanentKey, 'true');
      }
      hasShownGetStartedModalRef.current = true;
    };

    const handleGetStartedNotNow = () => {
      setShowGetStartedModal(false);
      if (userData?.id) {
        const sessionKey = `getting_started_shown_${userData.id}`;
        sessionStorage.setItem(sessionKey, 'true');
      }
      hasShownGetStartedModalRef.current = true;
    };

    // Show loading state while initializing
    if (!isInitialized || !isAuthenticated || !userData) {
      return null;
    }

    return (
      <>
        {/* OTP verification modal */}
        {!isOtpVerified && userData.is_otp_verified === 0 && (
          <OTPVerificationModal
            isOpen={showOTPModal}
            onVerificationSuccess={handleVerificationSuccess}
            userEmail={userData.email}
            userId={userData.id}
            onClose={() => router.replace('/')}
          />
        )}

        {/* Get Started Modal */}
        <GetStartedModal
          isOpen={showGetStartedModal}
          onClose={handleGetStartedClose}
          onNotNow={handleGetStartedNotNow}
          userName={userData.first_name || 'there'}
        />

        {/* Render component with blur effect if OTP verification is required */}
        <div
          className={!isOtpVerified && userData.is_otp_verified === 0 && showOTPModal ? 'filter blur-sm pointer-events-none' : ''}
          style={{ position: 'relative', minHeight: '100vh' }}
        >
          <Component
            {...(props as P)}
            userData={userData}
          />
        </div>
      </>
    );
  };

  return WithOTPVerification;
};

export default withOTPVerificationOptimized;
