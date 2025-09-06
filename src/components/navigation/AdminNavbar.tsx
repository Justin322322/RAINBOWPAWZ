'use client';

import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon,
  RectangleStackIcon,
  StarIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  UserCircleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

import LogoutModal from '@/components/LogoutModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { getProfilePictureUrl, handleImageError } from '@/utils/imageUtils';

const MAIN_NAVIGATION_ITEMS = [
  { name: 'Overview', href: '/admin/dashboard', icon: HomeIcon, id: 'dashboard' },
  { name: 'Application Requests', href: '/admin/applications', icon: ClipboardDocumentCheckIcon, id: 'applications' },
  { name: 'Active Services', href: '/admin/services', icon: RectangleStackIcon, id: 'services' },
  { name: 'Reviews', href: '/admin/reviews', icon: StarIcon, id: 'reviews' },
  { name: 'Activity Monitor', href: '/admin/logs', icon: DocumentTextIcon, id: 'logs' },
];

const USER_MANAGEMENT_ITEMS = [
  { name: 'Cremation Centers', href: '/admin/users/cremation', icon: UserIcon, id: 'cremation' },
  { name: 'Fur Parents', href: '/admin/users/furparents', icon: UsersIcon, id: 'furparents' },
];

const PROFILE_ACTION_ITEMS = [
  { name: 'Profile', href: '/admin/profile', icon: UserCircleIcon, id: 'profile' },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon, id: 'settings' },
];

const getActivePageFromPath = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1) {
    return segments[1];
  }
  return 'dashboard';
};

const useNavbarState = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const closeAllMenus = useCallback(() => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogoutClick = () => {
    closeAllMenus();
    setShowLogoutModal(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest('[data-notification-bell]') ||
        target?.closest('[data-dropdown-toggle]') ||
        target?.closest('[data-dropdown-panel]')
      ) {
        return; // Click is inside dropdown/bell → do not close
      }
      closeAllMenus();
    };

    if (isDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isMobileMenuOpen, closeAllMenus]);

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    showLogoutModal,
    setShowLogoutModal,
    handleLogoutClick,
    closeAllMenus,
  };
};

const MobileMenuButton = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="lg:hidden text-white p-2 rounded-lg hover:bg-white/20 transition-colors duration-300 mr-2"
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
    aria-expanded={isOpen}
  >
    {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
  </button>
);

const UserProfile = ({
  userName,
  profilePicture,
  setProfilePicture,
  isDropdownOpen,
  setIsDropdownOpen,
  onLogoutClick,
}: {
  userName: string;
  profilePicture: string | null;
  setProfilePicture: React.Dispatch<React.SetStateAction<string | null>>;
  isDropdownOpen: boolean;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onLogoutClick: () => void;
}) => (
  <div className="relative">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
      }}
      data-dropdown-toggle
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
              setProfilePicture(null);
            }}
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
      <div
        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
        data-dropdown-panel
      >
        <Link
          href="/admin/profile"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setIsDropdownOpen(false)}
        >
          Profile
        </Link>
        <Link
          href="/admin/settings"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setIsDropdownOpen(false)}
        >
          Settings
        </Link>
        <div className="border-t border-gray-100 my-1"></div>
        <button
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
          onClick={onLogoutClick}
        >
          Logout
        </button>
      </div>
    )}
  </div>
);

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type NavItem = { name: string; href: string; icon: IconType; id: string };

