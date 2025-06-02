'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  SquaresPlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline';


interface CremationSidebarProps {
  activePage?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function CremationSidebar({
  activePage: propActivePage,
  isMobileOpen = false,
  onCloseMobile
}: CremationSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePage, setActivePage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(2024); // Default to prevent hydration mismatch

  // Navigation items
  const navigationItems = [
    {
      name: 'Overview',
      href: '/cremation/dashboard',
      icon: HomeIcon,
      id: 'dashboard'
    },
    {
      name: 'My Packages',
      href: '/cremation/packages',
      icon: SquaresPlusIcon,
      id: 'packages'
    },
    {
      name: 'Active Bookings',
      href: '/cremation/bookings',
      icon: CalendarIcon,
      id: 'bookings'
    },
    {
      name: 'Booking History',
      href: '/cremation/history',
      icon: ClockIcon,
      id: 'history'
    },
    {
      name: 'Reviews',
      href: '/cremation/reviews',
      icon: StarIcon,
      id: 'reviews'
    }
  ];

  // Account management items
  const accountItems = [
    {
      name: 'Profile',
      href: '/cremation/profile',
      icon: UserIcon,
      id: 'profile'
    },
    {
      name: 'Settings',
      href: '/cremation/settings',
      icon: Cog6ToothIcon,
      id: 'settings'
    }
  ];

  // Handle navigation item click
  const handleNavItemClick = (id: string) => {
    setIsNavigating(true);

    // Close mobile sidebar if applicable
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  // Set current year on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Determine active page based on pathname or prop
  useEffect(() => {
    if (propActivePage) {
      setActivePage(propActivePage);
      setIsNavigating(false);
    } else {
      const currentPath = pathname.split('/').pop() || '';

      if (currentPath === 'dashboard' || pathname === '/cremation') {
        setActivePage('dashboard');
      } else if (currentPath === 'packages' || pathname.includes('/cremation/packages')) {
        setActivePage('packages');
      } else if (currentPath === 'bookings' || pathname.includes('/cremation/bookings')) {
        setActivePage('bookings');
      } else if (currentPath === 'history') {
        setActivePage('history');
      } else if (currentPath === 'reviews') {
        setActivePage('reviews');
      } else if (currentPath === 'profile') {
        setActivePage('profile');
      } else if (currentPath === 'settings') {
        setActivePage('settings');
      }

      setIsNavigating(false);
    }
  }, [pathname, propActivePage]);

  // Determine sidebar classes based on mobile state
  const sidebarClasses = `h-screen w-64 bg-[var(--primary-green)] shadow-lg fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out ${
    isMobileOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'
  }`;

  return (
    <>
      <div className={sidebarClasses}>
        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden absolute top-4 right-4 text-white p-1 rounded-full hover:bg-white/20"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}

        {/* Logo and website name */}
        <div className="h-16 flex items-center px-6 border-b border-white/20">
          <Link href="/cremation/dashboard" className="flex items-center space-x-3">
            <Image src="/logo.png" alt="Rainbow Paws Logo" width={40} height={40} className="h-10 w-auto" />
            <span className="text-xl modern-heading text-white tracking-wide">RainbowPaws</span>
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm rounded-lg group transition-all duration-300 ${
                    isActive && !isNavigating
                      ? 'bg-white text-[var(--primary-green)]'
                      : 'text-white hover:bg-white/20'
                  }`}
                  onClick={() => handleNavItemClick(item.id)}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive && !isNavigating ? 'text-[var(--primary-green)]' : 'text-white group-hover:text-white'
                    }`}
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            {/* Account Management Items */}
            {accountItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm rounded-lg group transition-all duration-300 ${
                    isActive && !isNavigating
                      ? 'bg-white text-[var(--primary-green)]'
                      : 'text-white hover:bg-white/20'
                  }`}
                  onClick={() => handleNavItemClick(item.id)}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive && !isNavigating ? 'text-[var(--primary-green)]' : 'text-white group-hover:text-white'
                    }`}
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-full border-t border-white/20 p-4">
          <div className="text-xs text-white/80 text-center">
            © {currentYear} RainbowPaws<br />
            Cremation Provider Portal
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onCloseMobile}
        ></div>
      )}


    </>
  );
}