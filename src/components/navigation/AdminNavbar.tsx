'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { clearAuthToken } from '@/utils/auth';
import LogoutModal from '@/components/LogoutModal';

interface AdminNavbarProps {
  activePage?: string;
  userName?: string;
}

export default function AdminNavbar({ activePage: propActivePage, userName = 'Admin' }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
      if (pathname === '/admin/dashboard') {
        setActivePage('dashboard');
      } else if (pathname === '/admin/applications') {
        setActivePage('applications');
      } else if (pathname === '/admin/services') {
        setActivePage('services');
      } else if (pathname.includes('/admin/users')) {
        setActivePage('users');
      }
    }
  }, [pathname, propActivePage]);

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] relative z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-white text-xl font-semibold ml-2 hidden md:block">Administrator Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="text-white hover:bg-white/20 transition-colors p-2 rounded-full"
              >
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></span>
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-700">Notifications</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="px-4 py-2 hover:bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">New application request</p>
                      <p className="text-xs text-gray-500">Happy Paws Cremation - 2 hours ago</p>
                    </div>
                    <div className="px-4 py-2 hover:bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">New user registration</p>
                      <p className="text-xs text-gray-500">John Smith - 5 hours ago</p>
                    </div>
                    <div className="px-4 py-2 hover:bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">System update completed</p>
                      <p className="text-xs text-gray-500">Yesterday</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <Link href="/admin/notifications" className="text-xs text-[var(--primary-green)] hover:underline">
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300"
              >
                <div className="bg-white rounded-full h-8 w-8 flex items-center justify-center mr-2">
                  <UserIcon className="h-5 w-5 text-[var(--primary-green)]" />
                </div>
                <span className="modern-text font-medium tracking-wide">{userName}</span>
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    href="/admin/dashboard"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/profile"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsDropdownOpen(false)}
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