'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
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
  ExclamationCircleIcon,
  FireIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { PackageImage } from '@/components/packages/PackageImage';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/ui/StatCard';

// The actual component that will be wrapped by withBusinessVerification HOC
function CremationDashboardPage({ userData }: { userData: any }) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySetupNeeded, setAvailabilitySetupNeeded] = useState(false);
  const [availabilitySetupInProgress, setAvailabilitySetupInProgress] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: [],
    recentBookings: [],
    servicePackages: []
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastPendingCount, setLastPendingCount] = useState(0);
  const { showToast } = useToast();
  const [showAvailabilitySection, setShowAvailabilitySection] = useState(false);
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);

  // Update userName when userData is available
  useEffect(() => {
    if (userData) {
      if (userData.business_name) {
        setUserName(userData.business_name);
      } else if (userData.first_name) {
        setUserName(`${userData.first_name} ${userData.last_name || ''}`);
      }
    }
  }, [userData]);

  // Fetch dashboard data function
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    // Use business_id or provider_id, with fallback to 999 for demo
    const providerId = userData?.business_id || userData?.provider_id || 999;

    if (!providerId) {
      setLoading(false);
      setIsLoading(false);
      return;
    }

    // Prevent multiple rapid fetch attempts (except for manual refresh)
    if (!isRefresh) {
      const now = Date.now();
      if (now - lastFetchAttempt < 5000) { // 5 second cooldown between fetch attempts
        return;
      }
      setLastFetchAttempt(now);
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
        setIsLoading(true);
      }

      setDashboardError(null);

      // Add cache busting parameter to prevent cached results
      const now = Date.now();
      const response = await fetch(`/api/cremation/dashboard?providerId=${providerId}&t=${now}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `Failed to fetch dashboard data: ${response.status} ${errorData.error || ''}`;
        setDashboardError(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // If data doesn't have the stats we need, add default ones
      if (!data.stats || data.stats.length === 0) {
        data.stats = [
          { name: 'Total Bookings', value: '0', change: '0%', changeType: 'increase' },
          { name: 'Pending Bookings', value: '0', change: '0%', changeType: 'increase' },
          { name: 'Active Packages', value: '0', change: '0%', changeType: 'increase' },
          { name: 'Monthly Revenue', value: '₱0.00', change: '0%', changeType: 'increase' }
        ];
      }

      // Check for new pending bookings and create notifications
      const pendingStat = data.stats.find((stat: any) => stat.name === 'Pending Bookings');
      const currentPendingCount = parseInt(pendingStat?.value || '0');

      // Create notifications for pending bookings (both new and existing)
      if (currentPendingCount > 0) {
        // If there are more pending bookings than before, create notification for new ones
        if (currentPendingCount > lastPendingCount && lastPendingCount >= 0) {
          const newBookings = currentPendingCount - lastPendingCount;
          if (newBookings > 0) {
            try {
              await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: userData.id,
                  title: 'New Booking Alert',
                  message: `You have ${newBookings} new pending ${newBookings === 1 ? 'booking' : 'bookings'} requiring your attention.`,
                  type: 'info',
                  link: '/cremation/bookings?status=pending'
                })
              });
            } catch (notificationError) {
              console.error('Failed to create notification:', notificationError);
            }
          }
        }

        // Also create a general notification if there are pending bookings (for first-time users)
        if (lastPendingCount === 0 && currentPendingCount > 0) {
          try {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: userData.id,
                title: 'Pending Bookings Reminder',
                message: `You have ${currentPendingCount} pending ${currentPendingCount === 1 ? 'booking' : 'bookings'} waiting for your review.`,
                type: 'warning',
                link: '/cremation/bookings?status=pending'
              })
            });
          } catch (notificationError) {
            console.error('Failed to create notification:', notificationError);
          }
        }
      }
      setLastPendingCount(currentPendingCount);

      setDashboardData(data);
    } catch (error) {
      // Only show toast for non-refresh errors or first-time errors
      if (!isRefresh && !dashboardError) {
        showToast('Failed to load dashboard data. Please try again later.', 'error');
      }
      setDashboardError(error instanceof Error ? error.message : 'Unknown error occurred');

      // Set default data for development/demo purposes
      setDashboardData({
        stats: [
          { name: 'Total Bookings', value: '0', change: '0%', changeType: 'increase' },
          { name: 'Pending Bookings', value: '0', change: '0%', changeType: 'increase' },
          { name: 'Active Packages', value: '0', change: '0%', changeType: 'increase' },
          { name: 'Monthly Revenue', value: '₱0.00', change: '0%', changeType: 'increase' }
        ],
        recentBookings: [],
        popularPackages: []
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userData, lastFetchAttempt, lastPendingCount, dashboardError, showToast]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Check for pending bookings and create notifications
  const checkPendingBookings = useCallback(async () => {
    if (!userData) return;

    try {
      const response = await fetch('/api/cremation/notifications/check-pending');
      if (response.ok) {
        const data = await response.json();
        if (data.notificationCreated && data.pendingCount > 0) {
          // Optionally show a toast or update UI to indicate new notifications
          console.log(`Created notification for ${data.pendingCount} pending bookings`);
        }
      }
    } catch (error) {
      console.error('Failed to check pending bookings:', error);
    }
  }, [userData]);

  // Set up polling for dashboard updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboardData, lastPendingCount]);

  // Set up periodic check for pending bookings (every 2 minutes)
  useEffect(() => {
    if (!userData) return;

    // Initial check
    checkPendingBookings();

    // Set up interval for periodic checks
    const pendingCheckInterval = setInterval(() => {
      checkPendingBookings();
    }, 120000); // 2 minutes

    return () => clearInterval(pendingCheckInterval);
  }, [checkPendingBookings, userData]);

  // Check if availability tables exist
  useEffect(() => {
    const checkAvailabilityTables = async () => {
      if (!userData?.business_id) return;

      try {
        const response = await fetch('/api/cremation/availability?providerId=' + userData.business_id);

        if (response.status === 500) {
          setAvailabilitySetupNeeded(true);
          setAvailabilityError('Database tables for availability calendar need to be set up.');
        } else {
          setAvailabilitySetupNeeded(false);
          setAvailabilityError(null);
        }
      } catch (error) {
        setAvailabilitySetupNeeded(true);
        setAvailabilityError('Could not check if availability tables exist.');
      }
    };

    checkAvailabilityTables();
  }, [userData]);

  // Ensure database tables exist when the page loads
  useEffect(() => {
    let isMounted = true;

    const initializeTables = async () => {
      try {
        // Call our setup API instead of directly calling ensureAvailabilityTablesExist
        const response = await fetch('/api/cremation/availability/setup');
        if (!response.ok) {
          if (isMounted) {
            setAvailabilityError('The availability calendar is experiencing temporary technical difficulties.');
          }
        } else {
          const data = await response.json();

          if (data.mock) {
            if (isMounted) {
              setAvailabilityError('Calendar is in demo mode due to database connection issues.');
            }
          } else if (!data.success) {
            if (isMounted) {
              setAvailabilityError('Could not initialize calendar tables: ' + (data.error || 'Unknown error'));
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          setAvailabilityError('Failed to connect to availability service. Calendar is in read-only mode.');
        }
      }
    };

    initializeTables();

    return () => {
      isMounted = false;
    };
  }, []);

  // Define stats configuration to match admin dashboard
  const statsConfig = [
    {
      key: 'totalBookings',
      name: 'Total Bookings',
      icon: CalendarIcon,
      color: 'blue',
    },
    {
      key: 'pendingBookings',
      name: 'Pending Bookings',
      icon: ClockIcon,
      color: 'yellow',
    },
    {
      key: 'activePackages',
      name: 'Active Packages',
      icon: FireIcon,
      color: 'purple',
    },
    {
      key: 'monthlyRevenue',
      name: 'Monthly Revenue',
      icon: BanknotesIcon,
      color: 'amber',
    },
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
    <CremationDashboardLayout activePage="dashboard" userData={userData}>
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
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors duration-300"
            >
              View Bookings
            </button>
            {/* Show pending bookings alert if there are any */}
            {dashboardData.stats?.find((stat: any) => stat.name === 'Pending Bookings')?.value > 0 && (
              <div className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                <ClockIcon className="h-4 w-4 mr-2" />
                {dashboardData.stats.find((stat: any) => stat.name === 'Pending Bookings')?.value} pending
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Error Display */}
      {dashboardError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Dashboard data could not be loaded</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading your dashboard data. Please try again.</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setLastFetchAttempt(0)} // This will trigger a refetch
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">Dashboard Overview</h2>
          <div className="flex items-center space-x-2">
            {isRefreshing && (
              <div className="flex items-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[var(--primary-green)] mr-2"></div>
                Updating...
              </div>
            )}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Loading skeleton for stats - consistent style
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-gray-200 mr-4 animate-pulse">
                  <div className="h-6 w-6"></div>
                </div>
                <div className="w-full">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        ) : dashboardError ? (
          // Error state
          <div className="col-span-4 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <ExclamationCircleIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-red-600 font-medium text-center mb-2">Error loading dashboard data</p>
            <p className="text-gray-500 text-sm text-center">{dashboardError}</p>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setLastFetchAttempt(0)} // This will trigger a refetch
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          // Actual stats using the StatCard component
          statsConfig.map((stat, index) => {
            // Find the corresponding stat from the dashboard data
            const statData = dashboardData.stats?.find((s: any) =>
              s.name.toLowerCase().includes(stat.key.toLowerCase().replace('total', '').replace('monthly', ''))
            ) || { value: '0', change: '0%', changeType: 'increase' };

            return (
              <StatCard
                key={index}
                icon={<stat.icon />}
                label={stat.name}
                value={statData.value}
                color={stat.color as 'blue' | 'yellow' | 'purple' | 'amber' | 'green'}
              />
            );
          })
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent bookings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Recent Bookings</h2>
            <button
              onClick={() => router.push('/cremation/bookings')}
              className="text-sm text-[var(--primary-green)] hover:underline"
            >
              View all
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[var(--primary-green)]"></div>
              <p className="mt-4 text-gray-600 text-sm">Loading bookings...</p>
            </div>
          ) : dashboardData.recentBookings?.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {dashboardData.recentBookings.map((booking: any, index: number) => (
                <li key={booking.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-4">
                        {booking.status === 'pending' && (
                          <span className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <ClockIcon className="h-5 w-5 text-yellow-600" />
                          </span>
                        )}
                        {booking.status === 'completed' && (
                          <span className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          </span>
                        )}
                        {booking.status !== 'pending' && booking.status !== 'completed' && (
                          <span className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.petName || 'Unknown Pet'}</div>
                        <div className="text-sm text-gray-500">{formatDate(booking.scheduledDate)}</div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'confirmed' ? 'bg-indigo-100 text-indigo-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      } capitalize`}>
                        {booking.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <CalendarIcon className="h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-lg font-medium text-gray-900">No recent bookings</h3>
              <p className="text-gray-500 text-center max-w-xs mt-1">
                You don&apos;t have any bookings yet. When customers book your services, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Recent Reviews</h2>
            <button
              onClick={() => router.push('/cremation/reviews')}
              className="text-sm text-[var(--primary-green)] hover:underline"
            >
              View all
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[var(--primary-green)]"></div>
              <p className="mt-4 text-gray-600 text-sm">Loading reviews...</p>
            </div>
          ) : dashboardData.stats?.find((stat: any) => stat.name === 'Average Rating')?.value === 'No ratings' ? (
            <div className="p-6 text-center">
              <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No reviews yet. Reviews will appear here when customers rate their experience.</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center bg-yellow-100 px-4 py-2 rounded-full">
                  <StarIcon className="h-6 w-6 text-yellow-500 mr-2" />
                  <span className="text-xl font-medium">{dashboardData.stats?.find((stat: any) => stat.name === 'Average Rating')?.value}</span>
                </div>
              </div>
              <p className="text-center text-gray-600 mb-4">
                Check your reviews page to see what customers are saying about your services.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/cremation/reviews')}
                  className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
                >
                  View All Reviews
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Availability Calendar */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-800">Manage Availability</h2>
            {availabilitySetupNeeded ? (
              <button
                onClick={toggleAvailabilitySection}
                className="px-4 py-2 border border-[var(--primary-green)] text-[var(--primary-green)] rounded-md hover:bg-[var(--primary-green-bg)] transition-colors duration-300"
              >
                {showAvailabilitySection ? 'Hide Calendar' : 'Show Calendar'}
              </button>
            ) : (
              <button
                onClick={toggleAvailabilitySection}
                className="px-4 py-2 border border-[var(--primary-green)] text-[var(--primary-green)] rounded-md hover:bg-[var(--primary-green-bg)] transition-colors duration-300"
              >
                {showAvailabilitySection ? 'Hide Calendar' : 'Show Calendar'}
              </button>
            )}
          </div>

          {availabilitySetupNeeded ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
              <ExclamationCircleIcon className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Calendar Setup Required</h3>
              <p className="text-yellow-700 mb-4">
                The availability calendar requires database tables to be set up.
                Click the &quot;Set Up Calendar&quot; button above to create the necessary tables.
              </p>
            </div>
          ) : showAvailabilitySection ? (
            <>
              {availabilityError ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                  <div className="flex">
                    <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <span>{availabilityError}</span>
                  </div>
                </div>
              ) : null}
              <AvailabilityCalendar
                providerId={userData?.business_id || 0}
                onAvailabilityChange={handleAvailabilityChange}
                onSaveSuccess={handleSaveSuccess}
              />
            </>
          ) : (
            // Customer stats when calendar is hidden
            <div className="space-y-6">
                            <div className="p-2"></div>
              <div className="border-t pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Manage your availability to allow customers to book your services. Set which days you are available and configure time slots for bookings.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-[var(--primary-green)] mr-2">•</span>
                    Set which days you are available or unavailable
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--primary-green)] mr-2">•</span>
                    Create time slots for customer bookings
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--primary-green)] mr-2">•</span>
                    Manage blackout dates for holidays or days off
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service Packages */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Your Service Packages</h2>
            <Link href="/cremation/packages" className="text-sm text-[var(--primary-green)] hover:underline">
              Manage packages
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {dashboardData.servicePackages?.length > 0 ? (
            dashboardData.servicePackages.map((pkg: any) => (
              <div key={pkg.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
                <div className="mb-4 h-40 relative overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                  {pkg.images && pkg.images.length > 0 ? (
                    <PackageImage
                      images={pkg.images}
                      alt={pkg.name}
                      size="large"
                      className="w-full h-full object-cover"
                    />
                  ) : pkg.image ? (
                    <PackageImage
                      images={[pkg.image]}
                      alt={pkg.name}
                      size="large"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">No image available</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">{pkg.name}</h3>
                  <span className="text-lg font-semibold text-gray-800">₱{pkg.price.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                <div className="space-y-2">
                  {pkg.inclusions?.map((inclusion: string, i: number) => (
                    <div key={i} className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span>{inclusion}</span>
                    </div>
                  ))}
                  {(!pkg.inclusions || pkg.inclusions.length === 0) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span>{pkg.processingTime} processing time</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 py-6">
              No service packages found. <Link href="/cremation/packages" className="text-[var(--primary-green)] hover:underline">Create one now</Link>.
            </div>
          )}
        </div>
      </div>
    </CremationDashboardLayout>
  );
}

// Wrap with HOC and export
export default withBusinessVerification(CremationDashboardPage);