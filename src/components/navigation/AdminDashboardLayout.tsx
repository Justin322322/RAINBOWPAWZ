'use client';

import React from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import withAdminAuth from '@/components/withAdminAuth';

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

  // Render the admin dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar activePage={activePage} />
      <div className="pl-64"> {/* This padding should match the width of the sidebar */}
        <AdminNavbar activePage={activePage} userName={displayName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Export the component wrapped with admin authentication
export default withAdminAuth(AdminDashboardLayout);