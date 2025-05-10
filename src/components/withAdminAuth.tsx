'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';

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

// HOC to wrap components that require admin authentication
const withAdminAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithAdminAuth: React.FC<P> = (props) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(globalAdminAuthState.verified);
    const [adminData, setAdminData] = useState<AdminData | null>(globalAdminAuthState.adminData);

    useEffect(() => {
      // If already verified globally, we can skip the check
      if (globalAdminAuthState.verified && globalAdminAuthState.adminData) {
        return;
      }

      // Fast check first to prevent flashing
      const fastCheck = fastAuthCheck();
      if (fastCheck.authenticated && fastCheck.accountType === 'admin' && fastCheck.adminData) {
        setAdminData(fastCheck.adminData);
        setIsAuthenticated(true);
        globalAdminAuthState = {
          verified: true,
          adminData: fastCheck.adminData
        };
        return;
      }

      // Check if we already have admin data in session storage
      const cachedAdminData = sessionStorage.getItem('admin_data');
      if (cachedAdminData) {
        try {
          const parsedData = JSON.parse(cachedAdminData);
          setAdminData(parsedData);
          setIsAuthenticated(true);
          globalAdminAuthState = {
            verified: true,
            adminData: parsedData
          };
          return;
        } catch (e) {
          // If parsing fails, continue with normal auth
          sessionStorage.removeItem('admin_data');
        }
      }

      // Check if user is authenticated and get admin data
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
          if (accountType !== 'admin') {
            router.replace('/');
            return;
          }

          // Fetch admin data to verify it exists in the database
          try {
            const response = await fetch(`/api/admins/${userId}`);

            if (!response.ok) {
              router.replace('/');
              return;
            }

            const adminData = await response.json();

            // Additional validation if needed
            if (!adminData.user_type || adminData.user_type !== 'admin') {
              router.replace('/');
              return;
            }

            // Set the admin data and store in session storage
            setAdminData(adminData);
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_data', JSON.stringify(adminData));
            
            // Update global state
            globalAdminAuthState = {
              verified: true,
              adminData: adminData
            };
            
          } catch (fetchError) {
            router.replace('/');
          }
        } catch (error) {
          router.replace('/');
        }
      };

      checkAuth();
    }, [router]);

    // Don't render anything while verifying - prevents flash
    if (!isAuthenticated || !adminData) {
      return null;
    }

    // Render the wrapped component with admin data
    return <Component {...props} adminData={adminData} />;
  };

  return WithAdminAuth;
};

export default withAdminAuth;