const MobileMenu = ({
  isOpen,
  onClose,
  activePage,
  onLogoutClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  activePage: string;
  onLogoutClick: () => void;
}) => {
  if (!isOpen) return null;

  const renderLink = (item: NavItem) => {
    const isActive = activePage === item.id;
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ${
          isActive ? 'bg-white/20 font-medium' : ''
        }`}
        onClick={onClose}
      >
        <item.icon className="h-6 w-6 mr-4" />
        <span className="text-base">{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />
      <div className="lg:hidden bg-[var(--primary-green)] border-t border-white/20 absolute top-full left-0 right-0 z-50 shadow-lg">
        <div className="px-2 py-4 space-y-1">
          {MAIN_NAVIGATION_ITEMS.map(renderLink)}
          <div className="border-t border-white/20 my-3"></div>
          <div className="px-3 py-2">
            <span className="text-white text-sm font-medium opacity-75">User Management</span>
          </div>
          {USER_MANAGEMENT_ITEMS.map(renderLink)}
          <div className="border-t border-white/20 my-3"></div>
          {PROFILE_ACTION_ITEMS.map(renderLink)}
          <button
            className="flex items-center w-full px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
            onClick={onLogoutClick}
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6 mr-4" />
            <span className="text-base">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default function AdminNavbar({ userName = 'Admin' }) {
  const pathname = usePathname();
  const {
    isDropdownOpen,
    setIsDropdownOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    showLogoutModal,
    setShowLogoutModal,
    handleLogoutClick,
    closeAllMenus,
  } = useNavbarState();

  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const pic = sessionStorage.getItem('admin_profile_picture');
      if (pic) return pic;
      const adminDataStr = sessionStorage.getItem('admin_data');
      if (adminDataStr) {
        const adminData = JSON.parse(adminDataStr);
        return adminData?.profile_picture ?? null;
      }
    } catch {}
    return null;
  });

  const activePage = getActivePageFromPath(pathname);

  useEffect(() => {
    const updateProfilePictureFromStorageOrApi = async () => {
      const cachedPic = sessionStorage.getItem('admin_profile_picture');
      if (cachedPic) {
        setProfilePicture((prev) => prev ?? cachedPic);
        return;
      }

      const adminDataStr = sessionStorage.getItem('admin_data');
      if (adminDataStr) {
        try {
          const adminData = JSON.parse(adminDataStr);
          if (adminData.profile_picture) {
            setProfilePicture((prev) => prev ?? adminData.profile_picture);
            try {
              sessionStorage.setItem('admin_profile_picture', adminData.profile_picture);
            } catch {}
            return;
          }
        } catch (error) {
          console.error('Failed to parse admin data from session storage:', error);
        }
      }

      try {
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile?.profile_picture) {
            const newProfilePic = data.profile.profile_picture;
            setProfilePicture(newProfilePic);
            try {
              sessionStorage.setItem('admin_profile_picture', newProfilePic);
            } catch {}
          }
        }
      } catch (error) {
        console.error('Failed to fetch admin profile picture:', error);
      }
    };

    const handleProfilePictureEvent = (e: Event) => {
      const ce = e as CustomEvent<{ profilePicturePath?: string; userType?: string }>;
      const detail = ce.detail || {};
      if (detail.userType === 'admin' && detail.profilePicturePath) {
        setProfilePicture(detail.profilePicturePath);
        try {
          sessionStorage.setItem('admin_profile_picture', detail.profilePicturePath);
        } catch {}
      }
    };

    updateProfilePictureFromStorageOrApi();
    window.addEventListener('profilePictureUpdated', handleProfilePictureEvent as EventListener);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureEvent as EventListener);
    };
  }, []);

  return (
    <header className="bg-[var(--primary-green)] shadow-md fixed top-0 left-0 lg:left-64 right-0 z-50 w-full lg:w-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            <MobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setIsDropdownOpen(false);
              }}
            />
            <h1 className="text-white text-lg md:text-xl font-semibold ml-2">Administrator Dashboard</h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div data-notification-bell>
              <NotificationBell />
            </div>
            <UserProfile
              userName={userName}
              profilePicture={profilePicture}
              setProfilePicture={setProfilePicture}
              isDropdownOpen={isDropdownOpen}
              setIsDropdownOpen={setIsDropdownOpen}
              onLogoutClick={handleLogoutClick}
            />
          </div>
        </div>
      </div>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeAllMenus}
        activePage={activePage}
        onLogoutClick={handleLogoutClick}
      />

      <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} userName={userName} />
    </header>
  );
}
