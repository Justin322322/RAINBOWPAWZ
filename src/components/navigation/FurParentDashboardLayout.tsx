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

  // No content loading state needed

  // Render the fur parent dashboard
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage={activePage} userName={displayName} />

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

// Export the component wrapped with OTP verification
export default withOTPVerification(FurParentDashboardLayout);
