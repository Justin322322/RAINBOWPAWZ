'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  SquaresPlusIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import LogoutModal from '@/components/LogoutModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { useSupressHydrationWarning } from '@/hooks/useSupressHydrationWarning';
import { getProfilePictureUrl, handleImageError } from '@/utils/imageUtils';

interface CremationNavbarProps {
  activePage?: string;
  userName?: string;
  _onMenuToggle?: () => void;
}

export default function CremationNavbar({
  activePage: propActivePage,
  userName: propUserName = 'Cremation Provider',
  _onMenuToggle
}: CremationNavbarProps) {
  const pathname = usePathname();
  const _router = useRouter();
  const isMounted = useSupressHydrationWarning();

  // Navigation and UI state - moved to top
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Always initialize with the default value for server-side rendering to avoid hydration mismatch
  const [userName, setUserName] = useState('Cremation Provider');

  // Initialize profile picture from cache immediately (client-side only)
  const getInitialProfilePicture = () => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return null;

    try {
      // Check business verification cache first
      const businessCache = sessionStorage.getItem('business_verification_cache');
      if (businessCache) {
        const cache = JSON.parse(businessCache);
        if (cache.userData?.profile_picture) {
          return cache.userData.profile_picture;
        }
      }

      // Fallback to legacy user data cache
      const userData = sessionStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.profile_picture) {
          return user.profile_picture;
        }
      }
    } catch (error) {
      console.error('Error reading cached profile picture:', error);
    }

    return null;
  };

  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Load cached profile picture immediately on mount (before hydration check)
  useEffect(() => {
    const cachedProfilePicture = getInitialProfilePicture();
    if (cachedProfilePicture) {
      setProfilePicture(cachedProfilePicture);
    }
  }, []);

  // Function to get profile picture from cache or API
  const fetchProfilePicture = useCallback(async () => {
    // Prevent profile picture updates during navigation to reduce flickering
    if (isNavigating) {
      return;
    }

    try {
      // First, try to get profile picture from cached business verification data
      const businessCache = sessionStorage.getItem('business_verification_cache');
      if (businessCache) {
        const cache = JSON.parse(businessCache);
        if (cache.userData?.profile_picture) {
          setProfilePicture(cache.userData.profile_picture);
          return; // Use cached data, no need for API call
        }
      }

      // Fallback: check legacy user data cache
      const userData = sessionStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.profile_picture) {
          setProfilePicture(user.profile_picture);
          return; // Use cached data, no need for API call
        }
      }

      // Only make API call if no cached profile picture found and not navigating
      if (!isNavigating) {
        const response = await fetch('/api/cremation/profile', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Fix: API returns profile_picture, not profilePicturePath
          const profilePicture = data.profile?.profile_picture || data.profile?.profilePicturePath;
          if (profilePicture && !isNavigating) {
            setProfilePicture(profilePicture);

            // Update both caches with the fetched profile picture
            if (businessCache) {
              const cache = JSON.parse(businessCache);
              if (cache.userData) {
                cache.userData.profile_picture = profilePicture;
                sessionStorage.setItem('business_verification_cache', JSON.stringify(cache));
              }
            }

            // Also update user data cache
            const userDataCache = sessionStorage.getItem('user_data');
            if (userDataCache) {
              const user = JSON.parse(userDataCache);
              user.profile_picture = profilePicture;
              sessionStorage.setItem('user_data', JSON.stringify(user));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile picture:', error);
    }
  }, [isNavigating]);

  // Use useEffect to update the username on the client side only after hydration
  useEffect(() => {
    if (isMounted) {
      // Get stored username from multiple sources in order of preference
      const sessionUserName = sessionStorage.getItem('user_full_name');
      const localUserName = localStorage.getItem('cremation_user_name');

      // Use the best available name source (session > local > prop)
      const bestUserName = sessionUserName || localUserName || propUserName;
      setUserName(bestUserName);

      // Load profile picture from cache immediately, then fetch if needed
      const cachedProfilePicture = getInitialProfilePicture();
      if (cachedProfilePicture) {
        setProfilePicture(cachedProfilePicture);
        // Still try to fetch fresh data in background to ensure consistency after server restart
        fetchProfilePicture();
      } else {
        // Fetch from API if no cached profile picture
        fetchProfilePicture();
      }
    }
  }, [propUserName, isMounted, fetchProfilePicture]);

  // Listen for profile picture updates
  useEffect(() => {
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      // Prevent profile picture updates during navigation to reduce flickering
      if (isNavigating) {
        return;
      }

      if (event.detail?.profilePicturePath) {
        setProfilePicture(event.detail.profilePicturePath);

        // Also update caches immediately
        try {
          const businessCache = sessionStorage.getItem('business_verification_cache');
          if (businessCache) {
            const cache = JSON.parse(businessCache);
            if (cache.userData) {
              cache.userData.profile_picture = event.detail.profilePicturePath;
              sessionStorage.setItem('business_verification_cache', JSON.stringify(cache));
            }
          }

          const userData = sessionStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            user.profile_picture = event.detail.profilePicturePath;
            sessionStorage.setItem('user_data', JSON.stringify(user));
          }
        } catch (error) {
          console.error('Error updating caches:', error);
        }
      } else {
        // Refetch from API if no path provided (but only if not navigating)
        if (!isNavigating) {
          fetchProfilePicture();
        }
      }
    };

    // Listen for custom event when profile picture is updated
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    };
  }, [fetchProfilePicture, isNavigating]);

  // Handle navigation item click
  const handleNavItemClick = (_id: string) => {
    setIsNavigating(true);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Open logout modal
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
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
      if (pathname === '/cremation/dashboard') {
        setActivePage('dashboard');
      } else if (pathname === '/cremation/packages') {
        setActivePage('packages');
      } else if (pathname === '/cremation/bookings') {
        setActivePage('bookings');
      } else if (pathname === '/cremation/history') {
        setActivePage('history');
      } else if (pathname.includes('/cremation/reviews')) {
        setActivePage('reviews');
      } else if (pathname.includes('/cremation/profile')) {
        setActivePage('profile');
      } else if (pathname.includes('/cremation/settings')) {
        setActivePage('settings');
      }
      setIsNavigating(false);
    }
  }, [pathname, propActivePage]);

  // Navigation items for mobile menu
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

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] relative z-50 w-full">
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

            <h1 className="text-white text-lg md:text-xl font-semibold ml-2">Cremation Center Dashboard</h1>
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
                <span className="modern-text font-medium tracking-wide text-xs md:text-sm hidden sm:block">
                  {isMounted ? userName : 'Cremation Provider'}
                </span>
                <ChevronDownIcon className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
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
                  <Link
                    href="/cremation/settings"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => handleNavItemClick('settings')}
                  >
                    Settings
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

              {/* Divider */}
              <div className="border-t border-white/20 my-3"></div>

              {/* Profile actions for mobile */}
              <Link
                href="/cremation/profile"
                className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Profile</span>
              </Link>

              <Link
                href="/cremation/settings"
                className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Cog6ToothIcon className="h-6 w-6 mr-4" />
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
        userName={isMounted ? userName : 'Cremation Provider'}
      />
    </header>
  );
}