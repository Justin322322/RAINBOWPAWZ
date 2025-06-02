'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';
import {
  getCachedBusinessVerification,
  setCachedBusinessVerification,
  clearBusinessVerificationCache
} from '@/utils/businessVerificationCache';

// Export the clear function for use in other components
export { clearBusinessVerificationCache };

// HOC to wrap components that require business verification
const withBusinessVerification = <P extends object>(
  Component: React.ComponentType<P & { userData: any }>
) => {
  const WithBusinessVerification: React.FC<Omit<P, 'userData'>> = (props) => {
    const router = useRouter();

    // Always start with loading state to prevent hydration mismatch
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // Set mounted state to prevent hydration mismatch
    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      if (!isMounted) return; // Wait for component to mount

      const checkBusinessVerification = async () => {
        try {
          // Check cache after component is mounted
          const cachedVerification = getCachedBusinessVerification();
          if (cachedVerification && cachedVerification.verified && cachedVerification.userData) {
            setUserData(cachedVerification.userData);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }

          // Check if user is authenticated
          const authResult = fastAuthCheck();

          if (!authResult.authenticated) {
            console.log('User not authenticated, redirecting to home');
            router.push('/');
            return;
          }

          // For business users, we need to fetch the user data from the API
          if (authResult.accountType !== 'business') {
            console.log('User is not a business user, redirecting to home');
            router.push('/');
            return;
          }

          // Only make API call if cache is invalid or doesn't exist
          const response = await fetch('/api/auth/check-business-status');
          const result = await response.json();

          if (!result.success) {
            console.log('Failed to get business status, redirecting to home');
            router.push('/');
            return;
          }

          const user = result.user;
          const serviceProvider = result.serviceProvider;

          // Check if user is a business user
          if (user.user_type !== 'business' && user.role !== 'business') {
            console.log('User is not a business user, redirecting to home');
            router.push('/');
            return;
          }

          // Check if business has service provider data
          if (!serviceProvider) {
            console.log('No service provider data found, redirecting to pending verification');
            router.push('/cremation/pending-verification');
            return;
          }

          // Check application status
          const applicationStatus = serviceProvider.application_status;

          if (applicationStatus === 'approved') {
            // Business is approved, allow access
            const completeUserData = {
              ...user,
              business_id: serviceProvider.provider_id,
              business_name: serviceProvider.name,
              service_provider: serviceProvider
            };

            setUserData(completeUserData);
            setIsAuthenticated(true);

            // Cache the verification result
            setCachedBusinessVerification(completeUserData, true);

          } else if (applicationStatus === 'restricted') {
            // Business is restricted, redirect to restricted page
            console.log('Business is restricted');
            router.push('/cremation/restricted');
            return;
          } else {
            // Business is pending or rejected, redirect to pending verification
            console.log('Business application is pending or rejected, redirecting to pending verification');
            router.push('/cremation/pending-verification');
            return;
          }

        } catch (error) {
          console.error('Error checking business verification:', error);
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      };

      checkBusinessVerification();
    }, [router, isMounted]);

    // Show loading state while checking verification
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-green)] mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying business access...</p>
          </div>
        </div>
      );
    }

    // Only render component if authenticated and verified
    if (isAuthenticated && userData) {
      return <Component {...(props as P)} userData={userData} />;
    }

    // Return null if not authenticated (user will be redirected)
    return null;
  };

  return WithBusinessVerification;
};

export default withBusinessVerification;
