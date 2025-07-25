'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon,
  RectangleStackIcon,
  StarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  DocumentTextIcon,
  UserCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import LogoutModal from '@/components/LogoutModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { getProfilePictureUrl, handleImageError } from '@/utils/imageUtils';

interface AdminNavbarProps {
  activePage?: string;
  userName?: string;
  onMenuToggle?: () => void;
}

export default function AdminNavbar({ activePage: propActivePage, userName = 'Admin', onMenuToggle: _onMenuToggle }: AdminNavbarProps) {
  const pathname = usePathname();
  const _router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [_isNavigating, setIsNavigating] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    // Initialize immediately from session storage
    if (typeof window !== 'undefined') {
      const adminData = sessionStorage.getItem('admin_data');
      if (adminData) {
        try {
          const admin = JSON.parse(adminData);
          return admin.profile_picture || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Function to update profile picture from session storage or API
  const updateProfilePictureFromStorage = async () => {
    const adminData = sessionStorage.getItem('admin_data');
    if (adminData) {
      try {
        const admin = JSON.parse(adminData);
        if (admin.profile_picture) {
          setProfilePicture(admin.profile_picture);
          return;
        }
      } catch (error) {
        console.error('Failed to parse admin data:', error);
      }
    }

    // If no profile picture in cache, fetch from API
    try {
      const response = await fetch('/api/admin/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile?.profile_picture) {
          setProfilePicture(data.profile.profile_picture);

          // Update session storage with the profile picture
          if (adminData) {
            try {
              const admin = JSON.parse(adminData);
              admin.profile_picture = data.profile.profile_picture;
              sessionStorage.setItem('admin_data', JSON.stringify(admin));
            } catch (error) {
              console.error('Failed to update admin data cache:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin profile picture:', error);
    }
  };

  // Initial profile picture fetch
  useEffect(() => {
    updateProfilePictureFromStorage();
  }, []);

  // Listen for profile picture updates from other components
  useEffect(() => {
    const handleProfilePictureUpdate = () => {
      updateProfilePictureFromStorage();
    };

    // Listen for custom event when profile picture is updated
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);

  // Open logout modal
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutModal(true);
  };

  // Handle navigation item click
  const handleNavItemClick = (_id: string) => {
    setIsNavigating(true);
    setIsDropdownOpen(false);
    // Don't set active page here, let the useEffect handle it after navigation
  };

  // Navigation items for mobile menu
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
    },
    {
      name: 'Activity Monitor',
      href: '/admin/logs',
      icon: DocumentTextIcon,
      id: 'logs'
    },
    {
      name: 'Profile',
      href: '/admin/profile',
      icon: UserCircleIcon,
      id: 'profile'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: CogIcon,
      id: 'settings'
    }
  ];

  const userManagementItems = [
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
  ];

  // Close dropdowns when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Don't close if clicking on notification bell or its dropdown
      if (target.closest('[data-notification-bell]')) {
        return;
      }

      // Only close the user dropdown when it's open
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
      // Close mobile menu when clicking outside
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    // Add event listener only when user dropdown or mobile menu is open
    if (isDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen, isMobileMenuOpen]);

  // Determine active page based on pathname or prop
  useEffect(() => {
    if (propActivePage) {
      setActivePage(propActivePage);
      setIsNavigating(false);
    } else {
      if (pathname === '/admin/dashboard') {
        setActivePage('dashboard');
      } else if (pathname === '/admin/applications') {
        setActivePage('applications');
      } else if (pathname === '/admin/services') {
        setActivePage('services');
      } else if (pathname.includes('/admin/users')) {
        setActivePage('users');
      }
      setIsNavigating(false);
    }
  }, [pathname, propActivePage]);

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] fixed top-0 left-0 lg:left-64 right-0 z-50 w-full lg:w-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="lg:hidden text-white p-2 rounded-lg hover:bg-white/20 transition-colors duration-300 mr-2"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            <h1 className="text-white text-lg md:text-xl font-semibold ml-2">Administrator Dashboard</h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Notification Bell - visible on all screen sizes */}
            <div data-notification-bell>
              <NotificationBell />
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsMobileMenuOpen(false); // Close mobile menu when user dropdown opens
                }}
                className="flex items-center space-x-1 md:space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-2 py-1 md:px-4 md:py-2 hover:bg-white/20 transition-all duration-300"
              >
                <div className="bg-white rounded-full h-6 w-6 md:h-8 md:w-8 flex items-center justify-center mr-1 md:mr-2 overflow-hidden">
                  {profilePicture ? (
                    <Image
                      src={getProfilePictureUrl(profilePicture)}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        handleImageError(e, '/bg_4.png');
                        // Also clear the profile picture state to show UserIcon
                        setProfilePicture(null);
                      }}
                    />
                  ) : (
                    <UserIcon className="h-3 w-3 md:h-5 md:w-5 text-[var(--primary-green)]" />
                  )}
                </div>
                <span className="modern-text font-medium tracking-wide text-xs md:text-sm hidden sm:block">{userName}</span>
                <ChevronDownIcon className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    href="/admin/dashboard"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={() => handleNavItemClick('dashboard')}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/profile"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => handleNavItemClick('profile')}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => handleNavItemClick('settings')}
                  >
                    <span>Settings</span>
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

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile menu */}
          <div className="lg:hidden bg-[var(--primary-green)] border-t border-white/20 relative z-50 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {/* Main navigation items */}
              {navigationItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${
                      isActive ? 'bg-white/20 font-medium' : ''
                    }`}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className="h-6 w-6 mr-4" />
                    <span className="modern-text text-base">{item.name}</span>
                  </Link>
                );
              })}

              {/* User Management Section */}
              <div className="border-t border-white/20 my-3"></div>
              <div className="px-3 py-2">
                <span className="text-white text-sm font-medium opacity-75">User Management</span>
              </div>

              {userManagementItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${
                      isActive ? 'bg-white/20 font-medium' : ''
                    }`}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className="h-6 w-6 mr-4" />
                    <span className="modern-text text-base">{item.name}</span>
                  </Link>
                );
              })}

              {/* Divider */}
              <div className="border-t border-white/20 my-3"></div>

              {/* Profile actions for mobile */}
              <Link
                href="/admin/profile"
                className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Profile</span>
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BellIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Settings</span>
              </Link>

              <button
                className="flex items-center w-full px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogoutClick();
                }}
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={userName}
      />
    </header>
  );
}
