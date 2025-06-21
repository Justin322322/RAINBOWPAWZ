'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { fastAuthCheck } from '@/utils/auth';
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

// Function to clear global business auth state (for logout)
export const clearGlobalBusinessAuthState = () => {
  globalBusinessAuthState = {
    verified: false,
    userData: null,
  };
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
      // If global state has been cleared (e.g., after logout), reset local state
      if (!globalBusinessAuthState.verified && !globalBusinessAuthState.userData) {
        setIsAuthenticated(false);
        setUserData(null);
        setIsLoading(true);
      }

      // If we already have global state, use it immediately
      if (globalBusinessAuthState.verified && globalBusinessAuthState.userData) {
        setUserData(globalBusinessAuthState.userData);
        setIsAuthenticated(globalBusinessAuthState.verified);
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
            setIsLoading(false);
            return;
          }

          // Skip client-side auth check and go directly to API
          // This is more reliable with JWT tokens and provides better security
          if (process.env.NODE_ENV === 'development') {
            console.log('[withBusinessVerification] Checking business status via API');
          }

          // Make API call to check business status with improved error handling
          const response = await fetch('/api/auth/check-business-status', {
            method: 'GET',
            credentials: 'include', // Include httpOnly cookies
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
          });

          if (!response.ok) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] API call failed with status:', response.status);
              // Log response text for debugging
              try {
                const errorText = await response.text();
                console.log('[withBusinessVerification] Error response:', errorText);
              } catch {
                console.log('[withBusinessVerification] Could not read error response');
              }
            }
            
            // Clear any stale auth data before redirecting
            clearBusinessVerificationCache();
            globalBusinessAuthState = { verified: false, userData: null };
            
            // Handle different error types
            if (response.status === 401) {
              // Unauthorized - user is not logged in
              if (process.env.NODE_ENV === 'development') {
                console.log('[withBusinessVerification] User not authenticated (401), redirecting to home');
              }
              router.push('/');
            } else if (response.status === 403) {
              // Forbidden - user is not a business user
              if (process.env.NODE_ENV === 'development') {
                console.log('[withBusinessVerification] User not authorized as business (403), redirecting to home');
              }
              router.push('/');
            } else {
              // Other errors - redirect to home
              if (process.env.NODE_ENV === 'development') {
                console.log('[withBusinessVerification] API error, redirecting to home');
              }
              router.push('/');
            }
            return;
          }

          const result = await response.json();

          if (process.env.NODE_ENV === 'development') {
            console.log('[withBusinessVerification] API response:', result);
          }

          if (!result.success) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] Failed to get business status:', result.error);
            }
            // Clear any stale auth data before redirecting
            clearBusinessVerificationCache();
            globalBusinessAuthState = { verified: false, userData: null };
            router.push('/');
            return;
          }

          const user = result.user;
          const serviceProvider = result.serviceProvider;

          if (process.env.NODE_ENV === 'development') {
            console.log('[withBusinessVerification] Got user and service provider data:', { 
              userType: user.user_type, 
              role: user.role, 
              hasServiceProvider: !!serviceProvider,
              applicationStatus: serviceProvider?.application_status 
            });
          }

          // Check if user is a business user
          if (user.user_type !== 'business' && user.role !== 'business') {
            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] User is not a business user, redirecting to home');
            }
            // Clear any stale auth data before redirecting
            clearBusinessVerificationCache();
            globalBusinessAuthState = { verified: false, userData: null };
            router.push('/');
            return;
          }

          // Check if business has service provider data
          if (!serviceProvider) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] No service provider data found, redirecting to pending verification');
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

            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] Business approved, setting user data');
            }

            setUserData(completeUserData);
            setIsAuthenticated(true);

            // Cache the verification result
            setCachedBusinessVerification(completeUserData, true);

            // Cache in global state like admin
            globalBusinessAuthState = {
              verified: true,
              userData: completeUserData
            };

          } else if (applicationStatus === 'restricted') {
            // Business is restricted, redirect to restricted page
            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] Business is restricted');
            }
            router.push('/cremation/restricted');
            return;
          } else {
            // Business is pending or rejected, redirect to pending verification
            if (process.env.NODE_ENV === 'development') {
              console.log('[withBusinessVerification] Business application is pending or rejected, redirecting to pending verification');
            }
            router.push('/cremation/pending-verification');
            return;
          }

        } catch (error) {
          console.error('[withBusinessVerification] Error checking business verification:', error);
          // Clear any stale auth data before redirecting
          clearBusinessVerificationCache();
          globalBusinessAuthState = { verified: false, userData: null };
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      };

      checkBusinessVerification();
    }, [router]); // Only depend on router to avoid infinite re-render loop
    // Note: isAuthenticated, isLoading, and userData are intentionally not included
    // in dependencies to prevent infinite re-renders in this auth verification pattern

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
