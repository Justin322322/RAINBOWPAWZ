'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';

// Global state to prevent re-verification on page navigation
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
    const [isAuthenticated, setIsAuthenticated] = useState(globalBusinessAuthState.verified);
    const [userData, setUserData] = useState<any>(globalBusinessAuthState.userData);
    const [isLoading, setIsLoading] = useState(!globalBusinessAuthState.verified);

    useEffect(() => {
      // If already verified globally, we can skip the check
      if (globalBusinessAuthState.verified && globalBusinessAuthState.userData) {
        return;
      }

      // Fast check first to prevent flashing
      const fastCheck = fastAuthCheck();
      if (fastCheck.authenticated && fastCheck.accountType === 'business' && fastCheck.userData) {
        // Check if business is verified
        if (fastCheck.userData.is_verified !== 1) {
          router.push('/cremation/pending-verification');
          return;
        }

        setUserData(fastCheck.userData);
        setIsAuthenticated(true);
        globalBusinessAuthState = {
          verified: true,
          userData: fastCheck.userData
        };
        setIsLoading(false);
        return;
      }

      // Check if we already have user data in session storage
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        try {
          const parsedData = JSON.parse(cachedUserData);

          // Check if business is verified
          if (parsedData.user_type === 'business' && parsedData.is_verified !== 1) {
            router.push('/cremation/pending-verification');
            return;
          }

          setUserData(parsedData);
          setIsAuthenticated(true);
          globalBusinessAuthState = {
            verified: true,
            userData: parsedData
          };
          setIsLoading(false);
          return;
        } catch (e) {
          // If parsing fails, continue with normal auth
          sessionStorage.removeItem('user_data');
        }
      }

      // Check if user is authenticated and get user data
      const checkAuth = async () => {
        try {
          // Get auth token from cookie
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

          if (!authCookie) {
            router.replace('/');
            return;
          }

          // Extract token value
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
          if (accountType !== 'business') {
            router.replace('/');
            return;
          }

          // Fetch user data to verify it exists in the database
          try {
            const response = await fetch(`/api/users/${userId}`);

            if (!response.ok) {
              router.replace('/');
              return;
            }

            const userData = await response.json();

            // Check if business is verified
            if (userData.is_verified !== 1) {
              router.push('/cremation/pending-verification');
              return;
            }

            // Set the user data and store in session storage
            setUserData(userData);
            setIsAuthenticated(true);
            sessionStorage.setItem('user_data', JSON.stringify(userData));

            // Update global state
            globalBusinessAuthState = {
              verified: true,
              userData: userData
            };

          } catch (fetchError) {
            router.replace('/');
          }
        } catch (error) {
          router.replace('/');
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    // Import DashboardSkeleton at the top of the file
    if (isLoading) {
      // We'll let the CremationDashboardLayout handle the loading state
      return null;
    }

    // Don't render anything if not authenticated
    if (!isAuthenticated || !userData) {
      return null;
    }

    // Render the wrapped component with user data
    return <Component {...(props as P)} userData={userData} />;
  };

  return WithBusinessVerification;
};

export default withBusinessVerification;
