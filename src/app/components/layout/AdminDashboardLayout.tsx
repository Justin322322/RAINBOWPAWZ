import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon, 
  UsersIcon, 
  CogIcon, 
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface AdminDashboardLayoutProps {
  children: ReactNode;
  activePage: string;
  userName: string;
}

const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({ 
  children, 
  activePage,
  userName 
}) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.includes(path) ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white shadow-sm">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          </div>
          
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <Link 
              href="/admin/dashboard"
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive('dashboard') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <HomeIcon className="mr-3 h-5 w-5 flex-shrink-0" />
              Dashboard
            </Link>
            
            <Link 
              href="/admin/users"
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive('users') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <UsersIcon className="mr-3 h-5 w-5 flex-shrink-0" />
              Users
            </Link>
            
            <Link 
              href="/admin/services"
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive('services') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <CogIcon className="mr-3 h-5 w-5 flex-shrink-0" />
              Services
            </Link>
          </nav>
          
          {/* User profile */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <UserCircleIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            <button className="mt-3 w-full flex items-center text-sm text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowRightOnRectangleIcon className="mr-2 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Top header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                {activePage.split('/').map(part => part.replace('-', ' ')).join(' / ')}
              </h1>
              <div className="flex items-center space-x-4">
                <button 
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Notifications"
                >
                  <BellIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
