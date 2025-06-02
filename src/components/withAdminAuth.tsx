'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';

// Define the shape of the admin data
export interface AdminData {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  [key: string]: any; // Allow for other properties
}

// Global state to prevent re-verification on page navigation
let globalAdminAuthState = {
  verified: false,
  adminData: null as AdminData | null,
};

// HOC to wrap components that require admin authentication
// P_Original are the props of the component being wrapped, *excluding* the injected adminData prop.
const withAdminAuth = <P_Original extends object>(
  WrappedComponent: React.ComponentType<P_Original & { adminData: AdminData }>
) => {
  const WithAdminAuthComponent: React.FC<P_Original> = (props) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(globalAdminAuthState.verified);
    // Renamed state to avoid conflict with injected prop name
    const [retrievedAdminData, setRetrievedAdminData] = useState<AdminData | null>(globalAdminAuthState.adminData);

    useEffect(() => {
      if (globalAdminAuthState.verified && globalAdminAuthState.adminData) {
        // Ensure local state is also up-to-date if global state was already set
        if (!retrievedAdminData) setRetrievedAdminData(globalAdminAuthState.adminData);
        if (!isAuthenticated) setIsAuthenticated(globalAdminAuthState.verified);
        return;
      }

      const fastCheck = fastAuthCheck();
      if (fastCheck.authenticated && fastCheck.accountType === 'admin' && fastCheck.adminData) {
        setRetrievedAdminData(fastCheck.adminData);
        setIsAuthenticated(true);
        globalAdminAuthState = {
          verified: true,
          adminData: fastCheck.adminData
        };
        return;
      }

      const cachedAdminData = sessionStorage.getItem('admin_data');
      if (cachedAdminData) {
        try {
          const parsedData = JSON.parse(cachedAdminData);
          setRetrievedAdminData(parsedData);
          setIsAuthenticated(true);
          globalAdminAuthState = {
            verified: true,
            adminData: parsedData
          };
          return;
        } catch (e) {
          sessionStorage.removeItem('admin_data');
        }
      }

      const checkAuth = async () => {
        try {

          // Get the auth token from cookie or sessionStorage
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

          // First try cookies
          if (authCookie) {
            const cookieParts = authCookie.split('=');
            if (cookieParts.length === 2) {
              let authValue;
              try {
                authValue = decodeURIComponent(cookieParts[1]);
              } catch (e) {
                authValue = cookieParts[1];
              }

              const tokenParts = authValue.split('_');

              if (tokenParts.length === 2) {
                const [userId, accountType] = tokenParts;

                if (userId && accountType === 'admin') {
                  await fetchAdminData(userId);
                  return;
                }
              }
            }
          }

          // Check for port 3000 specific token in localStorage
          if (window.location.port === '3000') {
            try {
              const localStorageToken = localStorage.getItem('auth_token_3000');
              if (localStorageToken) {
                const tokenParts = localStorageToken.split('_');

                if (tokenParts.length === 2) {
                  const [userId, accountType] = tokenParts;

                  if (userId && accountType === 'admin') {
                    await fetchAdminData(userId);
                    return;
                  }
                }
              }
            } catch (e) {
            }
          }

          // Try sessionStorage as fallback
          const sessionToken = sessionStorage.getItem('auth_token');
          if (sessionToken) {
            const tokenParts = sessionToken.split('_');

            if (tokenParts.length === 2) {
              const [userId, accountType] = tokenParts;

              if (userId && accountType === 'admin') {
                await fetchAdminData(userId);
                return;
              }
            }
          }

          // If we get here, no valid auth token was found
          router.replace('/');
        } catch (error) {
          router.replace('/');
        }
      };

      // Helper function to fetch admin data
      const fetchAdminData = async (userId: string) => {
        try {
          const response = await fetch(`/api/admins/${userId}`);

          if (!response.ok) {

            // Try to get the error message
            try {
              const errorData = await response.json();
            } catch (parseError) {
            }

            router.replace('/');
            return;
          }

          const fetchedAdminData = await response.json();

          if (!fetchedAdminData.user_type || fetchedAdminData.user_type !== 'admin') {
            router.replace('/');
            return;
          }

          setRetrievedAdminData(fetchedAdminData);
          setIsAuthenticated(true);
          sessionStorage.setItem('admin_data', JSON.stringify(fetchedAdminData));
          globalAdminAuthState = { verified: true, adminData: fetchedAdminData };
        } catch (fetchError) {
          router.replace('/');
        }
      };
      checkAuth();
    }, [router, retrievedAdminData, isAuthenticated]); // Added dependencies

    if (!isAuthenticated || !retrievedAdminData) {
      return null; // Or loading indicator
    }

    // Pass props directly without processing
    return <WrappedComponent {...props} adminData={retrievedAdminData} />;
  };
  return WithAdminAuthComponent;
};

export default withAdminAuth;
