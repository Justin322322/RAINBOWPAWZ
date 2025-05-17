'use client';

import { useState, useEffect } from 'react';
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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { PackageImage } from '@/components/packages/PackageImage';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import { useRouter } from 'next/navigation';

// The actual component that will be wrapped by withBusinessVerification HOC
function CremationDashboardPage({ userData }: { userData: any }) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
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
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
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
                You don't have any bookings yet. When customers book your services, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Customer stats or availability toggle */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-800">Manage Availability</h2>
            {availabilitySetupNeeded ? (
              <button
                onClick={toggleAvailabilitySection} 
                className="px-4 py-2 border border-[var(--primary-green)] text-[var(--primary-green)] rounded-md hover:bg-[var(--primary-green-light)]"
              >
                {showAvailabilitySection ? 'Hide Calendar' : 'Show Calendar'}
              </button>
            ) : (
              <button
                onClick={toggleAvailabilitySection} 
                className="px-4 py-2 border border-[var(--primary-green)] text-[var(--primary-green)] rounded-md hover:bg-[var(--primary-green-light)]"
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
                Click the "Set Up Calendar" button above to create the necessary tables.
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
                  <span className="text-lg font-semibold text-gray-800">₱{pkg.price.toLocaleString()}</span>
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