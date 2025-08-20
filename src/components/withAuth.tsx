'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import OTPVerificationModal from '@/components/OTPVerificationModal';
import GetStartedModal from '@/components/GetStartedModal';

// Define the shape of user data for different user types
interface AdminData {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  [key: string]: any;
}

interface BusinessData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  user_type: string;
  business_id?: number;
  business_name?: string;
  service_provider?: any;
  is_otp_verified: number;
  [key: string]: any;
}

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
  [key: string]: any;
}

type AuthUserData = AdminData | BusinessData | UserData;

// Configuration for different user types
interface AuthConfig {
  requiredUserType: 'admin' | 'business' | 'user';
  requireOtpVerification?: boolean;
  requireBusinessVerification?: boolean;
  redirectTo?: string;
  showGetStartedModal?: boolean;
}

// Default configurations for each user type
const authConfigs: Record<string, AuthConfig> = {
  admin: {
    requiredUserType: 'admin',
    requireOtpVerification: false,
    requireBusinessVerification: false,
    redirectTo: '/',
  },
  business: {
    requiredUserType: 'business',
    requireOtpVerification: false,
    requireBusinessVerification: true,
    redirectTo: '/',
  },
  user: {
    requiredUserType: 'user',
    requireOtpVerification: true,
    requireBusinessVerification: false,
    redirectTo: '/',
    showGetStartedModal: true,
  },
};

// HOC to wrap components that require authentication
const withAuth = <P extends object>(
  Component: React.ComponentType<P & { userData: AuthUserData }>,
  userType: 'admin' | 'business' | 'user' = 'user'
) => {
  const WithAuthComponent: React.FC<Omit<P, 'userData'>> = (props) => {
    const router = useRouter();
    const { 
      isAuthenticated, 
      userData, 
      userType: authUserType, 
      isOtpVerified, 
      isBusinessVerified, 
      isLoading,
      checkAuthStatus 
    } = useAuth();
    
    const config = authConfigs[userType];
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [showGetStartedModal, setShowGetStartedModal] = useState(false);
    
    // Track if we've shown modals to prevent multiple renders
    const hasShownOTPModalRef = useRef(false);
    const hasShownGetStartedModalRef = useRef(false);

    // Check for first-time login to show Get Started modal (only for users)
    const checkFirstTimeLogin = React.useCallback(() => {
      if (userData?.user_type === 'user' && config.showGetStartedModal) {
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
    }, [userData, config.showGetStartedModal]);

    useEffect(() => {
      // If not authenticated, check auth status
      if (!isAuthenticated && !isLoading) {
        checkAuthStatus();
      }
    }, [isAuthenticated, isLoading, checkAuthStatus]);

    useEffect(() => {
      // Check if user type matches required type
      if (isAuthenticated && userData && authUserType !== config.requiredUserType) {
        router.replace(config.redirectTo || '/');
        return;
      }

      // Check business verification if required
      if (isAuthenticated && userData && config.requireBusinessVerification && !isBusinessVerified) {
        if (userData.user_type === 'business') {
          const serviceProvider = (userData as BusinessData).service_provider;
          if (!serviceProvider) {
            router.push('/cremation/pending-verification');
            return;
          }
          
          if (serviceProvider.application_status === 'restricted') {
            router.push('/cremation/restricted');
            return;
          }
          
          if (serviceProvider.application_status !== 'approved') {
            router.push('/cremation/pending-verification');
            return;
          }
        }
      }

      // Check OTP verification if required
      if (isAuthenticated && userData && config.requireOtpVerification && !isOtpVerified) {
        if (!hasShownOTPModalRef.current) {
          hasShownOTPModalRef.current = true;
          setShowOTPModal(true);
        }
      } else if (isAuthenticated && userData && config.requireOtpVerification && isOtpVerified) {
        // Check for first-time login after OTP verification
        setTimeout(checkFirstTimeLogin, 100);
      }

      // Check for first-time login for non-OTP users
      if (isAuthenticated && userData && !config.requireOtpVerification) {
        setTimeout(checkFirstTimeLogin, 100);
      }
    }, [
      isAuthenticated, 
      userData, 
      authUserType, 
      isOtpVerified, 
      isBusinessVerified, 
      config, 
      router, 
      checkFirstTimeLogin
    ]);

    // Handle successful OTP verification
    const handleOTPVerificationSuccess = () => {
      if (userData && userData.user_type === 'user') {
        const updatedUserData = {
          ...userData,
          is_otp_verified: 1
        } as UserData;

        // Update storage
        sessionStorage.setItem('user_data', JSON.stringify(updatedUserData));
        sessionStorage.setItem('otp_verified', 'true');
        sessionStorage.removeItem('needs_otp_verification');

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

    // Show loading state while checking authentication
    if (isLoading) {
      return null;
    }

    // Don't render anything if not authenticated or user type doesn't match
    if (!isAuthenticated || !userData || authUserType !== config.requiredUserType) {
      return null;
    }

    // Don't render if business verification is required but not verified
    if (config.requireBusinessVerification && !isBusinessVerified) {
      return null;
    }

    // Don't render if OTP verification is required but not verified
    if (config.requireOtpVerification && !isOtpVerified) {
      return null;
    }

    return (
      <>
        {/* OTP Verification Modal */}
        {config.requireOtpVerification && userData.user_type === 'user' && (
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
        {config.showGetStartedModal && (
          <GetStartedModal
            isOpen={showGetStartedModal}
            onClose={handleGetStartedClose}
            onNotNow={handleGetStartedNotNow}
            userName={userData.first_name || 'there'}
          />
        )}

        {/* Render the component with blur effect if OTP verification is required */}
        <div
          className={
            config.requireOtpVerification && 
            userData.user_type === 'user' && 
            showOTPModal ? 
            'filter blur-sm pointer-events-none' : ''
          }
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

  return WithAuthComponent;
};

// Convenience functions for specific user types
export const withAdminAuth = <P extends object>(
  Component: React.ComponentType<P & { userData: AdminData }>
) => withAuth(Component, 'admin') as React.FC<Omit<P, 'userData'>>;

export const withBusinessAuth = <P extends object>(
  Component: React.ComponentType<P & { userData: BusinessData }>
) => withAuth(Component, 'business') as React.FC<Omit<P, 'userData'>>;

export const withUserAuth = <P extends object>(
  Component: React.ComponentType<P & { userData: UserData }>
) => withAuth(Component, 'user') as React.FC<Omit<P, 'userData'>>;
