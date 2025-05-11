'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import withAdminAuth from '@/components/withAdminAuth';
import DashboardSkeleton from '../ui/DashboardSkeleton';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  adminData?: any;
}

/**
 * AdminDashboardLayout component that renders the admin dashboard
 * This component is protected by the withAdminAuth HOC which ensures only admins can access it
 */
function AdminDashboardLayout({
  children,
  activePage,
  userName = 'System Administrator',
  adminData
}: AdminDashboardLayoutProps) {
  // Use admin name from adminData if available
  const displayName = adminData?.full_name || adminData?.username || userName;

  // State to track content loading
  const [contentLoading, setContentLoading] = useState(true);

  // Simulate content loading for a smoother experience
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Render the admin dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar activePage={activePage} />
      <div className="pl-64"> {/* This padding should match the width of the sidebar */}
        <AdminNavbar activePage={activePage} userName={displayName} />
        <main className="p-6">
          <AnimatePresence mode="wait">
            {contentLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DashboardSkeleton type="admin" />
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
    </div>
  );
}

// Export the component wrapped with admin authentication
export default withAdminAuth(AdminDashboardLayout);