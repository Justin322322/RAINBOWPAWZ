'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';
import OTPVerificationModal from '@/components/OTPVerificationModal';
import GetStartedModal from '@/components/GetStartedModal';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

// Define the shape of the user data
export interface UserData {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  user_type: string;
  is_otp_verified: number;
  is_verified: boolean;
  phone?: string;
  address?: string;
  created_at: string;
  [key: string]: any; // Allow for other properties
}

// Global state to prevent re-verification on page navigation
let globalUserAuthState = {
  verified: false,
  userData: null as UserData | null,
};

// Function to clear global user auth state (for logout)
export const clearGlobalUserAuthState = () => {
  globalUserAuthState = {
    verified: false,
    userData: null,
  };
};

// HOC to wrap components that require user authentication (fur parents) with OTP verification
const withUserAuth = <P extends object>(
  Component: React.ComponentType<P & { userData: UserData }>
) => {
  const WithUserAuth: React.FC<Omit<P, 'userData'>> = (props) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(globalUserAuthState.verified);
    const [userData, setUserData] = useState<UserData | null>(globalUserAuthState.userData);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [showGetStartedModal, setShowGetStartedModal] = useState(false);
    
    // Track if we've shown modals to prevent multiple renders
    const hasShownOTPModalRef = useRef(false);
    const hasShownGetStartedModalRef = useRef(false);

    // Check for first-time login to show Get Started modal
    const checkFirstTimeLogin = React.useCallback(() => {
      if (userData?.user_type === 'user' || userData?.role === 'user') {
        const userId = userData.user_id || userData.id;
        const sessionKey = `getting_started_shown_${userId}`;
        const permanentKey = `getting_started_dismissed_${userId}`;

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
      // If already verified globally and OTP is verified, we can skip the check
      if (globalUserAuthState.verified && globalUserAuthState.userData) {
        // Check if the user is OTP verified
        if (globalUserAuthState.userData.is_otp_verified === 1) {
          setUserData(globalUserAuthState.userData);
          setIsAuthenticated(true);
          // Check for first-time login
          setTimeout(checkFirstTimeLogin, 100);
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
          setTimeout(checkFirstTimeLogin, 100);
          return;
        }

        // If OTP is not verified, show OTP modal
        if (globalUserAuthState.userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
          hasShownOTPModalRef.current = true;
          setShowOTPModal(true);
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

        // Check OTP status
        const otpVerifiedInSession = sessionStorage.getItem('otp_verified') === 'true';
        if (fastCheck.userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
          hasShownOTPModalRef.current = true;
          setShowOTPModal(true);
        } else if (fastCheck.userData.is_otp_verified === 1 || otpVerifiedInSession) {
          setTimeout(checkFirstTimeLogin, 100);
        }
        return;
      }

      // Check cached user data
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

          // Check OTP status
          const otpVerifiedInSession = sessionStorage.getItem('otp_verified') === 'true';
          if (parsedData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
            hasShownOTPModalRef.current = true;
            setShowOTPModal(true);
          } else if (parsedData.is_otp_verified === 1 || otpVerifiedInSession) {
            setTimeout(checkFirstTimeLogin, 100);
          }
          return;
        } catch {
          sessionStorage.removeItem('user_data');
        }
      }

      // Perform secure auth check
      const checkAuth = async () => {
        try {
          // Use the user-specific API check that includes full user data
          const response = await fetch('/api/auth/check-user-status', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
          });

          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              router.replace('/');
              return;
            }
            throw new Error('Auth check failed');
          }

          const result = await response.json();

          if (!result.success || !result.user) {
            router.replace('/');
            return;
          }

          const fetchedUserData = result.user;

          // Ensure the user is a fur parent
          if (fetchedUserData.user_type !== 'user' && fetchedUserData.role !== 'fur_parent') {
            router.replace('/');
            return;
          }

          setUserData(fetchedUserData);
          setIsAuthenticated(true);
          sessionStorage.setItem('user_data', JSON.stringify(fetchedUserData));
          globalUserAuthState = { verified: true, userData: fetchedUserData };

          // Check OTP status after successful auth
          const otpVerifiedInSession = sessionStorage.getItem('otp_verified') === 'true';
          if (fetchedUserData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModalRef.current) {
            hasShownOTPModalRef.current = true;
            setShowOTPModal(true);
          } else if (fetchedUserData.is_otp_verified === 1 || otpVerifiedInSession) {
            setTimeout(checkFirstTimeLogin, 100);
          }

        } catch (error) {
          console.error('[withUserAuth] Error during auth check:', error);
          router.replace('/');
        }
      };

      checkAuth();
    }, [router, checkFirstTimeLogin]);

    // Handle successful OTP verification
    const handleOTPVerificationSuccess = () => {
      if (userData) {
        const updatedUserData = {
          ...userData,
          is_otp_verified: 1
        };

        // Update all state and storage
        setUserData(updatedUserData);
        sessionStorage.setItem('user_data', JSON.stringify(updatedUserData));
        sessionStorage.setItem('otp_verified', 'true');
        sessionStorage.removeItem('needs_otp_verification');

        // Update global state
        globalUserAuthState = {
          verified: true,
          userData: updatedUserData
        };

        // Close OTP modal
        setShowOTPModal(false);

        // Check if Get Started modal should be shown
        setTimeout(checkFirstTimeLogin, 500);
      }
    };

    // Handle Get Started modal completion
    const handleGetStartedClose = () => {
      setShowGetStartedModal(false);
      if (userData?.user_id || userData?.id) {
        const userId = userData.user_id || userData.id;
        const sessionKey = `getting_started_shown_${userId}`;
        const permanentKey = `getting_started_dismissed_${userId}`;
        sessionStorage.setItem(sessionKey, 'true');
        localStorage.setItem(permanentKey, 'true');
      }
      hasShownGetStartedModalRef.current = true;
    };

    // Handle Get Started "Not Now" click
    const handleGetStartedNotNow = () => {
      setShowGetStartedModal(false);
      if (userData?.user_id || userData?.id) {
        const userId = userData.user_id || userData.id;
        const sessionKey = `getting_started_shown_${userId}`;
        sessionStorage.setItem(sessionKey, 'true');
      }
      hasShownGetStartedModalRef.current = true;
    };

    // Show loading screen while authenticating
    if (!isAuthenticated || !userData) {
      return <AuthLoadingScreen />;
    }

    return (
      <>
        {/* OTP Verification Modal */}
        {userData.is_otp_verified === 0 && (
          <OTPVerificationModal
            isOpen={showOTPModal}
            onVerificationSuccess={handleOTPVerificationSuccess}
            userEmail={userData.email}
            userId={userData.user_id || userData.id}
            onClose={() => {
              // If user closes without verifying, redirect to home
              router.replace('/');
            }}
          />
        )}

        {/* Get Started Modal */}
        <GetStartedModal
          isOpen={showGetStartedModal}
          onClose={handleGetStartedClose}
          onNotNow={handleGetStartedNotNow}
          userName={userData.first_name || 'there'}
        />

        {/* Render the component with blur effect if OTP verification is required */}
        <div
          className={userData.is_otp_verified === 0 && showOTPModal ? 'filter blur-sm pointer-events-none' : ''}
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

  return WithUserAuth;
};

export default withUserAuth; 
