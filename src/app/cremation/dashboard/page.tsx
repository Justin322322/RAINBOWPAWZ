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
  ClockIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { PackageImage } from '@/components/packages/PackageImage';

// The actual component that will be wrapped by withBusinessVerification HOC
function CremationDashboardPage({ userData }: { userData: any }) {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: [],
    recentBookings: [],
    servicePackages: []
  });
  const { showToast } = useToast();

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
        console.log('No business ID found in user data', userData);
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching dashboard data for provider ID:', userData.business_id);
        // Add cache busting parameter to prevent cached results
        const response = await fetch(`/api/cremation/dashboard?providerId=${userData.business_id}&t=${Date.now()}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API response not OK:', response.status, errorData);
          throw new Error(`Failed to fetch dashboard data: ${response.status} ${errorData.error || ''}`);
        }
        
        const data = await response.json();
        console.log('Dashboard data fetched successfully', data);
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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

  // This console.log should always happen when rendering to verify we're using this component correctly
  console.log('Rendering cremation dashboard page with userData:', userData?.id);

  return (
    <CremationDashboardLayout activePage="dashboard" userData={userData}>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
        </div>
      ) : (
        <>
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

          {/* Recent Bookings */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-800">Recent Bookings</h2>
                <Link href="/cremation/bookings" className="text-sm text-[var(--primary-green)] hover:underline">
                  View all
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              {dashboardData.recentBookings?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pet
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Owner
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.recentBookings.map((booking: any) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{booking.petName}</div>
                              <div className="text-sm text-gray-500">{booking.petType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.owner}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.service}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.date}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.statusColor}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <Link href={`/cremation/bookings/${booking.id}`} className="text-[var(--primary-green)] hover:underline">
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No recent bookings found
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
        </>
      )}
    </CremationDashboardLayout>
  );
}

// Wrap with HOC and export
export default withBusinessVerification(CremationDashboardPage);