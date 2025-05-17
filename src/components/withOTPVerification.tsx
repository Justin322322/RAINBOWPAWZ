'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerificationModal from './OTPVerificationModal';
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
    
    // Check if we've already shown the OTP modal in this session
    const [hasShownOTPModal, setHasShownOTPModal] = useState(false);
    // Use a ref to track if we've shown the modal to prevent multiple renders from showing it again
    const hasShownOTPModalRef = useRef(false);

    useEffect(() => {
      // If already verified globally, we can skip the check
      if (globalUserAuthState.verified && globalUserAuthState.userData) {
        // Check if the user is verified in the global state
        if (globalUserAuthState.userData.is_otp_verified === 1) {
          setUserData(globalUserAuthState.userData);
          setIsAuthenticated(true);
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

        // Check OTP status
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

          // Show OTP modal if user is not verified and we haven't shown it in this session
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

            // Show OTP modal if user is not verified and we haven't shown it in this session
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

        {/* Render the wrapped component with a blur effect if OTP verification is required */}
        <div 
          className={userData.is_otp_verified === 0 ? 'filter blur-sm pointer-events-none' : ''}
          style={{ position: 'relative', minHeight: '100vh' }}
        >
          <Component {...(props as P)} userData={userData} />
        </div>
      </>
    );
  };

  return WithOTPVerification;
};

export default withOTPVerification;
