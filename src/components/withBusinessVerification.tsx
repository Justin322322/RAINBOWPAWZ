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

// Global state to cache business verification like withAdminAuth does
let globalBusinessAuthState = {
  verified: false,
  userData: null as any,
};

// HOC to wrap components that require business verification
const withBusinessVerification = <P extends object>(
  Component: React.ComponentType<P & { userData: any }>
) => {
  const WithBusinessVerification: React.FC<Omit<P, 'userData'>> = (props) => {
    const router = useRouter();

    // Always start with loading state to prevent hydration mismatch
    const [isAuthenticated, setIsAuthenticated] = useState(globalBusinessAuthState.verified);
    const [userData, setUserData] = useState<any>(globalBusinessAuthState.userData);
    const [isLoading, setIsLoading] = useState(!globalBusinessAuthState.verified);

    useEffect(() => {
      // If we already have global state, use it immediately
      if (globalBusinessAuthState.verified && globalBusinessAuthState.userData) {
        if (!userData) setUserData(globalBusinessAuthState.userData);
        if (!isAuthenticated) setIsAuthenticated(globalBusinessAuthState.verified);
        setIsLoading(false);
        return;
      }

      const checkBusinessVerification = async () => {
        try {
          // Check cache first
          const cachedVerification = getCachedBusinessVerification();
          if (cachedVerification && cachedVerification.verified && cachedVerification.userData) {
            setUserData(cachedVerification.userData);
            setIsAuthenticated(true);
            // Cache in global state like admin
            globalBusinessAuthState = {
              verified: true,
              userData: cachedVerification.userData
            };

            // Ensure profile picture is in localStorage when loading from cache
            if (cachedVerification.userData.profile_picture && typeof localStorage !== 'undefined') {
              try {
                const existingProfilePicture = localStorage.getItem('cremation_profile_picture');
                if (!existingProfilePicture || existingProfilePicture !== cachedVerification.userData.profile_picture) {
                  localStorage.setItem('cremation_profile_picture', cachedVerification.userData.profile_picture);
                  console.log('Profile picture synced to localStorage from cache:', cachedVerification.userData.profile_picture);
                }
              } catch (error) {
                console.warn('Error syncing profile picture to localStorage:', error);
              }
            }

            setIsLoading(false);
            return;
          }

          // Check if user is authenticated
          const authResult = fastAuthCheck();

          if (!authResult.authenticated) {
            if (process.env.NODE_ENV === 'development') {
              console.log('User not authenticated, redirecting to home');
            }
            router.push('/');
            return;
          }

          // For business users, we need to fetch the user data from the API
          if (authResult.accountType !== 'business') {
            if (process.env.NODE_ENV === 'development') {
              console.log('User is not a business user, redirecting to home');
            }
            router.push('/');
            return;
          }

          // Only make API call if cache is invalid or doesn't exist
          const response = await fetch('/api/auth/check-business-status');
          const result = await response.json();

          if (!result.success) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Failed to get business status, redirecting to home');
            }
            router.push('/');
            return;
          }

          const user = result.user;
          const serviceProvider = result.serviceProvider;

          // Check if user is a business user
          if (user.user_type !== 'business' && user.role !== 'business') {
            if (process.env.NODE_ENV === 'development') {
              console.log('User is not a business user, redirecting to home');
            }
            router.push('/');
            return;
          }

          // Check if business has service provider data
          if (!serviceProvider) {
            if (process.env.NODE_ENV === 'development') {
              console.log('No service provider data found, redirecting to pending verification');
            }
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

            // Cache in global state like admin
            globalBusinessAuthState = {
              verified: true,
              userData: completeUserData
            };

            // Store profile picture in localStorage for persistence across sessions
            if (user.profile_picture && typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem('cremation_profile_picture', user.profile_picture);
                console.log('Profile picture cached in localStorage during verification:', user.profile_picture);
              } catch (error) {
                console.warn('Error caching profile picture in localStorage:', error);
              }
            }

          } else if (applicationStatus === 'restricted') {
            // Business is restricted, redirect to restricted page
            if (process.env.NODE_ENV === 'development') {
              console.log('Business is restricted');
            }
            router.push('/cremation/restricted');
            return;
          } else {
            // Business is pending or rejected, redirect to pending verification
            if (process.env.NODE_ENV === 'development') {
              console.log('Business application is pending or rejected, redirecting to pending verification');
            }
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
    }, [router, isAuthenticated, userData]);

    // Show loading state while checking verification
    if (isLoading) {
      return null;
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
