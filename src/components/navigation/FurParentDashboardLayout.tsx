'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import FurParentNavbar from './FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';
import DashboardSkeleton from '../ui/DashboardSkeleton';

interface FurParentDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  userData?: any;
}

function FurParentDashboardLayout({
  children,
  activePage: propActivePage,
  userName = 'Pet Parent',
  userData
}: FurParentDashboardLayoutProps) {
  const pathname = usePathname();
  const [activePage, setActivePage] = useState('');

  // Use user name from userData if available
  const displayName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ''}`
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

      {/* Main Content */}
      <main>
        {/* Clone children and pass userData to them */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            console.log('🔍 [Layout] Passing userData to child, address:', userData?.address);
            return React.cloneElement(child, { userData } as any);
          }
          return child;
        })}
      </main>
    </div>
  );
}

// Export the component wrapped with OTP verification
export default withOTPVerification(FurParentDashboardLayout);
