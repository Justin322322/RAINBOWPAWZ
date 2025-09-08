'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCartIcon,
  UserIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CogIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import LogoutModal from '@/components/LogoutModal';
import CartDropdown from '@/components/cart/CartDropdown';
import NotificationBell from '@/components/ui/NotificationBell';
import { useCart } from '@/contexts/CartContext';
import { getProfilePictureUrl, handleImageError } from '@/utils/imageUtils';

// Global state to persist profile picture across navigation
let globalProfilePictureState = {
  profilePicture: null as string | null,
  initialized: false
};

interface FurParentNavbarProps {
  activePage?: string;
  userName?: string;
}

export default function FurParentNavbar({ activePage: propActivePage, userName = 'User' }: FurParentNavbarProps) {
  const pathname = usePathname();
  const _router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Use global state to persist profile picture across navigation
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    // First check global state
    if (globalProfilePictureState.initialized) {
      return globalProfilePictureState.profilePicture;
    }

    // If not initialized, get from multiple sources in order of preference
    if (typeof window !== 'undefined') {
      try {
        // 1. Try session storage first (most recent)
        const userData = sessionStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          const profilePicturePath = user.profile_picture || null;
          if (profilePicturePath) {
            // Initialize global state and also backup to localStorage
            globalProfilePictureState.profilePicture = profilePicturePath;
            globalProfilePictureState.initialized = true;
            localStorage.setItem('furparent_profile_picture', profilePicturePath);
            return profilePicturePath;
          }
        }

        // 2. Fallback to localStorage backup (survives logout)
        const backupProfilePicture = localStorage.getItem('furparent_profile_picture');
        if (backupProfilePicture) {
          globalProfilePictureState.profilePicture = backupProfilePicture;
          globalProfilePictureState.initialized = true;
          return backupProfilePicture;
        }
      } catch (error) {
        console.error('Failed to parse user data during initialization:', error);
      }
    }
    return null;
  });

  // Get real cart item count from context
  const { itemCount } = useCart();

  // Function to update profile picture from session storage or API
  const updateProfilePictureFromStorage = useCallback(async () => {
    const userData = sessionStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const newProfilePicture = user.profile_picture || null;
        // Only update if the profile picture actually changed
        if (newProfilePicture !== profilePicture) {
          setProfilePicture(newProfilePicture);
          // Also update global state and localStorage backup
          globalProfilePictureState.profilePicture = newProfilePicture;
          if (newProfilePicture) {
            localStorage.setItem('furparent_profile_picture', newProfilePicture);
          } else {
            localStorage.removeItem('furparent_profile_picture');
          }
          return; // Profile picture found in cache
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }

    // If no profile picture in cache or session storage is empty, fetch from API
    if (!profilePicture) {
      try {
        // Get user ID from session storage or auth token
        let userId = null;

        if (userData) {
          try {
            const user = JSON.parse(userData);
            userId = user.user_id || user.id;
          } catch (error) {
            console.error('Failed to parse user data for API call:', error);
          }
        }

        // Fallback: get user ID from auth token
        if (!userId) {
          const authToken = sessionStorage.getItem('auth_token');
          if (authToken?.includes('_')) {
            userId = authToken.split('_')[0];
          }
        }

        if (userId) {
          const response = await fetch(`/api/users/${userId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.profile_picture) {
              setProfilePicture(data.profile_picture);
              globalProfilePictureState.profilePicture = data.profile_picture;

              // Backup to localStorage for persistence across logout
              localStorage.setItem('furparent_profile_picture', data.profile_picture);

              // Update session storage with the fetched profile picture
              if (userData) {
                try {
                  const user = JSON.parse(userData);
                  user.profile_picture = data.profile_picture;
                  sessionStorage.setItem('user_data', JSON.stringify(user));
                } catch (error) {
                  console.error('Failed to update user data cache:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile picture:', error);
      }
    }
  }, [profilePicture]);

  // Only initialize profile picture once globally - never reload during navigation
  useEffect(() => {
    // Only run if global state is not initialized
    if (!globalProfilePictureState.initialized && typeof window !== 'undefined') {
      const userData = sessionStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const profilePicturePath = user.profile_picture || null;

          // Update both local and global state
          setProfilePicture(profilePicturePath);
          globalProfilePictureState.profilePicture = profilePicturePath;
          globalProfilePictureState.initialized = true;

          // Backup to localStorage if we have a profile picture
          if (profilePicturePath) {
            localStorage.setItem('furparent_profile_picture', profilePicturePath);
          }

          // If no profile picture in cache, try to fetch from API
          if (!profilePicturePath) {
            updateProfilePictureFromStorage();
          }
        } catch (error) {
          console.error('Failed to parse user data:', error);
          globalProfilePictureState.initialized = true; // Mark as initialized even on error
        }
      } else {
        // No session storage data, check localStorage backup
        try {
          const backupProfilePicture = localStorage.getItem('furparent_profile_picture');
          if (backupProfilePicture) {
            setProfilePicture(backupProfilePicture);
            globalProfilePictureState.profilePicture = backupProfilePicture;
          }
        } catch (error) {
          console.error('Failed to get localStorage backup:', error);
        }

        // Try to fetch from API to get fresh data
        updateProfilePictureFromStorage();
        globalProfilePictureState.initialized = true; // Mark as initialized
      }
    }
  }, [updateProfilePictureFromStorage]); // Include updateProfilePictureFromStorage in dependencies

  // Listen for profile picture updates and user data updates from other components
  useEffect(() => {
    const handleProfilePictureUpdate = (event: Event) => {
      const ce = event as CustomEvent<{ profilePicturePath?: string; userType?: string }>;
      const detail = ce.detail || {};
      if (detail.profilePicturePath && (detail.userType === 'user' || !detail.userType)) {
        const newPic = detail.profilePicturePath;
        setProfilePicture(newPic);
        try {
          const userData = sessionStorage.getItem('user_data');
          const user = userData ? JSON.parse(userData) : {};
          user.profile_picture = newPic;
          sessionStorage.setItem('user_data', JSON.stringify(user));
          localStorage.setItem('furparent_profile_picture', newPic);
          globalProfilePictureState.profilePicture = newPic;
          globalProfilePictureState.initialized = true;
        } catch {}
      } else {
        updateProfilePictureFromStorage();
      }
    };

    const handleUserDataUpdate = (event: CustomEvent) => {
      // Update session storage with new user data
      if (event.detail) {
        sessionStorage.setItem('user_data', JSON.stringify(event.detail));

        // Also backup profile picture to localStorage if present
        if (event.detail.profile_picture) {
          localStorage.setItem('furparent_profile_picture', event.detail.profile_picture);
        }

        updateProfilePictureFromStorage();
      }
    };

    // Listen for custom events
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [updateProfilePictureFromStorage]);

  // Open logout modal
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutModal(true);
  };

  // Determine active page based on pathname or prop
  useEffect(() => {
    if (propActivePage) {
      setActivePage(propActivePage);
    } else {
      if (pathname === '/user/furparent_dashboard') {
        setActivePage('home');
      } else if (pathname === '/user/furparent_dashboard/services') {
        setActivePage('services');
      } else if (pathname === '/user/furparent_dashboard/bookings') {
        setActivePage('bookings');
      } else if (pathname === '/user/furparent_dashboard/settings') {
        setActivePage('settings');
      } else if (pathname === '/user/furparent_dashboard/profile') {
        setActivePage('profile');
      }
    }
  }, [pathname, propActivePage]);

  // Close dropdowns when clicking elsewhere
  useEffect(() => {
    // We're not using this global click handler anymore
    // The CartDropdown component handles its own click outside events
    // The NotificationBell component handles its own click outside events
    // This was causing the cart and notifications_unified to close when clicking inside them

    // We'll keep the user dropdown and mobile menu functionality
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Don't close if clicking on notification bell or its dropdown
      if (target.closest('[data-notification-bell]')) {
        return;
      }

      // Don't close if clicking on cart or its dropdown
      if (target.closest('[data-cart-dropdown]')) {
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

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] fixed top-0 left-0 right-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="md:hidden text-white p-2 rounded-lg hover:bg-white/20 transition-colors duration-300 mr-2"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            <Link
              href="/user/furparent_dashboard"
              className="flex items-center space-x-2 md:space-x-3"
              onClick={() => {
                setActivePage('home');
                setIsMobileMenuOpen(false);
              }}
            >
              <Image src="/logo.png" alt="Rainbow Paws Logo" width={40} height={40} className="h-8 w-8 md:h-10 md:w-10 object-contain" />
              <span className="text-lg md:text-xl modern-heading text-white tracking-wide">RainbowPaws</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center justify-center space-x-10 absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="/user/furparent_dashboard"
              className={`text-base modern-text text-white hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 ${activePage === 'home' ? 'after:w-full font-medium' : 'after:w-0'} after:h-0.5 after:bg-white after:transition-all after:duration-300 hover:after:w-full cursor-pointer`}
              onClick={() => setActivePage('home')}
            >
              Home
            </Link>
            <Link
              href="/user/furparent_dashboard/services"
              className={`text-base modern-text text-white hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 ${activePage === 'services' ? 'after:w-full font-medium' : 'after:w-0'} after:h-0.5 after:bg-white after:transition-all after:duration-300 hover:after:w-full cursor-pointer`}
              onClick={() => setActivePage('services')}
            >
              Services
            </Link>
            <Link
              href="/user/furparent_dashboard/bookings"
              className={`text-base modern-text text-white hover:text-white transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 ${activePage === 'bookings' ? 'after:w-full font-medium' : 'after:w-0'} after:h-0.5 after:bg-white after:transition-all after:duration-300 hover:after:w-full cursor-pointer`}
              onClick={() => setActivePage('bookings')}
            >
              Bookings
            </Link>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Notification Bell - visible on all screen sizes */}
            <div data-notification-bell>
              <NotificationBell />
            </div>
            <div className="relative" data-cart-dropdown>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCartOpen(!isCartOpen);
                }}
                className="text-white p-2 rounded-full hover:bg-white/10 transition-colors relative"
              >
                <ShoppingCartIcon className="h-5 w-5 md:h-6 md:w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center shadow-md text-[10px] md:text-xs">
                    {itemCount}
                  </span>
                )}
              </button>

              <CartDropdown
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
              />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsMobileMenuOpen(false); // Close mobile menu when user dropdown opens
                }}
                className="flex items-center space-x-1 md:space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-2 py-1 md:px-4 md:py-2 hover:bg-white/10 transition-all duration-300"
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
                        // Don't clear the profile picture state to prevent flickering
                        console.warn('Profile picture failed to load, using fallback');
                      }}
                      priority
                      unoptimized // Prevent Next.js from reprocessing the image during navigation
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
                    href="/user/furparent_dashboard/bookings"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setActivePage('bookings');
                      setIsDropdownOpen(false);
                    }}
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/user/furparent_dashboard/profile"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/user/furparent_dashboard/settings"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsDropdownOpen(false)}
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
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile menu */}
          <div className="md:hidden bg-[var(--primary-green)] border-t border-white/20 relative z-50 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              <Link
                href="/user/furparent_dashboard"
                className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${
                  activePage === 'home' ? 'bg-white/20 font-medium' : ''
                }`}
                onClick={() => {
                  setActivePage('home');
                  setIsMobileMenuOpen(false);
                }}
              >
                <HomeIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Home</span>
              </Link>

              <Link
                href="/user/furparent_dashboard/services"
                className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${
                  activePage === 'services' ? 'bg-white/20 font-medium' : ''
                }`}
                onClick={() => {
                  setActivePage('services');
                  setIsMobileMenuOpen(false);
                }}
              >
                <CogIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Services</span>
              </Link>

              <Link
                href="/user/furparent_dashboard/bookings"
                className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${
                  activePage === 'bookings' ? 'bg-white/20 font-medium' : ''
                }`}
                onClick={() => {
                  setActivePage('bookings');
                  setIsMobileMenuOpen(false);
                }}
              >
                <CalendarDaysIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Bookings</span>
              </Link>

              {/* Divider */}
              <div className="border-t border-white/20 my-3"></div>

              {/* Profile actions for mobile */}
              <Link
                href="/user/furparent_dashboard/profile"
                className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Profile</span>
              </Link>

              <Link
                href="/user/furparent_dashboard/settings"
                className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <CogIcon className="h-6 w-6 mr-4" />
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
