'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';
import DashboardSkeleton from '@/components/ui/DashboardSkeleton';
import { HomeIcon, DocumentTextIcon, ArchiveBoxIcon, CalendarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface CremationDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  userData?: any;
}

export default function CremationDashboardLayout({
  children,
  activePage,
  userName: propUserName = 'Cremation Provider',
  userData: propUserData
}: CremationDashboardLayoutProps) {
  const router = useRouter();

  // Since this component is wrapped by withBusinessVerification HOC,
  // we can trust that propUserData is valid and authenticated
  const userData = propUserData;

  // State for mobile sidebar visibility
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Get display name from user data
  const displayName = userData?.business_name ||
    (userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : propUserName);

  // Render the dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar
        activePage={activePage}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="lg:pl-64 transition-all duration-300">
        <CremationNavbar
          activePage={activePage}
          userName={displayName}
          onMenuToggle={toggleMobileSidebar}
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

const navigationItems = [
  { name: 'Dashboard', href: '/cremation/dashboard', icon: HomeIcon },
  { name: 'Services', href: '/cremation/packages', icon: ArchiveBoxIcon },
  { name: 'Bookings', href: '/cremation/bookings', icon: CalendarIcon },
  { name: 'History', href: '/cremation/history', icon: ClockIcon },
  { name: 'Profile', href: '/cremation/profile', icon: UserCircleIcon }
];