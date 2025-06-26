'use client';

import React, { useState, useEffect } from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import withAdminAuth from '@/components/withAdminAuth';
import DashboardSkeleton from '@/components/ui/DashboardSkeleton';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  adminData?: any;
  skipSkeleton?: boolean;
}

/**
 * AdminDashboardLayout component that renders the admin dashboard
 * This component is protected by the withAdminAuth HOC which ensures only admins can access it
 */
function AdminDashboardLayout({
  children,
  activePage,
  userName = 'System Administrator',
  adminData,
  skipSkeleton = false
}: AdminDashboardLayoutProps) {
  // Use admin name from adminData if available
  const displayName = adminData?.full_name || adminData?.username || userName;

  // Content loading state for skeleton animation only
  const [contentLoading, setContentLoading] = useState(true);

  // Effect to simulate content loading with a short delay
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (adminData) {
      timer = setTimeout(() => {
        setContentLoading(false);
      }, 300);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [adminData]);

  // State for mobile sidebar visibility
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toggle mobile sidebar
  const _toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Render the admin dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar activePage={activePage} />
      <div className="lg:pl-64 transition-all duration-300"> {/* Responsive padding */}
        <AdminNavbar activePage={activePage} userName={displayName} />
        <main className="p-4 md:p-6">
          {contentLoading && !skipSkeleton ? (
            <DashboardSkeleton type="admin" />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

// Export the unwrapped component for use in components that are already wrapped with withAdminAuth
export { AdminDashboardLayout };

// Export the component wrapped with admin authentication as the default export
export default withAdminAuth(AdminDashboardLayout);