'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CalendarIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { PackageImage } from '@/components/packages/PackageImage';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';

// This is a direct access version of the cremation dashboard that bypasses all verification checks
function DirectCremationDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('Cremation Center');
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySetupNeeded, setAvailabilitySetupNeeded] = useState(false);
  const [availabilitySetupInProgress, setAvailabilitySetupInProgress] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: [],
    recentBookings: [],
    servicePackages: []
  });
  const { showToast } = useToast();
  const [showAvailabilitySection, setShowAvailabilitySection] = useState(false);
  const [userData, setUserData] = useState<any>({
    id: 3,
    business_id: 2,
    business_name: 'Cremation Center',
    first_name: 'Justin',
    last_name: 'Sibonga',
    role: 'business',
    user_type: 'business',
    is_verified: 1,
    is_otp_verified: 1,
    service_provider: {
      application_status: 'approved',
      business_permit_path: 'dummy_path',
      government_id_path: 'dummy_path',
      bir_certificate_path: 'dummy_path'
    }
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.business_id) {
        setLoading(false);
        return;
      }

      try {
        // Add cache busting parameter to prevent cached results
        const response = await fetch(`/api/cremation/dashboard?providerId=${userData.business_id}&t=${Date.now()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch dashboard data: ${response.status} ${errorData.error || ''}`);
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        showToast('Failed to load dashboard data. Please try again later.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData, showToast]);

  // Default icons for stats
  const statIcons = [
    CurrencyDollarIcon,
    UsersIcon,
    CalendarIcon,
    StarIcon,
    ClockIcon
  ];

  // Default colors for stats
  const statColors = [
    { bgColor: 'bg-green-100', textColor: 'text-green-800', iconColor: 'text-green-600' },
    { bgColor: 'bg-blue-100', textColor: 'text-blue-800', iconColor: 'text-blue-600' },
    { bgColor: 'bg-purple-100', textColor: 'text-purple-800', iconColor: 'text-purple-600' },
    { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', iconColor: 'text-yellow-600' },
    { bgColor: 'bg-gray-100', textColor: 'text-gray-800', iconColor: 'text-gray-600' }
  ];

  // Handle availability changes (called when calendar data is fetched or updated)
  const handleAvailabilityChange = (availability: any) => {
    // DO NOT show toast here, as this is called on initial load too.
    // Toast will be triggered by a more specific onSaveSuccess callback.
  };

  // This function is specifically called only after a successful save action
  const handleSaveSuccess = () => {
    showToast('Availability settings saved successfully', 'success');
  };

  // Show or hide the availability section
  const toggleAvailabilitySection = () => {
    setShowAvailabilitySection(!showAvailabilitySection);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Cremation Dashboard</h1>
          </div>
          <div>
            <span className="text-sm text-gray-600">Welcome, {userName}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Welcome, {userName}</h1>
              <p className="text-gray-600 mt-1">Manage your pet cremation services and bookings</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/cremation/packages')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Manage Packages
              </button>
              <button
                onClick={() => router.push('/cremation/bookings')}
                className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90"
              >
                View Bookings
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardData.stats?.map((stat: any, index: number) => {
            const Icon = statIcons[index % statIcons.length];
            const colors = statColors[index % statColors.length];

            return (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className={`${colors.bgColor} p-3 rounded-full mr-4`}>
                    <Icon className={`h-6 w-6 ${colors.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <div className="flex items-center mt-1">
                      <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                      <div className={`flex items-center ml-2 ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.changeType === 'increase' ? (
                          <ArrowUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4" />
                        )}
                        <span className="text-xs font-medium">{stat.change}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Direct Access Dashboard</h2>
          <p className="text-gray-600 mb-6">This is a special direct access version of the cremation dashboard that bypasses all verification checks.</p>
          <div className="flex justify-center space-x-4">
            <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Go to Home
            </Link>
            <Link href="/cremation/dashboard" className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
              Try Normal Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DirectCremationDashboardPage;
