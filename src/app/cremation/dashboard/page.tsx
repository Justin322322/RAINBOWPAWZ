'use client';

import { useState, useEffect } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import {
  CalendarIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { PackageImage } from '@/components/packages/PackageImage';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/ui/StatCard';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

// The actual component that will be wrapped by withBusinessVerification HOC
function CremationDashboardPage({ userData }: { userData: any }) {
  const router = useRouter();
  const _userName = userData?.business_name || userData?.first_name || 'Cremation Provider';
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: [
      { name: 'Total Bookings', value: '0', change: '0%', changeType: 'increase' },
      { name: 'Pending Bookings', value: '0', change: '0%', changeType: 'increase' },
      { name: 'Active Packages', value: '0', change: '0%', changeType: 'increase' },
      { name: 'Monthly Revenue', value: '₱0.00', change: '0%', changeType: 'increase' }
    ]
  });
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Availability calendar state
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySetupNeeded, setAvailabilitySetupNeeded] = useState(false);
  const [showAvailabilitySection, setShowAvailabilitySection] = useState(false);

  // Define stats configuration - matching admin dashboard pattern
  const statsConfig = [
    {
      key: 'total',
      name: 'Total Bookings',
      icon: CalendarIcon,
      color: 'blue',
    },
    {
      key: 'pending',
      name: 'Pending Bookings',
      icon: ClockIcon,
      color: 'yellow',
    },
    {
      key: 'active',
      name: 'Active Packages',
      icon: ArchiveBoxIcon,
      color: 'purple',
    },
    {
      key: 'revenue',
      name: 'Monthly Revenue',
      icon: BanknotesIcon,
      color: 'amber',
    },
  ];

  // Fetch dashboard data - simplified like admin
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Add the required providerId parameter like the original code
        const providerId = userData?.business_id || userData?.provider_id || 999;
        
        // Simplified API call with providerId
        const response = await fetch(`/api/cremation/dashboard?providerId=${providerId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status}`);
        }

        const result = await response.json();
        
        // The cremation dashboard API returns data directly, not wrapped in a success object
        if (result.error) {
          setError(result.error || 'Failed to fetch dashboard data');
        } else {
          // API returns data directly with stats array
          setDashboardData(result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        // Set default data
        setDashboardData({
          stats: [
            { name: 'Total Bookings', value: '0', change: '0%', changeType: 'increase' },
            { name: 'Pending Bookings', value: '0', change: '0%', changeType: 'increase' },
            { name: 'Active Packages', value: '0', change: '0%', changeType: 'increase' },
            { name: 'Monthly Revenue', value: '₱0.00', change: '0%', changeType: 'increase' }
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]); // Add userData as dependency since we use it for providerId

  // Check availability tables after initial loading
  useEffect(() => {
    if (!userData?.business_id || isLoading) return;

    const checkAvailabilityTables = async () => {
      try {
        const response = await fetch('/api/cremation/availability?providerId=' + userData.business_id);

        if (response.status === 500) {
          setAvailabilitySetupNeeded(true);
          setAvailabilityError('Database tables for availability calendar need to be set up.');
        } else {
          setAvailabilitySetupNeeded(false);
          setAvailabilityError(null);
        }
      } catch (_error) {
        setAvailabilitySetupNeeded(true);
        setAvailabilityError('Could not check if availability tables exist.');
      }
    };

    checkAvailabilityTables();
  }, [userData, isLoading]);

  // Handle availability changes (called when calendar data is fetched or updated)
  const handleAvailabilityChange = (_availability: any) => {
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

  return (
    <CremationDashboardLayout activePage="dashboard" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your pet cremation business</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          // Using standardized skeleton loader - exact same as admin
          Array(4).fill(0).map((_, index) => (
            <SkeletonCard
              key={index}
              withHeader={true}
              contentLines={1}
              withFooter={false}
              withShadow={true}
              rounded="lg"
              animate={true}
            />
          ))
        ) : error ? (
          // Error state - exact same as admin
          <div className="col-span-4 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <ExclamationCircleIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-red-600 font-medium text-center mb-2">Error loading dashboard data</p>
            <p className="text-gray-500 text-sm text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          // Actual stats - simplified to match admin pattern
          statsConfig.map((stat, index) => {
            // Map the stat keys to exact API names
            const statNameMap = {
              'total': 'Total Bookings',
              'pending': 'Active Bookings', 
              'active': 'Active Packages',
              'revenue': 'Monthly Revenue'
            };
            
            const apiStatName = statNameMap[stat.key as keyof typeof statNameMap];
            const statData = dashboardData.stats?.find((s: any) =>
              s.name === apiStatName
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

      {/* Main Content Grid - 2x2 Equal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Bookings */}
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
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[var(--primary-green)]"></div>
              <p className="mt-4 text-gray-600 text-sm">Loading bookings...</p>
            </div>
          ) : dashboardData.recentBookings?.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {dashboardData.recentBookings.slice(0, 3).map((booking: any, _index: number) => (
                <li key={booking.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-4">
                        {booking.status === 'pending' && (
                          <span className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                            <ClockIcon className="h-4 w-4 text-yellow-600" />
                          </span>
                        )}
                        {booking.status === 'completed' && (
                          <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          </span>
                        )}
                        {booking.status !== 'pending' && booking.status !== 'completed' && (
                          <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <CalendarIcon className="h-4 w-4 text-blue-600" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.petName || 'Unknown Pet'}</div>
                        <div className="text-xs text-gray-500">{booking.scheduledDate || 'Not scheduled'}</div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
              <p className="text-gray-500 text-center max-w-xs mt-1 text-sm">
                You don&apos;t have any bookings yet.
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
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[var(--primary-green)]"></div>
              <p className="mt-4 text-gray-600 text-sm">Loading reviews...</p>
            </div>
          ) : dashboardData.detailedStats?.avgRating === '0.0' ? (
            <div className="p-6 text-center">
              <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No reviews yet. Reviews will appear here when customers rate their experience.</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center bg-yellow-100 px-4 py-2 rounded-full">
                  <StarIcon className="h-6 w-6 text-yellow-500 mr-2" />
                  <span className="text-xl font-medium">{dashboardData.detailedStats?.avgRating || '0.0'}</span>
                </div>
              </div>
              <p className="text-center text-gray-600 mb-4 text-sm">
                Check your reviews page to see what customers are saying about your services.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/cremation/reviews')}
                  className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] text-sm"
                >
                  View All Reviews
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Availability Calendar */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Manage Availability</h2>
            <button
              onClick={toggleAvailabilitySection}
              className="px-3 py-1 border border-[var(--primary-green)] text-[var(--primary-green)] rounded text-xs hover:bg-[var(--primary-green-bg)] transition-colors duration-300"
            >
              {showAvailabilitySection ? 'Hide' : 'Show'}
            </button>
          </div>

          {availabilitySetupNeeded ? (
            <div className="p-6 text-center">
              <ExclamationCircleIcon className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Setup Required</h3>
              <p className="text-yellow-700 text-xs mb-4">
                Calendar tables need setup. Click {'"'}Show{'"'} to create them.
              </p>
            </div>
          ) : showAvailabilitySection ? (
            <div className="p-4">
              {availabilityError ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded mb-4 text-xs">
                  <div className="flex">
                    <ExclamationCircleIcon className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{availabilityError}</span>
                  </div>
                </div>
              ) : null}
              <div className="w-full">
                <AvailabilityCalendar
                  providerId={userData?.business_id || 0}
                  onAvailabilityChange={handleAvailabilityChange}
                  onSaveSuccess={handleSaveSuccess}
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center mb-4">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-4">
                  Manage your booking availability and time slots.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start">
                  <span className="text-[var(--primary-green)] mr-2">•</span>
                  Set available days
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--primary-green)] mr-2">•</span>
                  Configure time slots
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--primary-green)] mr-2">•</span>
                  Manage blackout dates
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Service Packages */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-800">Your Service Packages</h2>
              <button
                onClick={() => router.push('/cremation/packages')}
                className="text-sm text-[var(--primary-green)] hover:underline"
              >
                Manage packages
              </button>
            </div>
          </div>
          <div className="p-4 h-80 overflow-y-auto">
            {dashboardData.servicePackages?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.servicePackages.slice(0, 2).map((pkg: any) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {pkg.images && pkg.images.length > 0 ? (
                          <PackageImage
                            images={pkg.images}
                            alt={pkg.name}
                            size="small"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : pkg.image ? (
                          <PackageImage
                            images={[pkg.image]}
                            alt={pkg.name}
                            size="small"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-gray-400 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-medium text-gray-800 truncate">{pkg.name}</h3>
                          <span className="text-sm font-semibold text-gray-800 ml-2">₱{pkg.price.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{pkg.description}</p>
                        <div className="text-xs text-gray-600">
                          {pkg.inclusions?.length > 0 ? (
                            <span>{pkg.inclusions.length} inclusions</span>
                          ) : (
                            <span>{pkg.processingTime} processing time</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {dashboardData.servicePackages.length > 2 && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => router.push('/cremation/packages')}
                      className="text-xs text-[var(--primary-green)] hover:underline"
                    >
                      View {dashboardData.servicePackages.length - 2} more packages
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ArchiveBoxIcon className="h-12 w-12 text-gray-400 mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No service packages</h3>
                <p className="text-xs text-gray-500 mb-3">Create packages for your cremation services</p>
                <button
                  onClick={() => router.push('/cremation/packages')}
                  className="text-xs text-[var(--primary-green)] hover:underline"
                >
                  Create your first package
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </CremationDashboardLayout>
  );
}

// Wrap with HOC and export
export default withBusinessVerification(CremationDashboardPage);