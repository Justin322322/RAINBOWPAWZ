'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';
import DashboardSkeleton from '../ui/DashboardSkeleton';
import { HomeIcon, DocumentTextIcon, ArchiveBoxIcon, CalendarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface CremationDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  userData?: any;
}

export default function CremationDashboardLayout({
  children,
  activePage,
  userName: propUserName = 'Cremation Provider',
  userData: propUserData
}: CremationDashboardLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // State for mobile sidebar visibility
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Content loading state for skeleton animation only
  const [contentLoading, setContentLoading] = useState(true);

  // Get stored username from localStorage or use the prop
  const storedUserName = typeof window !== 'undefined' ? localStorage.getItem('cremation_user_name') : null;
  const [userName, setUserName] = useState(storedUserName || propUserName);

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Authentication check effect
  useEffect(() => {
    // Always force a fresh verification check on each render
    const doVerificationCheck = async () => {
      try {
        // If userData is provided via props, verify it directly
        // but always fetch fresh data to ensure we have the latest verification status
        const userId = propUserData?.id || getUserIdFromCookie();

        if (!userId) {
          router.push('/');
          return;
        }

        // Always fetch user data to get latest verification status
        try {
          const response = await fetch(`/api/users/${userId}?t=${Date.now()}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });

          if (!response.ok) {
            setShowAccessDenied(true);
            setIsLoading(false);
            return;
          }

          const userData = await response.json();

          // Verify user is a business account
          if (userData.role !== 'business' && userData.user_type !== 'business') {
            setShowAccessDenied(true);
            setIsLoading(false);
            return;
          }

          // Extract all possible status values
          const serviceProvider = userData.service_provider;

          if (!serviceProvider) {
            router.push('/cremation/pending-verification');
            return;
          }


          // ONLY check application_status - ignore other fields that might not exist
          const applicationStatus = serviceProvider.application_status ?
                                    String(serviceProvider.application_status).toLowerCase() : null;


          // DIRECTLY check if application_status === 'approved'
          if (applicationStatus === 'approved') {
            setUserData(userData);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }

          // If application_status is 'pending', redirect to verification page
          if (applicationStatus === 'pending') {
            router.push('/cremation/pending-verification');
            return;
          }

          // Check for documents as a fallback
          const hasDocuments = serviceProvider.business_permit_path ||
                              serviceProvider.government_id_path ||
                              serviceProvider.bir_certificate_path;

          if (!hasDocuments) {
            router.push('/cremation/pending-verification');
            return;
          }

          // If we get here and there's no specific status but they have documents, allow access
          if (hasDocuments && !applicationStatus) {
            setUserData(userData);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }

          // Any other case, redirect to pending verification
          router.push('/cremation/pending-verification');
        } catch (fetchError) {
          setShowAccessDenied(true);
          setIsLoading(false);
        }
      } catch (error) {
        setShowAccessDenied(true);
        setIsLoading(false);
      }
    };

    const getUserIdFromCookie = (): string | null => {
      try {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));

        if (!authCookie) return null;

        // Extract user ID and account type from auth token
        const cookieParts = authCookie.split('=');
        if (cookieParts.length !== 2) return null;

        let authValue;
        try {
          authValue = decodeURIComponent(cookieParts[1]);
        } catch (e) {
          authValue = cookieParts[1]; // Use raw value if decoding fails
        }

        const [userId, accountType] = authValue.split('_');

        // Validate account type
        if (accountType !== 'business') {
          return null;
        }

        return userId;
      } catch (e) {
        return null;
      }
    };

    doVerificationCheck();
  }, [router, propUserData]);

  // Effect to simulate content loading with a short delay
  useEffect(() => {
    if (isAuthenticated && userData) {
      // Match the admin dashboard delay for consistency
      const timer = setTimeout(() => {
        setContentLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userData]);

  // Effect to store the display name in localStorage when it changes
  useEffect(() => {
    if (userData?.first_name) {
      const displayName = userData.business_name ||
        `${userData.first_name} ${userData.last_name || ''}`;
      if (displayName && displayName !== 'Cremation Provider') {
        localStorage.setItem('cremation_user_name', displayName);
      }
    }
  }, [userData]);

  // Show skeleton during initial loading
  if (isLoading) {
    // Get the most up-to-date username from multiple sources in order of preference
    const sessionUserName = typeof window !== 'undefined' ? sessionStorage.getItem('user_full_name') : null;
    const localUserName = typeof window !== 'undefined' ? localStorage.getItem('cremation_user_name') : null;

    // Use the best available name source (session > local > state > default)
    const loadingDisplayName = sessionUserName || localUserName || userName;

    return (
      <div className="min-h-screen bg-gray-50">
        <CremationSidebar activePage={activePage} isMobileOpen={false} />
        <div className="lg:pl-64">
          <CremationNavbar
            activePage={activePage}
            userName={loadingDisplayName}
            onMenuToggle={toggleMobileSidebar}
          />
          <main className="p-6">
            <DashboardSkeleton type="cremation" />
          </main>
        </div>
      </div>
    );
  }

  if (showAccessDenied || !isAuthenticated || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-500">You do not have permission to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-opacity-90 transition-all duration-300"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Get the most up-to-date username from multiple sources in order of preference
  const sessionUserName = typeof window !== 'undefined' ? sessionStorage.getItem('user_full_name') : null;
  const localUserName = typeof window !== 'undefined' ? localStorage.getItem('cremation_user_name') : null;

  // Get display name from user data
  const userDataName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : null;

  // Use the best available name (prioritize in this order: userData > sessionStorage > localStorage > state > default)
  const bestDisplayName = userDataName || sessionUserName || localUserName || userName;

  // Render the dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar
        activePage={activePage}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="lg:pl-64 transition-all duration-300"> {/* This padding should match the width of the sidebar */}
        <CremationNavbar
          activePage={activePage}
          userName={bestDisplayName}
          onMenuToggle={toggleMobileSidebar}
        />
        <main className="p-6">
          {contentLoading ? (
            <DashboardSkeleton type="cremation" />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

const navigationItems = [
  { name: 'Dashboard', href: '/cremation/dashboard', icon: HomeIcon },
  { name: 'Services', href: '/cremation/packages', icon: ArchiveBoxIcon },
  { name: 'Bookings', href: '/cremation/bookings', icon: CalendarIcon },
  { name: 'History', href: '/cremation/history', icon: ClockIcon },
  { name: 'Profile', href: '/cremation/profile', icon: UserCircleIcon }
];