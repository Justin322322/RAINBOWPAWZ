import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

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
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
          <div className="h-0 flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex-1 px-3 space-y-1">
              <Link 
                href="/admin/dashboard"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('dashboard')}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/users"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('users')}`}
              >
                Users
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <div className="text-base font-medium text-gray-800">{userName}</div>
                <div className="text-sm text-gray-500">Admin</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                {activePage.replace('-', ' ')}
              </h1>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
