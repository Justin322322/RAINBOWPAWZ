'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

// Define the shape of the admin data
interface AdminData {
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

// Function to clear global admin auth state (for logout)
export const clearGlobalAdminAuthState = () => {
  globalAdminAuthState = {
    verified: false,
    adminData: null,
  };
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
        } catch {
          sessionStorage.removeItem('admin_data');
        }
      }

      const checkAuth = async () => {
        try {
          // Use the same secure API approach as cremation auth
          const response = await fetch('/api/auth/check', {
            method: 'GET',
            credentials: 'include', // Include httpOnly cookies
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
          });

          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              router.replace('/');
              return;
            }
            throw new Error('Auth check failed');
          }

          const result = await response.json();

          if (!result.authenticated || result.accountType !== 'admin') {
            router.replace('/');
            return;
          }

          // Now fetch admin data using the verified user ID
          if (result.userId) {
            await fetchAdminData(result.userId);
            return;
          }

          // If we get here, no valid auth token was found
          router.replace('/');
        } catch {
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
              const _errorData = await response.json();
            } catch {
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
        } catch {
          router.replace('/');
        }
      };
      checkAuth();
    }, [router, retrievedAdminData, isAuthenticated]); // Added dependencies

    if (!isAuthenticated || !retrievedAdminData) {
      return <AuthLoadingScreen />;
    }

    // Pass props directly without processing
    return <WrappedComponent {...props} adminData={retrievedAdminData} />;
  };
  return WithAdminAuthComponent;
};

export default withAdminAuth;
