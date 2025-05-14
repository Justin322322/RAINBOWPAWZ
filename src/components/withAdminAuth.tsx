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
          console.log('withAdminAuth: Checking admin authentication');
          const cookies = document.cookie.split(';');
          const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
          if (!authCookie) {
            console.log('withAdminAuth: No auth_token cookie found');
            router.replace('/'); return;
          }

          const cookieParts = authCookie.split('=');
          if (cookieParts.length !== 2) {
            console.log('withAdminAuth: Invalid auth_token cookie format');
            router.replace('/'); return;
          }

          let authValue;
          try {
            authValue = decodeURIComponent(cookieParts[1]);
          } catch (e) {
            authValue = cookieParts[1];
          }

          console.log('withAdminAuth: Auth token value:', authValue);
          const tokenParts = authValue.split('_');

          if (tokenParts.length !== 2) {
            console.log('withAdminAuth: Invalid token format, missing underscore separator');
            router.replace('/'); return;
          }

          const [userId, accountType] = tokenParts;

          if (!userId || !accountType) {
            console.log('withAdminAuth: Missing userId or accountType in token');
            router.replace('/'); return;
          }

          if (accountType !== 'admin') {
            console.log('withAdminAuth: Not an admin account, accountType:', accountType);
            router.replace('/'); return;
          }

          try {
            console.log('withAdminAuth: Fetching admin data for userId:', userId);
            const response = await fetch(`/api/admins/${userId}`);

            if (!response.ok) {
              console.log('withAdminAuth: Failed to fetch admin data, status:', response.status);

              // Try to get the error message
              try {
                const errorData = await response.json();
                console.log('withAdminAuth: Error response:', errorData);
              } catch (parseError) {
                console.log('withAdminAuth: Could not parse error response');
              }

              router.replace('/');
              return;
            }

            const fetchedAdminData = await response.json();
            console.log('withAdminAuth: Received admin data:', fetchedAdminData);

            if (!fetchedAdminData.user_type || fetchedAdminData.user_type !== 'admin') {
              console.log('withAdminAuth: Invalid admin data, missing or incorrect user_type');
              router.replace('/');
              return;
            }

            setRetrievedAdminData(fetchedAdminData);
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_data', JSON.stringify(fetchedAdminData));
            globalAdminAuthState = { verified: true, adminData: fetchedAdminData };
            console.log('withAdminAuth: Admin authentication successful');
          } catch (fetchError) {
            console.error('withAdminAuth: Error fetching admin data:', fetchError);
            router.replace('/');
          }
        } catch (error) {
          console.error('withAdminAuth: Authentication error:', error);
          router.replace('/');
        }
      };
      checkAuth();
    }, [router, retrievedAdminData, isAuthenticated]); // Added dependencies

    if (!isAuthenticated || !retrievedAdminData) {
      return null; // Or loading indicator
    }

    return <WrappedComponent {...(props as P_Original)} adminData={retrievedAdminData} />;
  };
  return WithAdminAuthComponent;
};

export default withAdminAuth;
