'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  CalendarIcon, 
  StarIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function CremationDashboardPage() {
  const [userName] = useState('Happy Paws Cremation');
  
  // Sample stats data
  const stats = [
    {
      name: 'Total Revenue',
      value: '$5,240',
      change: '+12%',
      changeType: 'increase',
      icon: CurrencyDollarIcon,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    },
    {
      name: 'New Clients',
      value: '24',
      change: '+8%',
      changeType: 'increase',
      icon: UsersIcon,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Active Bookings',
      value: '12',
      change: '-3%',
      changeType: 'decrease',
      icon: CalendarIcon,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Service Rating',
      value: '4.8/5',
      change: '+0.2',
      changeType: 'increase',
      icon: StarIcon,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
  ];

  // Recent bookings data
  const recentBookings = [
    {
      id: 'B001',
      petName: 'Max',
      petType: 'Golden Retriever',
      owner: 'John Smith',
      service: 'Private Cremation',
      status: 'Scheduled',
      date: 'May 15, 2023',
      statusColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'B002',
      petName: 'Luna',
      petType: 'Siamese Cat',
      owner: 'Sarah Johnson',
      service: 'Private Cremation with Memorial',
      status: 'In Progress',
      date: 'May 14, 2023',
      statusColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'B003',
      petName: 'Bella',
      petType: 'Domestic Shorthair',
      owner: 'Michael Brown',
      service: 'Private Cremation with Paw Print',
      status: 'Completed',
      date: 'May 12, 2023',
      statusColor: 'bg-green-100 text-green-800'
    },
  ];

  return (
    <CremationDashboardLayout activePage="dashboard" userName={userName}>
      {/* Welcome section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Welcome back, {userName}</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your cremation services today.</p>
          </div>
          <div>
            <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 flex items-center">
              <span className="mr-2">Add New Package</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className={`${stat.bgColor} p-3 rounded-full mr-4`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
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
        ))}
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
              {recentBookings.map((booking) => (
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
          <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Basic Cremation</h3>
              <span className="text-lg font-semibold text-gray-800">$150</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Individual pet cremation with basic wooden urn.</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Private cremation</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Basic wooden urn</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Certificate of cremation</span>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Premium Memorial</h3>
              <span className="text-lg font-semibold text-gray-800">$275</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Enhanced service with custom urn and keepsakes.</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Private cremation</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Premium custom urn</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Paw print keepsake</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Memorial certificate</span>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Full Service Memorial</h3>
              <span className="text-lg font-semibold text-gray-800">$400</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Comprehensive service with private viewing ceremony.</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Private cremation</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Luxury personalized urn</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Private farewell ceremony</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Memorial photo frame</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span>Personalized memorial book</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CremationDashboardLayout>
  );
} 