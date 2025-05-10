'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';

interface CremationDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
}

export default function CremationDashboardLayout({
  children,
  activePage,
  userName = 'Cremation Provider'
}: CremationDashboardLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

        if (!authCookie) {
          console.log('No auth cookie found, redirecting to home');
          router.push('/');
          return false;
        }

        // Extract user ID and account type from auth token
        const authValue = authCookie.split('=')[1];
        const [userId, accountType] = authValue.split('_');

        // Validate account type
        if (accountType !== 'business') {
          console.log('Invalid account type for cremation dashboard:', accountType);
          router.push('/');
          return false;
        }

        // Fetch user data to verify it exists in the database
        try {
          const response = await fetch(`/api/users/${userId}`);

          if (!response.ok) {
            console.error('Failed to fetch user data:', await response.text());
            router.push('/');
            return false;
          }

          const userData = await response.json();
          console.log('Cremation user data fetched:', userData);

          // Additional validation if needed
          if (userData.user_type !== 'business') {
            console.log('User is not a business account:', userData.user_type);
            router.push('/');
            return false;
          }

          // Check if business is verified
          if (userData.is_verified !== 1) {
            console.log('Business account is not verified:', userData.id);
            router.push('/cremation/pending-verification');
            return false;
          }

          setUserData(userData);
          return true;
        } catch (fetchError) {
          console.error('Error fetching user data:', fetchError);
          router.push('/');
          return false;
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/');
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth().then(isAuth => {
      setIsAuthenticated(isAuth);
    });
  }, [router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
          <h1 className="text-2xl font-medium text-[var(--primary-green)] mt-4 mb-2">Verifying Access</h1>
          <p className="text-gray-500">Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  // Will be redirected by the useEffect if not authenticated
  if (!isAuthenticated || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-500">You do not have permission to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-opacity-90"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render the dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar activePage={activePage} />
      <div className="pl-64"> {/* This padding should match the width of the sidebar */}
        <CremationNavbar activePage={activePage} userName={userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : userName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}