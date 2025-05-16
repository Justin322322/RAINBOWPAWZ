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
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Always clear session storage verification cache on mount to force fresh check
      sessionStorage.removeItem('verified_business');
      
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
            const response = await fetch(`/api/users/${userId}?_=${Date.now()}`);

            if (!response.ok) {
              router.replace('/');
              return;
            }

            const userData = await response.json();

            // Check verification status before allowing dashboard access
            const isVerified = checkBusinessVerification(userData);
            if (!isVerified) {
              console.log('Business not verified, redirecting to pending verification page');
              router.replace('/cremation/pending-verification');
              return;
            }
            
            // Make sure business_id is set for the user
            if (!userData.business_id && userData.user_type === 'business') {
              console.log('User lacks business_id, attempting to find from service_providers');
              try {
                const spResponse = await fetch(`/api/service-providers?userId=${userId}&_=${Date.now()}`);
                if (spResponse.ok) {
                  const spData = await spResponse.json();
                  if (spData.provider && spData.provider.id) {
                    userData.business_id = spData.provider.id;
                    console.log(`Set business_id to ${userData.business_id}`);
                  }
                }
              } catch (spError) {
                console.error('Error fetching service provider:', spError);
              }
            }

            // Set the user data and store in session storage
            setUserData(userData);
            setIsAuthenticated(true);
            sessionStorage.setItem('user_data', JSON.stringify(userData));
            sessionStorage.setItem('verified_business', 'true');

            // Update global state
            globalBusinessAuthState.verified = true;
            globalBusinessAuthState.userData = userData;

          } catch (fetchError) {
            console.error('Error fetching user data:', fetchError);
            router.replace('/');
          }
        } catch (error) {
          console.error('Authentication error:', error);
          router.replace('/');
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    // Function to check if a business is verified
    const checkBusinessVerification = (userData: any): boolean => {
      console.log('Checking business verification status:', userData);
      
      // This is a hard verification check that cannot be bypassed
      if (!userData) return false;
      
      // First check: verify the user has proper verification flags
      if (userData.is_verified !== 1) {
        console.log('User verification check failed: is_verified not valid');
        return false;
      }
      
      // Second check: verify the service provider exists
      if (!userData.service_provider) {
        console.log('Service provider data missing');
        return false;
      }
      
      // ONLY check application_status - ignore other fields that might not exist
      const applicationStatus = userData.service_provider.application_status ? 
                                String(userData.service_provider.application_status).toLowerCase() : null;
      
      console.log('Application status:', applicationStatus);
      
      // DIRECTLY check if application_status === 'approved'
      if (applicationStatus === 'approved') {
        console.log('APPLICATION STATUS IS APPROVED - SHOULD GRANT ACCESS');
        return true;
      }
      
      // If application_status is 'pending', deny access
      if (applicationStatus === 'pending') {
        console.log('Application is pending verification');
        return false;
      }
      
      // Check for documents as a fallback
      const hasDocuments = userData.service_provider.business_permit_path || 
                          userData.service_provider.government_id_path || 
                          userData.service_provider.bir_certificate_path;
      
      if (!hasDocuments) {
        console.log('Document verification check failed');
        return false;
      }
      
      // If we get here and there's no specific status but they have documents, allow access
      if (hasDocuments && !applicationStatus) {
        console.log('No status found but documents uploaded, allowing access');
        return true;
      }
      
      // Any other case, deny access
      console.log('Verification check failed, access denied');
      return false;
    };

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
