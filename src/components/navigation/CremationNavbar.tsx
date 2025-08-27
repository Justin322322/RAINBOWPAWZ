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
import { getProfilePictureUrl } from '@/utils/imageUtils';

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(propActivePage || '');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState(propUserName);
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        const user = JSON.parse(cachedUserData);
        return user.profile_picture || null;
      }
    } catch {}
    return null;
  });

  const fetchProfileData = useCallback(async () => {
    if (isNavigating) return;

    try {
      // Prioritize cached data to avoid unnecessary API calls
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        const user = JSON.parse(cachedUserData);
        if (user.profile_picture) {
          setProfilePicture(user.profile_picture);
        }
        if (user.first_name) {
          setUserName(`${user.first_name} ${user.last_name || ''}`.trim());
        }
      }

      const response = await fetch('/api/cremation/profile', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const { profile } = data;
        
        if (profile) {
          const newProfilePicture = profile.profile_picture || profile.profilePicturePath;
          const newUserName = `${profile.first_name} ${profile.last_name || ''}`.trim();

          setProfilePicture(newProfilePicture);
          setUserName(newUserName);

          // Update sessionStorage with fresh data
          const userDataToCache = JSON.stringify({
            ...JSON.parse(cachedUserData || '{}'),
            profile_picture: newProfilePicture,
            first_name: profile.first_name,
            last_name: profile.last_name
          });
          sessionStorage.setItem('user_data', userDataToCache);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  }, [isNavigating]);

  useEffect(() => {
    if (isMounted) {
      fetchProfileData();
    }
  }, [isMounted, fetchProfileData]);

  useEffect(() => {
    const handleProfilePictureUpdate = (event: Event) => {
      const ce = event as CustomEvent<{ profilePicturePath?: string; userType?: string }>;
      const detail = ce.detail || {};
      if (!isNavigating && detail.profilePicturePath && (detail.userType === 'business' || !detail.userType)) {
        const newPic = detail.profilePicturePath;
        setProfilePicture(newPic);
        try {
          const cachedUserData = sessionStorage.getItem('user_data');
          const existing = cachedUserData ? JSON.parse(cachedUserData) : {};
          existing.profile_picture = newPic;
          sessionStorage.setItem('user_data', JSON.stringify(existing));
        } catch {}
      }
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    };
  }, [isNavigating]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-notification-bell]') && (isDropdownOpen || isMobileMenuOpen)) {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen, isMobileMenuOpen]);

  useEffect(() => {
    setIsNavigating(false);
    const page = propActivePage || pathname.split('/').pop();
    setActivePage(page || 'dashboard');
  }, [pathname, propActivePage]);

  const handleNavItemClick = (_id: string) => {
    setIsNavigating(true);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setShowLogoutModal(true);
  };

  const navigationItems = [
    { name: 'Overview', href: '/cremation/dashboard', icon: HomeIcon, id: 'dashboard' },
    { name: 'My Packages', href: '/cremation/packages', icon: SquaresPlusIcon, id: 'packages' },
    { name: 'Active Bookings', href: '/cremation/bookings', icon: CalendarIcon, id: 'bookings' },
    { name: 'Booking History', href: '/cremation/history', icon: ClockIcon, id: 'history' },
    { name: 'Reviews', href: '/cremation/reviews', icon: StarIcon, id: 'reviews' }
  ];

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] fixed top-0 left-0 lg:left-64 right-0 z-50 w-full lg:w-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="lg:hidden text-white p-2 rounded-lg hover:bg-white/20 transition-colors duration-300 mr-2"
            >
              {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
            <h1 className="text-white text-lg md:text-xl font-semibold ml-2">Cremation Center Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div data-notification-bell>
              <NotificationBell />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
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
                      onError={() => setProfilePicture(null)}
                    />
                  ) : (
                    <UserIcon className="h-3 w-3 md:h-5 md:w-5 text-[var(--primary-green)]" />
                  )}
                </div>
                <span className="modern-text font-medium tracking-wide text-xs md:text-sm hidden sm:block">
                  {userName}
                </span>
                <ChevronDownIcon className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link href="/cremation/dashboard" className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium" onClick={() => handleNavItemClick('dashboard')}>
                    Dashboard
                  </Link>
                  <Link href="/cremation/profile" className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100" onClick={() => handleNavItemClick('profile')}>
                    Profile
                  </Link>
                  <Link href="/cremation/settings" className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100" onClick={() => handleNavItemClick('settings')}>

                    Settings
                  </Link>
                  <div className="border-t border-gray-100"></div>
                  <button className="block w-full text-left px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium" onClick={handleLogoutClick}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="lg:hidden bg-[var(--primary-green)] border-t border-white/20 relative z-50 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <Link key={item.name} href={item.href} className={`flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${isActive ? 'bg-white/20 font-medium' : ''}`} onClick={() => {
                      setActivePage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className="h-6 w-6 mr-4" />
                    <span className="modern-text text-base">{item.name}</span>
                  </Link>
                );
              })}
              <div className="border-t border-white/20 my-3"></div>
              <Link href="/cremation/profile" className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300" onClick={() => setIsMobileMenuOpen(false)}>
                <UserIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Profile</span>
              </Link>
              <Link href="/cremation/settings" className="flex items-center px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300" onClick={() => setIsMobileMenuOpen(false)}>
                <Cog6ToothIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Settings</span>
              </Link>
              <button className="flex items-center w-full px-4 py-4 rounded-lg text-white hover:bg-white/10 transition-all duration-300" onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogoutClick();
                }}>
                <ArrowRightOnRectangleIcon className="h-6 w-6 mr-4" />
                <span className="modern-text text-base">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
      <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} userName={userName} />
    </header>
  );
}