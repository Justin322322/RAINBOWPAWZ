'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { clearAuthToken } from '@/utils/auth';
import LogoutModal from '@/components/LogoutModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { getProfilePictureUrl, handleImageError } from '@/utils/imageUtils';

interface AdminNavbarProps {
  activePage?: string;
  userName?: string;
  onMenuToggle?: () => void;
}

export default function AdminNavbar({ activePage: propActivePage, userName = 'Admin', onMenuToggle }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Removed isNotificationOpen state as we're using the NotificationBell component
  const [activePage, setActivePage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
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

  // Function to update profile picture from session storage
  const updateProfilePictureFromStorage = () => {
    const adminData = sessionStorage.getItem('admin_data');
    if (adminData) {
      try {
        const admin = JSON.parse(adminData);
        setProfilePicture(admin.profile_picture || null);
      } catch (error) {
        console.error('Failed to parse admin data:', error);
      }
    }
  };

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
  const handleNavItemClick = (id: string) => {
    setIsNavigating(true);
    setIsDropdownOpen(false);
    // Don't set active page here, let the useEffect handle it after navigation
  };

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
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] relative z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-white text-xl font-semibold ml-2">Administrator Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300"
              >
                <div className="bg-white rounded-full h-8 w-8 flex items-center justify-center mr-2 overflow-hidden">
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
                    <UserIcon className="h-5 w-5 text-[var(--primary-green)]" />
                  )}
                </div>
                <span className="modern-text font-medium tracking-wide">{userName}</span>
                <ChevronDownIcon className="h-4 w-4 ml-2" />
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

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={userName}
      />
    </header>
  );
}