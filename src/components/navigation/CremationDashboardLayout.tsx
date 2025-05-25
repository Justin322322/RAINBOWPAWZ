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

  // Function to create a dummy user with all required properties
  const createDummyUser = () => {
    return {
      id: 999,
      user_id: 999,
      business_id: 999,
      business_name: 'Emergency Access Cremation Center',
      first_name: 'Emergency',
      last_name: 'Access',
      email: 'emergency@example.com',
      role: 'business',
      user_type: 'business',
      is_verified: 1,
      is_otp_verified: 1,
      service_provider: {
        provider_id: 999,
        application_status: 'approved',
        business_permit_path: 'dummy_path',
        government_id_path: 'dummy_path',
        bir_certificate_path: 'dummy_path'
      }
    };
  };

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

  // Initialize with provided user data
  useEffect(() => {
    if (propUserData) {
      setUserData(propUserData);
      setIsAuthenticated(true);
      setIsLoading(false);

      // Store the user's name in localStorage for persistence across page loads
      const fullName = `${propUserData.first_name} ${propUserData.last_name}`;
      localStorage.setItem('cremation_user_name', fullName);
      sessionStorage.setItem('user_full_name', fullName);
    }
  }, [propUserData]);

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

  // Only render dashboard if authenticated and has user data
  if (!isAuthenticated || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-green)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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