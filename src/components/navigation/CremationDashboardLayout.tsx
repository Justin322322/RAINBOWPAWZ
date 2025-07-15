'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';
import { HomeIcon, ArchiveBoxIcon, CalendarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import DashboardSkeleton from '@/components/ui/DashboardSkeleton';

interface CremationDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  userData?: any;
  skipSkeleton?: boolean;
}

export default function CremationDashboardLayout({
  children,
  activePage,
  userName: propUserName = 'Cremation Provider',
  userData: propUserData,
  skipSkeleton = false
}: CremationDashboardLayoutProps) {
  const _router = useRouter();

  // Since this component is wrapped by withBusinessVerification HOC,
  // we can trust that propUserData is valid and authenticated
  const userData = propUserData;

  // Content loading state for skeleton animation only
  const [contentLoading, setContentLoading] = useState(true);

  // Effect to simulate content loading with a short delay
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (userData) {
      timer = setTimeout(() => {
        setContentLoading(false);
      }, 300);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [userData]);

  // Get display name from user data - prioritize user's actual name over business name
  const displayName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ''}`.trim()
    : userData?.business_name || propUserName;

  // Render the cremation dashboard with admin-like structure
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar activePage={activePage} />
      <div className="lg:pl-64 transition-all duration-300"> {/* Responsive padding like admin */}
        <CremationNavbar
          activePage={activePage}
          userName={displayName}
        />
        <main className="pt-20 md:pt-24 p-4 md:p-6"> {/* Add top padding for fixed header + match admin padding */}
          {contentLoading && !skipSkeleton ? (
            <DashboardSkeleton type="cremation" />
          ) : (
            children
          )}
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
