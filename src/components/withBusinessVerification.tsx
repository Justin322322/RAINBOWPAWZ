'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';

// Force reset the global state to ensure verification checks happen every time
const globalBusinessAuthState = {
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
      // Don't clear session storage on every mount - this causes flickering
      // Only clear if we need to force a verification check
      // sessionStorage.removeItem('verified_business');

      // Check if user is authenticated and get user data
      const checkAuth = async () => {
        // If we already have verified data, skip the verification process
        if (globalBusinessAuthState.verified && globalBusinessAuthState.userData) {
          setIsAuthenticated(true);
          setUserData(globalBusinessAuthState.userData);
          setIsLoading(false);
          return;
        }

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
            const response = await fetch(`/api/users/${userId}?_=${Date.now()}`);

            if (!response.ok) {
              router.replace('/');
              return;
            }

            const userData = await response.json();

            // Check verification status before allowing dashboard access
            const isVerified = checkBusinessVerification(userData);
            if (!isVerified) {
              router.replace('/cremation/pending-verification');
              return;
            }

            // Make sure business_id is set for the user
            if (!userData.business_id && userData.user_type === 'business') {
              try {
                const spResponse = await fetch(`/api/service-providers?userId=${userId}&_=${Date.now()}`);
                if (spResponse.ok) {
                  const spData = await spResponse.json();
                  if (spData.provider && spData.provider.id) {
                    userData.business_id = spData.provider.id;
                  }
                }
              } catch (spError) {
              }
            }

            // Set the user data and store in session storage
            setUserData(userData);
            setIsAuthenticated(true);
            sessionStorage.setItem('user_data', JSON.stringify(userData));
            sessionStorage.setItem('verified_business', 'true');

            // Store the user's name in localStorage for persistence across page loads
            // Always prioritize the user's actual name over business name
            if (userData.first_name) {
              const fullName = `${userData.first_name} ${userData.last_name || ''}`;
              localStorage.setItem('cremation_user_name', fullName);
              // Also store in sessionStorage for immediate access
              sessionStorage.setItem('user_full_name', fullName);
            }

            // Update global state
            globalBusinessAuthState.verified = true;
            globalBusinessAuthState.userData = userData;

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

    // Function to check if a business is verified
    const checkBusinessVerification = (userData: any): boolean => {

      // This is a hard verification check that cannot be bypassed
      if (!userData) return false;

      // First check: verify the user has proper verification flags
      if (userData.is_verified !== 1) {
        return false;
      }

      // Second check: verify the service provider exists
      if (!userData.service_provider) {
        return false;
      }

      // ONLY check application_status - ignore other fields that might not exist
      const applicationStatus = userData.service_provider.application_status ?
                                String(userData.service_provider.application_status).toLowerCase() : null;


      // DIRECTLY check if application_status === 'approved'
      if (applicationStatus === 'approved') {
        return true;
      }

      // If application_status is 'pending', deny access
      if (applicationStatus === 'pending') {
        return false;
      }

      // Check for documents as a fallback
      const hasDocuments = userData.service_provider.business_permit_path ||
                          userData.service_provider.government_id_path ||
                          userData.service_provider.bir_certificate_path;

      if (!hasDocuments) {
        return false;
      }

      // If we get here and there's no specific status but they have documents, allow access
      if (hasDocuments && !applicationStatus) {
        return true;
      }

      // Any other case, deny access
      return false;
    };

    // No need to create a safe copy of props, pass them directly

    // If we have userData but are still loading, render the component anyway
    // This prevents flickering during navigation
    if (isLoading && userData) {
      return <Component {...props} userData={userData} />;
    }

    // If we're loading and don't have userData, let the layout handle it
    if (isLoading) {
      // Return an empty div instead of null to maintain DOM structure
      return <div style={{ display: 'none' }}></div>;
    }

    // Don't render anything if not authenticated
    if (!isAuthenticated || !userData) {
      // Return an empty div instead of null to maintain DOM structure
      return <div style={{ display: 'none' }}></div>;
    }

    // Render the wrapped component with user data
    return <Component {...props} userData={userData} />;
  };

  return WithBusinessVerification;
};

export default withBusinessVerification;
