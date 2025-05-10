'use client';

import React from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
}

export default function AdminDashboardLayout({
  children,
  activePage,
  userName = 'System Administrator'
}: AdminDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar activePage={activePage} />
      <div className="pl-64"> {/* This padding should match the width of the sidebar */}
        <AdminNavbar activePage={activePage} userName={userName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 