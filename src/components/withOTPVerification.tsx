'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerificationModal from './OTPVerificationModal';

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

// HOC to wrap components that require OTP verification
const withOTPVerification = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithOTPVerification: React.FC<P> = (props) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [showOTPModal, setShowOTPModal] = useState(false);

    // Check if we've already shown the OTP modal in this session
    const [hasShownOTPModal, setHasShownOTPModal] = useState(false);

    useEffect(() => {
      // Check if user is authenticated and get user data
      const checkAuth = async () => {
        try {
          // Check if we've already verified OTP in this session
          const otpVerifiedInSession = sessionStorage.getItem('otp_verified');

          // Get auth token from cookie
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

          if (!authCookie) {
            console.log('No auth cookie found, redirecting to home');
            router.push('/');
            return;
          }

          // Extract user ID and account type from auth token
          const authValue = authCookie.split('=')[1];
          const [userId, accountType] = authValue.split('_');

          // Validate account type
          if (accountType !== 'user') {
            console.log('Invalid account type for fur parent dashboard:', accountType);
            router.push('/');
            return;
          }

          // Fetch user data to verify it exists in the database
          try {
            const response = await fetch(`/api/users/${userId}`);

            if (!response.ok) {
              console.error('Failed to fetch user data:', await response.text());
              router.push('/');
              return;
            }

            const userData = await response.json();

            // Additional validation if needed
            if (userData.user_type !== 'user' && userData.user_type !== 'fur_parent') {
              console.log('User is not a fur parent:', userData.user_type);
              router.push('/');
              return;
            }

            // Set the user data
            setUserData(userData);
            setIsAuthenticated(true);

            // Show OTP modal if user is not verified and we haven't shown it in this session
            if (userData.is_otp_verified === 0 && !otpVerifiedInSession && !hasShownOTPModal) {
              setShowOTPModal(true);
              setHasShownOTPModal(true);
            }
          } catch (fetchError) {
            console.error('Error fetching user data:', fetchError);
            router.push('/');
          }
        } catch (error) {
          console.error('Authentication error:', error);
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router, hasShownOTPModal]);

    const handleVerificationSuccess = () => {
      // Update user data to reflect verification
      if (userData) {
        setUserData({
          ...userData,
          is_otp_verified: 1
        });
      }
      setShowOTPModal(false);
    };

    // Show loading state
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
            <h1 className="text-2xl font-medium text-[var(--primary-green)] mt-4 mb-2">Verifying Access</h1>
            <p className="text-gray-500">Please wait while we verify your credentials.</p>
          </div>
        </div>
      );
    }

    // Will be redirected by the useEffect if not authenticated
    if (!isAuthenticated || !userData) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-medium text-red-500 mb-4">Access Denied</h1>
            <p className="text-gray-500">You do not have permission to access this page.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-opacity-90"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
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
            onClose={() => setShowOTPModal(false)}
          />
        )}

        {/* Render the wrapped component with a blur effect if OTP verification is required */}
        <div className={userData.is_otp_verified === 0 ? 'filter blur-sm pointer-events-none' : ''}>
          <Component {...props} userData={userData} />
        </div>
      </>
    );
  };

  return WithOTPVerification;
};

export default withOTPVerification;
