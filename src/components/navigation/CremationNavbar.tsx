'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { clearAuthToken } from '@/utils/auth';
import LogoutModal from '@/components/LogoutModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { useSupressHydrationWarning } from '@/hooks/useSupressHydrationWarning';

interface CremationNavbarProps {
  activePage?: string;
  userName?: string;
  onMenuToggle?: () => void;
}

export default function CremationNavbar({
  activePage: propActivePage,
  userName: propUserName = 'Cremation Provider',
  onMenuToggle
}: CremationNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMounted = useSupressHydrationWarning();

  // Always initialize with the default value for server-side rendering to avoid hydration mismatch
  const [userName, setUserName] = useState('Cremation Provider');

  // Use useEffect to update the username on the client side only after hydration
  useEffect(() => {
    if (isMounted) {
      // Get stored username from multiple sources in order of preference
      const sessionUserName = sessionStorage.getItem('user_full_name');
      const localUserName = localStorage.getItem('cremation_user_name');

      // Use the best available name source (session > local > prop)
      const bestUserName = sessionUserName || localUserName || propUserName;
      setUserName(bestUserName);
    }
  }, [propUserName, isMounted]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Handle navigation item click
  const handleNavItemClick = (id: string) => {
    setIsNavigating(true);
    setIsDropdownOpen(false);
    // Don't set active page here, let the useEffect handle it after navigation
  };

  // Open logout modal
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutModal(true);
  };

  // Update localStorage and sessionStorage when propUserName changes and it's a real name
  useEffect(() => {
    // Only update storage if the prop is a real name and not a default placeholder
    if (propUserName &&
        propUserName !== 'Cremation Provider' &&
        propUserName !== 'Business' &&
        propUserName.includes(' ')) { // Real names typically have a space

      // Store in both storage types for persistence
      localStorage.setItem('cremation_user_name', propUserName);
      sessionStorage.setItem('user_full_name', propUserName);
    }
  }, [propUserName]);

  // Determine active page based on pathname or prop
  useEffect(() => {
    if (propActivePage) {
      setActivePage(propActivePage);
      setIsNavigating(false);
    } else {
      if (pathname === '/cremation/dashboard') {
        setActivePage('dashboard');
      } else if (pathname === '/cremation/packages') {
        setActivePage('packages');
      } else if (pathname === '/cremation/bookings') {
        setActivePage('bookings');
      } else if (pathname === '/cremation/history') {
        setActivePage('history');
      } else if (pathname.includes('/cremation/profile')) {
        setActivePage('profile');
      } else if (pathname.includes('/cremation/settings')) {
        setActivePage('settings');
      } else if (pathname.includes('/cremation/reports')) {
        const reportType = pathname.split('/').pop();
        if (reportType === 'monthly') {
          setActivePage('monthly-reports');
        } else if (reportType === 'services') {
          setActivePage('service-reports');
        }
      }
      setIsNavigating(false);
    }
  }, [pathname, propActivePage]);

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] relative z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden text-white p-2 rounded-md hover:bg-white/20 transition-colors duration-300"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            )}
            <h1 className="text-white text-xl font-semibold ml-2 hidden md:block">Cremation Center Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <div className="bg-white rounded-full h-8 w-8 flex items-center justify-center mr-2">
                  <UserIcon className="h-5 w-5 text-[var(--primary-green)]" />
                </div>
                {/* Only show the actual username after client-side hydration */}
                <span className="modern-text font-medium tracking-wide">
                  {isMounted ? userName : 'Cremation Provider'}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 ml-2 transform transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    href="/cremation/dashboard"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={() => handleNavItemClick('dashboard')}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/cremation/profile"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => handleNavItemClick('profile')}
                  >
                    Profile
                  </Link>
                  <div className="border-t border-gray-100"></div>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={handleLogoutClick}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={isMounted ? userName : 'Cremation Provider'}
      />
    </header>
  );
}