'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';
import { HomeIcon, ArchiveBoxIcon, CalendarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';

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
  const _router = useRouter();

  // Since this component is wrapped by withBusinessVerification HOC,
  // we can trust that propUserData is valid and authenticated
  const userData = propUserData;

  // Content loading state for skeleton animation only
  const [_contentLoading, setContentLoading] = useState(false); // Set to false to disable layout skeleton

  // Effect to simulate content loading with a short delay
  useEffect(() => {
    // Disable the layout-level skeleton completely
    setContentLoading(false);
  }, [userData]);

  // Get display name from user data
  const displayName = userData?.business_name ||
    (userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : propUserName);

  // Render the cremation dashboard with admin-like structure
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar activePage={activePage} />
      <div className="lg:pl-64 transition-all duration-300"> {/* Responsive padding like admin */}
        <CremationNavbar
          activePage={activePage}
          userName={displayName}
        />
        <main className="p-4 md:p-6"> {/* Match admin padding */}
          {children}
        </main>
      </div>
    </div>
  );
}

const _navigationItems = [
  { name: 'Dashboard', href: '/cremation/dashboard', icon: HomeIcon },
  { name: 'Services', href: '/cremation/packages', icon: ArchiveBoxIcon },
  { name: 'Bookings', href: '/cremation/bookings', icon: CalendarIcon },
  { name: 'History', href: '/cremation/history', icon: ClockIcon },
  { name: 'Profile', href: '/cremation/profile', icon: UserCircleIcon }
];