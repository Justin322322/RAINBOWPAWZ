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
  SquaresPlusIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { clearAuthToken } from '@/utils/auth';
import LogoutModal from '@/components/LogoutModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { getProfilePictureUrl, handleImageError } from '@/utils/imageUtils';

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

  // Navigation and UI state - moved to top
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Simplified state management to match admin navbar
  const [userName, setUserName] = useState(propUserName);
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    // Initialize immediately from storage like AdminNavbar does
    if (typeof window !== 'undefined') {
      // Priority 1: Check localStorage first for persistence
      try {
        const localProfilePicture = localStorage.getItem('cremation_profile_picture');
        if (localProfilePicture && localProfilePicture.trim() !== '') {
          return localProfilePicture;
        }
      } catch (error) {
        console.warn('Error accessing localStorage during initialization:', error);
      }

      // Priority 2: Check business verification cache
      try {
        const businessCache = sessionStorage.getItem('business_verification_cache');
        if (businessCache) {
          const cache = JSON.parse(businessCache);
          if (cache.userData?.profile_picture) {
            return cache.userData.profile_picture;
          }
        }
      } catch (error) {
        console.warn('Error accessing business cache during initialization:', error);
      }

      // Priority 3: Check legacy user data cache
      try {
        const userData = sessionStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.profile_picture) {
            return user.profile_picture;
          }
        }
      } catch (error) {
        console.warn('Error accessing user data during initialization:', error);
      }
    }
    return null;
  });



    // Enhanced profile picture loading from multiple storage sources
  const updateProfilePictureFromStorage = () => {
    if (typeof window === 'undefined') return;

    try {
      let foundProfilePicture: string | null = null;

      // Priority 1: Check localStorage first for persistence (most reliable)
      try {
        const localProfilePicture = localStorage.getItem('cremation_profile_picture');
        if (localProfilePicture && localProfilePicture.trim() !== '') {
          foundProfilePicture = localProfilePicture;
        }
      } catch (localStorageError) {
        console.warn('Error accessing localStorage:', localStorageError);
      }

      // Priority 2: Check business verification cache (most up-to-date when session is active)
      if (!foundProfilePicture) {
        try {
          const businessCache = sessionStorage.getItem('business_verification_cache');
          if (businessCache) {
            const cache = JSON.parse(businessCache);
            if (cache.userData?.profile_picture) {
              foundProfilePicture = cache.userData.profile_picture;
              // Update localStorage with this value for persistence
              if (foundProfilePicture) {
                try {
                  localStorage.setItem('cremation_profile_picture', foundProfilePicture);
                } catch (localStorageError) {
                  console.warn('Error updating localStorage:', localStorageError);
                }
              }
            }
          }
        } catch (sessionStorageError) {
          console.warn('Error accessing business verification cache:', sessionStorageError);
        }
      }

      // Priority 3: Check legacy user data cache
      if (!foundProfilePicture) {
        try {
          const userData = sessionStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            if (user.profile_picture) {
              foundProfilePicture = user.profile_picture;
              // Update localStorage with this value for persistence
              if (foundProfilePicture) {
                try {
                  localStorage.setItem('cremation_profile_picture', foundProfilePicture);
                } catch (localStorageError) {
                  console.warn('Error updating localStorage:', localStorageError);
                }
              }
            }
          }
        } catch (userDataError) {
          console.warn('Error accessing user data cache:', userDataError);
        }
      }

      // Update state if we found a profile picture and it's different from current
      if (foundProfilePicture && foundProfilePicture !== profilePicture) {
        setProfilePicture(foundProfilePicture);
      } else if (!foundProfilePicture && profilePicture) {
        // Only clear if we're sure there's no profile picture anywhere
        setProfilePicture(null);
      }
    } catch (error) {
      console.error('Error reading cached profile picture:', error);
    }
  };

  // Listen for profile picture updates from other components (like AdminNavbar does)
  useEffect(() => {
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      console.log('Profile picture update event received:', event.detail);
      if (event.detail?.profilePicturePath) {
        const newProfilePicture = event.detail.profilePicturePath;
        setProfilePicture(newProfilePicture);
        
        // Store in localStorage for persistence
        try {
          localStorage.setItem('cremation_profile_picture', newProfilePicture);
          console.log('Profile picture saved to localStorage:', newProfilePicture);
        } catch (error) {
          console.warn('Error saving profile picture to localStorage:', error);
        }
      } else {
        // Reload from storage if no path provided
        updateProfilePictureFromStorage();
      }
    };

    // Listen for custom event when profile picture is updated
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);

    // Also listen for storage events (when localStorage is updated from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cremation_profile_picture' || e.key === 'user_data') {
        updateProfilePictureFromStorage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Poll for session storage changes (since storage event doesn't fire for sessionStorage in same tab)
    const pollForChanges = () => {
      updateProfilePictureFromStorage();
    };

    const interval = setInterval(pollForChanges, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Update username when prop changes
  useEffect(() => {
    if (propUserName && propUserName !== 'Cremation Provider') {
      setUserName(propUserName);
    }
  }, [propUserName]);



  // Handle navigation item click
  const handleNavItemClick = (id: string) => {
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
          <div className="flex items-center min-w-0 flex-1">
            {/* Mobile menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="lg:hidden text-white p-2 rounded-lg hover:bg-white/20 transition-colors duration-300 mr-2 flex-shrink-0"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            <h1 className="text-white text-lg md:text-xl font-semibold ml-2 truncate">Cremation Center Dashboard</h1>
          </div>

                    <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            {/* Notification Bell - visible on all screen sizes */}
            <div data-notification-bell className="flex-shrink-0">
              <NotificationBell />
            </div>

            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsMobileMenuOpen(false); // Close mobile menu when user dropdown opens
                }}
                className="flex items-center space-x-1 md:space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-2 py-1 md:px-4 md:py-2 hover:bg-white/20 transition-all duration-300 min-w-0"
              >
                <div className="bg-white rounded-full h-6 w-6 md:h-8 md:w-8 flex items-center justify-center mr-1 md:mr-2 overflow-hidden flex-shrink-0">
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
                        // Remove from localStorage as well
                        localStorage.removeItem('cremation_profile_picture');
                      }}
                    />
                  ) : (
                    <UserIcon className="h-3 w-3 md:h-5 md:w-5 text-[var(--primary-green)]" />
                  )}
                </div>
                <span className="modern-text font-medium tracking-wide text-xs md:text-sm hidden sm:block min-w-0 truncate">
                  {userName}
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
        userName={userName}
      />
    </header>
  );
}