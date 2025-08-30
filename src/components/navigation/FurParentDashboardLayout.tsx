'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import FurParentNavbar from './FurParentNavbar';
import withUserAuth, { UserData } from '@/components/withUserAuth';

interface FurParentDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  userData?: UserData;
}

function FurParentDashboardLayout({
  children,
  activePage: propActivePage,
  userName = 'Pet Parent',
  userData
}: FurParentDashboardLayoutProps & { userData: UserData }) {
  const pathname = usePathname();
  const [activePage, setActivePage] = useState('');
  const [currentUserData, setCurrentUserData] = useState<UserData | undefined>(userData);

  // Listen for user data updates
  useEffect(() => {
    const handleUserDataUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setCurrentUserData(event.detail);
      }
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, []);

  // Update current user data when prop changes
  useEffect(() => {
    console.log('🔄 [Layout] User data prop changed:', userData);
    setCurrentUserData(userData);
  }, [userData]);

  // Use user name from current userData if available
  const displayName = currentUserData?.first_name
    ? `${currentUserData.first_name} ${currentUserData.last_name || ''}`
    : userName;

  // Determine active page based on pathname or prop
  useEffect(() => {
    if (propActivePage) {
      setActivePage(propActivePage);
    } else {
      if (pathname === '/user/furparent_dashboard') {
        setActivePage('home');
      } else if (pathname === '/user/furparent_dashboard/services' || pathname.startsWith('/user/furparent_dashboard/services/')) {
        setActivePage('services');
      } else if (pathname === '/user/furparent_dashboard/bookings' || pathname.startsWith('/user/furparent_dashboard/bookings/')) {
        setActivePage('bookings');
      } else if (pathname === '/user/furparent_dashboard/settings') {
        setActivePage('settings');
      } else if (pathname === '/user/furparent_dashboard/profile') {
        setActivePage('profile');
      }
    }
  }, [pathname, propActivePage]);

  // Render the fur parent dashboard with persistent navbar
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Now persistent across all pages */}
      <FurParentNavbar activePage={activePage} userName={displayName} />

      {/* Main Content - Add top padding to account for fixed header */}
      <main className="pt-20 md:pt-24">
        {/* Clone children and pass currentUserData to them */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { userData: currentUserData } as any);
          }
          return child;
        })}
      </main>
    </div>
  );
}

// Export the component wrapped with user authentication
export default withUserAuth(FurParentDashboardLayout);
