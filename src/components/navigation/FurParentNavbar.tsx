'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCartIcon,
  UserIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { clearAuthToken } from '@/utils/auth';
import LogoutModal from '@/components/LogoutModal';

interface FurParentNavbarProps {
  activePage?: string;
  userName?: string;
}

export default function FurParentNavbar({ activePage: propActivePage, userName = 'User' }: FurParentNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
      if (pathname === '/user/furparent_dashboard') {
        setActivePage('home');
      } else if (pathname === '/user/furparent_dashboard/services') {
        setActivePage('services');
      }
    }
  }, [pathname, propActivePage]);

  return (
    <header className="bg-[var(--primary-green)] shadow-[0_4px_10px_rgba(0,0,0,0.3)] relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link
              href="/user/furparent_dashboard"
              className="flex items-center space-x-3"
              onClick={() => setActivePage('home')}
            >
              <Image src="/logo.png" alt="Rainbow Paws Logo" width={40} height={40} className="h-10 w-auto" />
              <span className="text-xl modern-heading text-white tracking-wide">RainbowPaws</span>
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
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/user/furparent_dashboard/cart" className="text-white hover:text-gray-200 transition-colors">
              <ShoppingCartIcon className="h-6 w-6" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 text-white focus:outline-none border border-white/30 rounded-full px-4 py-2 hover:bg-white/10 transition-all duration-300"
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
                    href="/user/furparent_dashboard"
                    className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={() => setActivePage('home')}
                  >
                    Dashboard
                  </Link>
                  <Link href="/user/furparent_dashboard/profile" className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100">
                    Profile
                  </Link>
                  <Link href="/user/furparent_dashboard/settings" className="block px-4 py-2 text-sm modern-text text-gray-700 hover:bg-gray-100">
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

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={userName}
      />
    </header>
  );
}
