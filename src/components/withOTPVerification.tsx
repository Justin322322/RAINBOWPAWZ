'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerificationModal from '@/components/OTPVerificationModal';
import GetStartedModal from '@/components/GetStartedModal';
import { decodeTokenUnsafe } from '@/lib/jwt';
import { fastAuthCheck } from '@/utils/auth';
import { UserData } from '@/contexts/AuthStateContext';

// Global state to prevent re-verification on page navigation
let globalUserAuthState = {
  verified: false,
  userData: null as UserData | null,
};

// HOC to wrap components that require OTP verification
const withOTPVerification = <P extends object>(
  Component: React.ComponentType<P & { userData: UserData }>
) => {
  const WithOTPVerification: React.FC<Omit<P, 'userData'>> = (props) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(globalUserAuthState.verified);
    const [userData, setUserData] = useState<UserData | null>(globalUserAuthState.userData);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [showGetStartedModal, setShowGetStartedModal] = useState(false);

    // Check if we've already shown the OTP modal in this session
    const [hasShownOTPModal, setHasShownOTPModal] = useState(false);
    // Use a ref to track if we've shown the modal to prevent multiple renders from showing it again
    const hasShownOTPModalRef = useRef(false);

    // Track if we've shown the Get Started modal to this user in this session
    const hasShownGetStartedModalRef = useRef(false);

    useEffect(() => {
      console.log('[withOTPVerification] useEffect triggered');

      // Show the Get Started modal once per login session for fur parents
      const checkFirstTimeLogin = () => {
        // Check if the user is a fur parent (user account type)
        if (userData?.user_type === 'user' || userData?.role === 'user') {
          // Check if the modal has been shown or dismissed in this login session
          const sessionKey = `getting_started_shown_${userData.id}`;
          const permanentKey = `getting_started_dismissed_${userData.id}`;

          const hasShownInSession = sessionStorage.getItem(sessionKey) === 'true';
          const hasPermanentlyDismissed = localStorage.getItem(permanentKey) === 'true';

          if (!hasShownInSession && !hasPermanentlyDismissed && !hasShownGetStartedModalRef.current) {
            // Mark as shown in session storage to prevent showing again in this session
            sessionStorage.setItem(sessionKey, 'true');
            // Set the ref to prevent showing it multiple times in the same render cycle
            hasShownGetStartedModalRef.current = true;
            // Show the modal
            setShowGetStartedModal(true);

            // Log for debugging
            console.log('Showing Get Started modal for fur parent user');
          }
        }
      };

      // If already verified globally, we can skip the check
      if (globalUserAuthState.verified && globalUserAuthState.userData) {
        // Check if the user is verified in the global state
        if (globalUserAuthState.userData.is_otp_verified === 1) {
          setUserData(globalUserAuthState.userData);
          setIsAuthenticated(true);

          // Check for first-time login
          setTimeout(checkFirstTimeLogin, 10);
          return;
        }

        // Check if OTP is verified in session but not reflected in global state yet
        const otpVerifiedInSession = sessionStorage.getItem('otp_verified') === 'true';
        if (otpVerifiedInSession) {
          // Update global state to reflect verified status
          const updatedUserData = {
            ...globalUserAuthState.userData,
            is_otp_verified: 1
          };
          globalUserAuthState = {
            verified: true,
            userData: updatedUserData
          };
          setUserData(updatedUserData);
          setIsAuthenticated(true);

          // Check for first-time login
          setTimeout(checkFirstTimeLogin, 10);
          return;
        }

        // Still check if OTP modal needs to be shown
        if (globalUserAuthState.userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
          hasShownOTPModalRef.current = true;
          setShowOTPModal(true);
          setHasShownOTPModal(true);
        }

        setUserData(globalUserAuthState.userData);
        setIsAuthenticated(true);
        return;
      }

      // Fast check first to prevent flashing
      const fastCheck = fastAuthCheck();
      if (fastCheck.authenticated && fastCheck.accountType === 'user' && fastCheck.userData) {
        setUserData(fastCheck.userData);
        setIsAuthenticated(true);
        globalUserAuthState = {
          verified: true,
          userData: fastCheck.userData
        };

        // Always check for first-time login first
        setTimeout(checkFirstTimeLogin, 10);

        // Then check OTP status
        const otpVerifiedInSession = sessionStorage.getItem('otp_verified');
        if (fastCheck.userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
          hasShownOTPModalRef.current = true;
          setShowOTPModal(true);
          setHasShownOTPModal(true);
        }
        return;
      }

      // Check if we already have user data in session storage
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        try {
          const parsedData = JSON.parse(cachedUserData);
          setUserData(parsedData);
          setIsAuthenticated(true);
          globalUserAuthState = {
            verified: true,
            userData: parsedData
          };

          // Always check for first-time login first
          setTimeout(checkFirstTimeLogin, 10);

          // Then check OTP status
          const otpVerifiedInSession = sessionStorage.getItem('otp_verified');
          if (parsedData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
            hasShownOTPModalRef.current = true;
            setShowOTPModal(true);
            setHasShownOTPModal(true);
          }
          return;
        } catch {
          // If parsing fails, continue with normal auth
          sessionStorage.removeItem('user_data');
        }
      }

      // Check if user is authenticated and get user data
      const checkAuth = async () => {
        console.log('[withOTPVerification] Starting auth check');
        try {
          // Check if we've already verified OTP in this session
          const otpVerifiedInSession = sessionStorage.getItem('otp_verified');
          console.log('[withOTPVerification] OTP verified in session:', otpVerifiedInSession);

          // Get auth token from cookie
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
          console.log('[withOTPVerification] Auth cookie found:', !!authCookie);

          if (!authCookie) {
            console.log('[withOTPVerification] No auth cookie, redirecting to home');
            router.replace('/');
            return;
          }

          // Extract user ID and account type from auth token
          const cookieParts = authCookie.split('=');
          if (cookieParts.length !== 2) {
            router.replace('/');
            return;
          }

          // Properly decode the token value
          let authValue: string;
          try {
            authValue = decodeURIComponent(cookieParts[1]);
          } catch {
            authValue = cookieParts[1]; // Use raw value if decoding fails
          }

          console.log('[withOTPVerification] Auth value:', authValue);

          let userId: string | null = null;
          let accountType: string | null = null;

          // Check if it's a JWT token or old format
          if (authValue.includes('.')) {
            // JWT token format
            const payload = decodeTokenUnsafe(authValue);
            if (payload) {
              userId = payload.userId;
              accountType = payload.accountType;
            }
          } else {
            // Old format fallback
            const parts = authValue.split('_');
            if (parts.length === 2) {
              userId = parts[0];
              accountType = parts[1];
            }
          }

          console.log('[withOTPVerification] Parsed auth:', { userId, accountType });

          // Validate account type
          if (accountType !== 'user') {
            console.log('[withOTPVerification] Invalid account type, redirecting to home');
            router.replace('/');
            return;
          }

          // Fetch user data to verify it exists in the database
          try {
            console.log('[withOTPVerification] Fetching user data for ID:', userId);
            const response = await fetch(`/api/users/${userId}?t=${Date.now()}`);

            if (!response.ok) {
              console.log('[withOTPVerification] User fetch failed:', response.status, response.statusText);
              router.replace('/');
              return;
            }

            const userData = await response.json();
            console.log('[withOTPVerification] User data received:', { id: userData.id, user_type: userData.user_type, is_otp_verified: userData.is_otp_verified });

            // Additional validation if needed
            if (userData.user_type !== 'user' && userData.user_type !== 'fur_parent') {
              console.log('[withOTPVerification] Invalid user type:', userData.user_type);
              router.replace('/');
              return;
            }

            // Set the user data and store in session storage
            setUserData(userData);
            setIsAuthenticated(true);
            sessionStorage.setItem('user_data', JSON.stringify(userData));

            // Update global state
            globalUserAuthState = {
              verified: true,
              userData: userData
            };

            // Always check for first-time login first
            setTimeout(checkFirstTimeLogin, 10);

            // Then check OTP status
            if (userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
              hasShownOTPModalRef.current = true;
              setShowOTPModal(true);
              setHasShownOTPModal(true);
            }
          } catch (fetchError) {
            console.error('[withOTPVerification] Fetch error:', fetchError);
            router.replace('/');
          }
        } catch (error) {
          console.error('[withOTPVerification] Auth check error:', error);
          router.replace('/');
        }
      };

      checkAuth();
    }, [router, hasShownOTPModal, userData]);

    const handleVerificationSuccess = () => {
      // Update user data to reflect verification
      if (userData) {
        const updatedUserData = {
          ...userData,
          is_otp_verified: 1
        };

        // Update component state first
        setUserData(updatedUserData);

        // Then update all persistence mechanisms
        try {
          // 1. Session storage
          sessionStorage.setItem('user_data', JSON.stringify(updatedUserData));
          sessionStorage.setItem('otp_verified', 'true');
          sessionStorage.removeItem('needs_otp_verification');

          // 2. Global state
          globalUserAuthState = {
            verified: true,
            userData: updatedUserData
          };

          // 3. Additional localStorage backup
          localStorage.setItem('user_verified', 'true');

        } catch {
        }
      }

      // Simply hide the modal, don't navigate
      setShowOTPModal(false);

      // After OTP verification, we'll check if the Get Started modal should be shown
      // But we don't need to show it here since it's already shown on login
      // Just make sure the OTP modal is closed
      setTimeout(() => {
        // We'll just update the user data to reflect the OTP verification
        // The Get Started modal will continue to be shown if it was already open
        // or will be shown on next login if the user clicked "Not Now"
      }, 500); // Small delay to ensure OTP modal is fully closed
    };

    // Handle closing the Get Started modal when completed (Finish button)
    const handleGetStartedClose = () => {
      setShowGetStartedModal(false);
      // Mark as permanently dismissed when user completes the tutorial
      if (userData?.id) {
        const sessionKey = `getting_started_shown_${userData.id}`;
        const permanentKey = `getting_started_dismissed_${userData.id}`;
        sessionStorage.setItem(sessionKey, 'true');
        localStorage.setItem(permanentKey, 'true');
      }
      // Keep the ref set to true to prevent showing it again
      hasShownGetStartedModalRef.current = true;
      console.log('Get Started modal completed - permanently dismissed');
    };

    // Handle "Not Now" button click or close button
    const handleGetStartedNotNow = () => {
      setShowGetStartedModal(false);
      // Mark as dismissed in session storage only (not permanent for "Not Now")
      if (userData?.id) {
        const sessionKey = `getting_started_shown_${userData.id}`;
        sessionStorage.setItem(sessionKey, 'true');
      }
      // Keep the ref set to true to prevent showing it again in this session
      hasShownGetStartedModalRef.current = true;
      console.log('Get Started modal dismissed - dismissed for this session only');
    };

    // Don't render anything while verifying - prevents flash
    if (!isAuthenticated || !userData) {
      return null;
    }

    return (
      <>
        {/* Render the OTP verification modal if needed */}
        {userData.is_otp_verified === 0 && (
          <OTPVerificationModal
            isOpen={showOTPModal}
            onVerificationSuccess={handleVerificationSuccess}
            userEmail={userData.email}
            userId={userData.id}
            onClose={() => {
              // If user closes the modal without verifying, send them back to home
              router.replace('/');
            }}
          />
        )}

        {/* Get Started Modal - shown regardless of OTP verification status */}
        <GetStartedModal
          isOpen={showGetStartedModal}
          onClose={handleGetStartedClose}
          onNotNow={handleGetStartedNotNow}
          userName={userData.first_name || 'there'}
        />

        {/* Render the wrapped component with a blur effect if OTP verification is required */}
        <div
          className={userData.is_otp_verified === 0 && showOTPModal ? 'filter blur-sm pointer-events-none' : ''}
          style={{ position: 'relative', minHeight: '100vh' }}
        >
          {/* Create a safe copy of props to avoid React rendering issues with objects */}
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

export default withOTPVerification;
