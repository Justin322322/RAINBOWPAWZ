'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CremationNavbar from './CremationNavbar';
import CremationSidebar from './CremationSidebar';
import DashboardSkeleton from '../ui/DashboardSkeleton';
import { HomeIcon, DocumentTextIcon, ArchiveBoxIcon, CalendarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface CremationDashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
  userName?: string;
  userData?: any;
}

export default function CremationDashboardLayout({
  children,
  activePage,
  userName = 'Cremation Provider',
  userData: propUserData
}: CremationDashboardLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // Authentication check effect
  useEffect(() => {
    // Always force a fresh verification check on each render
    const doVerificationCheck = async () => {
      try {
        // If userData is provided via props, verify it directly
        // but always fetch fresh data to ensure we have the latest verification status
        const userId = propUserData?.id || getUserIdFromCookie();
        
        if (!userId) {
          console.log('No user ID found, redirecting to home');
          router.push('/');
          return;
        }
        
        // Always fetch user data to get latest verification status
        try {
          const response = await fetch(`/api/users/${userId}?t=${Date.now()}`);
          
          if (!response.ok) {
            console.error('Failed to fetch user data:', await response.text());
            setShowAccessDenied(true);
            setIsLoading(false);
            return;
          }
          
          const userData = await response.json();
          console.log('Cremation user data fetched:', userData);
          
          // Verify user is a business account
          if (userData.role !== 'business' && userData.user_type !== 'business') {
            console.log('User is not a business account:', userData.role);
            setShowAccessDenied(true);
            setIsLoading(false);
            return;
          }
          
          // Strict verification checks
          const isVerified = 
            userData.is_verified === 1 && 
            userData.status === 'active' &&
            userData.service_provider &&
            (userData.service_provider.status !== 'pending' && 
             userData.service_provider.status !== 'unverified');
          
          if (!isVerified) {
            console.log('Business account is not verified:', userData);
            router.push('/cremation/pending-verification');
            return;
          }
          
          // Check document uploads
          const hasDocuments = userData.service_provider && (
            userData.service_provider.business_permit_path ||
            userData.service_provider.government_id_path ||
            userData.service_provider.bir_certificate_path
          );
          
          if (!hasDocuments) {
            console.log('Business has not uploaded required documents');
            router.push('/cremation/pending-verification');
            return;
          }
          
          setUserData(userData);
          setIsAuthenticated(true);
          setIsLoading(false);
        } catch (fetchError) {
          console.error('Error fetching user data:', fetchError);
          setShowAccessDenied(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setShowAccessDenied(true);
        setIsLoading(false);
      }
    };
    
    const getUserIdFromCookie = (): string | null => {
      try {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
        
        if (!authCookie) return null;
        
        // Extract user ID and account type from auth token
        const cookieParts = authCookie.split('=');
        if (cookieParts.length !== 2) return null;
        
        let authValue;
        try {
          authValue = decodeURIComponent(cookieParts[1]);
        } catch (e) {
          authValue = cookieParts[1]; // Use raw value if decoding fails
        }
        
        const [userId, accountType] = authValue.split('_');
        
        // Validate account type
        if (accountType !== 'business') {
          console.log('Invalid account type for cremation dashboard:', accountType);
          return null;
        }
        
        return userId;
      } catch (e) {
        console.error('Error parsing auth cookie:', e);
        return null;
      }
    };

    doVerificationCheck();
  }, [router, propUserData]);

  // Content loading state for skeleton animation only
  const [contentLoading, setContentLoading] = useState(true);

  // Effect to simulate content loading with a short delay
  useEffect(() => {
    if (isAuthenticated && userData) {
      const timer = setTimeout(() => {
        setContentLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userData]);

  // Show skeleton during initial loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CremationSidebar activePage={activePage} />
        <div className="pl-64">
          <CremationNavbar activePage={activePage} userName={userName} />
          <main className="p-6">
            <DashboardSkeleton type="cremation" />
          </main>
        </div>
      </div>
    );
  }

  if (showAccessDenied || !isAuthenticated || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-500">You do not have permission to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-opacity-90"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render the dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <CremationSidebar activePage={activePage} />
      <div className="pl-64"> {/* This padding should match the width of the sidebar */}
        <CremationNavbar activePage={activePage} userName={userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : userName} />
        <main className="p-6">
          {contentLoading ? (
            <DashboardSkeleton type="cremation" />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

const navigationItems = [
  { name: 'Dashboard', href: '/cremation/dashboard', icon: HomeIcon },
  { name: 'Services', href: '/cremation/packages', icon: ArchiveBoxIcon },
  { name: 'Bookings', href: '/cremation/bookings', icon: CalendarIcon },
  { name: 'History', href: '/cremation/history', icon: ClockIcon },
  { name: 'Profile', href: '/cremation/profile', icon: UserCircleIcon }
];