'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  RectangleStackIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  EnvelopeIcon,
  StarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  activePage?: string;
}

export default function AdminSidebar({ activePage: propActivePage }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePage, setActivePage] = useState('');
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  // Navigation items
  const navigationItems = [
    {
      name: 'Overview',
      href: '/admin/dashboard',
      icon: HomeIcon,
      id: 'dashboard'
    },
    {
      name: 'Application Requests',
      href: '/admin/applications',
      icon: ClipboardDocumentCheckIcon,
      id: 'applications'
    },
    {
      name: 'Active Services',
      href: '/admin/services',
      icon: RectangleStackIcon,
      id: 'services'
    },
    {
      name: 'Reviews',
      href: '/admin/reviews',
      icon: StarIcon,
      id: 'reviews'
    },
    {
      name: 'Refunds',
      href: '/admin/refunds',
      icon: CurrencyDollarIcon,
      id: 'refunds'
    }
  ];

  // User management subsections
  const userManagementItems = useMemo(() => [
    {
      name: 'Cremation Centers',
      href: '/admin/users/cremation',
      icon: UserIcon,
      id: 'cremation'
    },
    {
      name: 'Fur Parents',
      href: '/admin/users/furparents',
      icon: UsersIcon,
      id: 'furparents'
    }
  ], []);

  // Set current year on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Determine active page based on pathname or prop
  useEffect(() => {
    if (propActivePage) {
      setActivePage(propActivePage);

      // If the active page is a user management item, ensure the dropdown stays open
      if (userManagementItems.some(item => item.id === propActivePage)) {
        setUserManagementOpen(true);
      }

      setIsNavigating(false);
    } else {
      const currentPath = pathname.split('/').pop() || '';

      if (currentPath === 'dashboard' || pathname === '/admin') {
        setActivePage('dashboard');
      } else if (currentPath === 'applications') {
        setActivePage('applications');
      } else if (currentPath === 'services') {
        setActivePage('services');
      } else if (currentPath === 'reviews') {
        setActivePage('reviews');
      } else if (currentPath === 'refunds') {
        setActivePage('refunds');
      } else if (pathname.includes('/admin/users')) {
        // Always set user management open when on any user management page
        setUserManagementOpen(true);

        if (currentPath === 'cremation') {
          setActivePage('cremation');
        } else if (currentPath === 'furparents') {
          setActivePage('furparents');
        }
      }

      setIsNavigating(false);
    }
  }, [pathname, propActivePage, userManagementItems]);

  // Function to handle navigation item clicks
  const handleNavItemClick = (id: string) => {
    setIsNavigating(true);

    // Don't close the dropdown if clicking on a user management item
    if (!userManagementItems.some(item => item.id === id)) {
      setUserManagementOpen(false);
    }
  };

  // Function to toggle user management dropdown
  const toggleUserManagement = () => {
    setUserManagementOpen(!userManagementOpen);
  };

  return (
    <div className="h-screen w-64 bg-[var(--primary-green)] shadow-lg fixed left-0 top-0 z-40">
      {/* Logo and website name */}
      <div className="h-16 flex items-center px-6 border-b border-white/20">
        <Link href="/admin/dashboard" className="flex items-center space-x-3">
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

          {/* User Management Section */}
          <div>
            <button
              onClick={toggleUserManagement}
              className={`w-full flex items-center px-4 py-3 text-sm rounded-lg group transition-all duration-300 ${
                userManagementItems.some(item => activePage === item.id) && !isNavigating
                  ? 'bg-white text-[var(--primary-green)]'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <UserGroupIcon
                className={`mr-3 h-5 w-5 ${
                  userManagementItems.some(item => activePage === item.id) && !isNavigating
                    ? 'text-[var(--primary-green)]'
                    : 'text-white group-hover:text-white'
                }`}
              />
              <span className="font-medium">User Management</span>
              <svg
                className={`ml-auto h-5 w-5 transform transition-transform duration-200 ${
                  userManagementOpen ? 'rotate-90' : ''
                } ${
                  userManagementItems.some(item => activePage === item.id) && !isNavigating
                    ? 'text-[var(--primary-green)]'
                    : 'text-white'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* User Management Subsections */}
            {userManagementOpen && (
              <div className="pl-4 mt-1 space-y-1">
                {userManagementItems.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm rounded-lg group transition-all duration-300 ${
                        isActive && !isNavigating
                          ? 'bg-white/90 text-[var(--primary-green)]'
                          : 'text-white hover:bg-white/10'
                      }`}
                      onClick={() => handleNavItemClick(item.id)}
                    >
                      <item.icon
                        className={`mr-3 h-4 w-4 ${
                          isActive && !isNavigating ? 'text-[var(--primary-green)]' : 'text-white group-hover:text-white'
                        }`}
                      />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full border-t border-white/20 p-4">
        <div className="text-xs text-white/80 text-center">
          © {currentYear || '2024'} RainbowPaws<br />
          Administrator Portal
        </div>
      </div>
    </div>
  );
}