'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerificationModal from './OTPVerificationModal';
import GetStartedModal from './GetStartedModal';
import { fastAuthCheck } from '@/utils/auth';

// Define the shape of the user data
interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_otp_verified: number;
  user_type: string;
  [key: string]: any; // Allow for other properties
}

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

    // Track if we've shown the Get Started modal to this user
    const hasShownGetStartedModalRef = useRef(false);

    useEffect(() => {
      // Always show the Get Started modal after login for fur parents
      const checkFirstTimeLogin = () => {
        // Check if the user is a fur parent, regardless of OTP verification status
        if (userData?.role === 'fur_parent' || userData?.user_type === 'fur_parent' || userData?.role === 'user') {
          // Only check if the user has completed the tutorial
          const hasCompletedTutorial = localStorage.getItem('has_completed_tutorial') === 'true';
          if (!hasCompletedTutorial) {
            // Reset the ref to ensure the modal is shown
            hasShownGetStartedModalRef.current = false;
            // Force show the modal
            setShowGetStartedModal(true);

            // Log for debugging
            console.log('Showing Get Started modal for fur parent');
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
        } catch (e) {
          // If parsing fails, continue with normal auth
          sessionStorage.removeItem('user_data');
        }
      }

      // Check if user is authenticated and get user data
      const checkAuth = async () => {
        try {
          // Check if we've already verified OTP in this session
          const otpVerifiedInSession = sessionStorage.getItem('otp_verified');

          // Get auth token from cookie
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

          if (!authCookie) {
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
          let authValue;
          try {
            authValue = decodeURIComponent(cookieParts[1]);
          } catch (e) {
            authValue = cookieParts[1]; // Use raw value if decoding fails
          }

          // Extract user ID and account type from auth token
          const [userId, accountType] = authValue.split('_');

          // Validate account type
          if (accountType !== 'user') {
            router.replace('/');
            return;
          }

          // Fetch user data to verify it exists in the database
          try {
            const response = await fetch(`/api/users/${userId}?t=${Date.now()}`);

            if (!response.ok) {
              router.replace('/');
              return;
            }

            const userData = await response.json();

            // Additional validation if needed
            if (userData.user_type !== 'user' && userData.user_type !== 'fur_parent') {
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
            router.replace('/');
          }
        } catch (error) {
          router.replace('/');
        }
      };

      checkAuth();
    }, [router, hasShownOTPModal]);

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

        } catch (e) {
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

    // Handle closing the Get Started modal when completed
    const handleGetStartedClose = () => {
      setShowGetStartedModal(false);
      // Mark that the user has completed the tutorial
      localStorage.setItem('has_completed_tutorial', 'true');
      // Also set the ref to true to prevent showing it again in this session
      hasShownGetStartedModalRef.current = true;
    };

    // Handle "Not Now" button click
    const handleGetStartedNotNow = () => {
      setShowGetStartedModal(false);
      // Don't mark as completed, just hide for this session
      hasShownGetStartedModalRef.current = true;
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
