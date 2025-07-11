'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { fastAuthCheck } from '@/utils/auth';
// Business verification cache functionality removed

// clearBusinessVerificationCache function removed - not used

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
          try {
            const businessCache = sessionStorage.getItem('business_verification_cache');
            if (businessCache) {
              const cache = JSON.parse(businessCache);
              if (cache.verified && cache.userData && cache.timestamp) {
                // Use cached data if it's less than 5 minutes old
                const cacheAge = Date.now() - cache.timestamp;
                if (cacheAge < 5 * 60 * 1000) { // 5 minutes
                  setUserData(cache.userData);
                  setIsAuthenticated(true);
                  globalBusinessAuthState = {
                    verified: true,
                    userData: cache.userData
                  };
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch (cacheError) {
            console.warn('Failed to read business verification cache:', cacheError);
          }

          // Skip client-side auth check and go directly to API
          // This is more reliable with JWT tokens and provides better security
          if (process.env.NODE_ENV === 'development') {
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
              // Log response text for debugging
              try {
                const _errorText = await response.text();
              } catch {
              }
            }
            
            // Clear any stale auth data before redirecting
            // Cache clearing removed
            globalBusinessAuthState = { verified: false, userData: null };
            
            // Handle different error types
            if (response.status === 401) {
              // Unauthorized - user is not logged in
              if (process.env.NODE_ENV === 'development') {
              }
              router.push('/');
            } else if (response.status === 403) {
              // Forbidden - user is not a business user
              if (process.env.NODE_ENV === 'development') {
              }
              router.push('/');
            } else {
              // Other errors - redirect to home
              if (process.env.NODE_ENV === 'development') {
              }
              router.push('/');
            }
            return;
          }

          const result = await response.json();

          if (process.env.NODE_ENV === 'development') {
          }

          if (!result.success) {
            if (process.env.NODE_ENV === 'development') {
            }
            // Clear any stale auth data before redirecting
            // Cache clearing removed
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
            }
            // Clear any stale auth data before redirecting
            // Cache clearing removed
            globalBusinessAuthState = { verified: false, userData: null };
            router.push('/');
            return;
          }

          // Check if business has service provider data
          if (!serviceProvider) {
            if (process.env.NODE_ENV === 'development') {
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
            }

            setUserData(completeUserData);
            setIsAuthenticated(true);

            // Cache the verification result in session storage
            try {
              sessionStorage.setItem('business_verification_cache', JSON.stringify({
                verified: true,
                userData: completeUserData,
                timestamp: Date.now()
              }));

              // Also update user_data for compatibility
              sessionStorage.setItem('user_data', JSON.stringify(completeUserData));

              // Store user full name for navbar
              const fullName = `${completeUserData.first_name} ${completeUserData.last_name}`.trim();
              sessionStorage.setItem('user_full_name', fullName);
            } catch (error) {
              console.error('Failed to cache business verification:', error);
            }

            // Cache in global state like admin
            globalBusinessAuthState = {
              verified: true,
              userData: completeUserData
            };

          } else if (applicationStatus === 'restricted') {
            // Business is restricted, redirect to restricted page
            if (process.env.NODE_ENV === 'development') {
            }
            router.push('/cremation/restricted');
            return;
          } else {
            // Business is pending or rejected, redirect to pending verification
            if (process.env.NODE_ENV === 'development') {
            }
            router.push('/cremation/pending-verification');
            return;
          }

        } catch (error) {
          console.error('[withBusinessVerification] Error checking business verification:', error);

          // Check if this is a logout scenario or intentional navigation away
          const isLogoutScenario = typeof window !== 'undefined' &&
                                  (window.location.pathname === '/' ||
                                   document.cookie.indexOf('auth_token') === -1);

          // Only show errors and redirect if not in logout scenario
          if (!isLogoutScenario) {
            // Clear any stale auth data before redirecting
            // Cache clearing removed
            globalBusinessAuthState = { verified: false, userData: null };
            router.push('/');
          }
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
