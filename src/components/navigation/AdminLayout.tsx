'use client';

import React from 'react';
import AdminDashboardLayout from './AdminDashboardLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

/**
 * AdminLayout component that wraps the AdminDashboardLayout
 * This is a simpler interface for pages that don't need to pass additional props
 */
function AdminLayout({ children, activePage }: AdminLayoutProps) {
  return (
    <AdminDashboardLayout activePage={activePage}>
      {children}
    </AdminDashboardLayout>
  );
}

export default AdminLayout;
