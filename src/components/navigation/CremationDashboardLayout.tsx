'use client';

import React from 'react';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';

interface CremationDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
}

export default function CremationDashboardLayout({
  children,
  activePage,
  userName = 'Cremation Provider'
}: CremationDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar activePage={activePage} />
      <div className="pl-64"> {/* This padding should match the width of the sidebar */}
        <CremationNavbar activePage={activePage} userName={userName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 