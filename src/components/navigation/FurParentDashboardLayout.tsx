'use client';

import React, { useState, useEffect } from 'react';
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
  activePage,
  userName = 'Pet Parent',
  userData
}: FurParentDashboardLayoutProps) {
  // Use user name from userData if available
  const displayName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ''}`
    : userName;

  // State to track content loading
  const [contentLoading, setContentLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Simulate content loading for a smoother experience on initial load
  useEffect(() => {
    if (initialLoad) {
      const timer = setTimeout(() => {
        setContentLoading(false);
        setInitialLoad(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [initialLoad]);

  // Reset loading state when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setContentLoading(true);
      const timer = setTimeout(() => {
        setContentLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Render the fur parent dashboard
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage={activePage} userName={displayName} />

      {/* Main Content */}
      <main>
        <AnimatePresence mode="wait">
          {contentLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
            >
              <DashboardSkeleton type="furparent" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Export the component wrapped with OTP verification
export default withOTPVerification(FurParentDashboardLayout);
