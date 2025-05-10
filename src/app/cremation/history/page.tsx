'use client';

import { useState } from 'react';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

export default function CremationHistoryPage() {
  const [userName] = useState('Happy Paws Cremation');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Sample history data
  const bookingHistory = [
    {
      id: 'B001',
      petName: 'Max',
      petType: 'Golden Retriever',
      owner: 'John Smith',
      service: 'Private Cremation',
      package: 'Premium Memorial',
      status: 'completed',
      completedDate: 'April 15, 2023',
      revenue: 275,
    },
    {
      id: 'B002',
      petName: 'Luna',
      petType: 'Siamese Cat',
      owner: 'Sarah Johnson',
      service: 'Private Cremation with Memorial',
      package: 'Full Service Memorial',
      status: 'completed',
      completedDate: 'April 14, 2023',
      revenue: 400,
    },
    {
      id: 'B003',
      petName: 'Buddy',
      petType: 'Labrador Retriever',
      owner: 'Robert Williams',
      service: 'Private Cremation',
      package: 'Basic Cremation',
      status: 'cancelled',
      completedDate: 'April 12, 2023',
      revenue: 0,
    },
    {
      id: 'B004',
      petName: 'Bella',
      petType: 'Domestic Shorthair',
      owner: 'Emily Davis',
      service: 'Private Cremation with Paw Print',
      package: 'Premium Memorial',
      status: 'completed',
      completedDate: 'April 10, 2023',
      revenue: 275,
    },
    {
      id: 'B005',
      petName: 'Charlie',
      petType: 'Beagle',
      owner: 'David Wilson',
      service: 'Private Cremation',
      package: 'Full Service Memorial',
      status: 'completed',
      completedDate: 'April 8, 2023',
      revenue: 400,
    },
    {
      id: 'B006',
      petName: 'Oliver',
      petType: 'Maine Coon Cat',
      owner: 'Jennifer Brown',
      service: 'Private Cremation',
      package: 'Premium Memorial',
      status: 'completed',
      completedDate: 'April 5, 2023',
      revenue: 275,
    },
    {
      id: 'B007',
      petName: 'Daisy',
      petType: 'Shih Tzu',
      owner: 'Michael Taylor',
      service: 'Private Cremation with Special Urn',
      package: 'Full Service Memorial',
      status: 'completed',
      completedDate: 'April 3, 2023',
      revenue: 450,
    },
    {
      id: 'B008',
      petName: 'Milo',
      petType: 'Mixed Breed',
      owner: 'Jessica Martinez',
      service: 'Private Cremation',
      package: 'Basic Cremation',
      status: 'completed',
      completedDate: 'April 1, 2023',
      revenue: 150,
    },
  ];

  // Filter bookings based on search term and date filter
  const filteredHistory = bookingHistory.filter(booking => {
    const matchesSearch = 
      booking.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === 'all' || (() => {
      const bookingDate = new Date(booking.completedDate);
      const now = new Date();
      
      if (dateFilter === 'last7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return bookingDate >= sevenDaysAgo;
      } else if (dateFilter === 'last30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return bookingDate >= thirtyDaysAgo;
      } else if (dateFilter === 'last90days') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        return bookingDate >= ninetyDaysAgo;
      }
      
      return true;
    })();
    
    return matchesSearch && matchesDate;
  });

  // Calculate statistics
  const totalRevenue = filteredHistory.reduce((sum, booking) => sum + booking.revenue, 0);
  const completedBookings = filteredHistory.filter(booking => booking.status === 'completed').length;
  const cancelledBookings = filteredHistory.filter(booking => booking.status === 'cancelled').length;
  const averageRevenue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {status}
          </span>
        );
    }
  };

  return (
    <CremationDashboardLayout activePage="history" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Booking History</h1>
            <p className="text-gray-600 mt-1">View and export your past cremation service bookings</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" />
              Export CSV
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 mr-4">
              <CalendarDaysIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{filteredHistory.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <ArrowPathIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{completedBookings}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800 mr-4">
              <CurrencyDollarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${totalRevenue}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-800 mr-4">
              <FunnelIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${averageRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-700 mr-2">Filter by:</p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'all' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
              <button 
                onClick={() => setDateFilter('last7days')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'last7days' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 7 Days
              </button>
              <button 
                onClick={() => setDateFilter('last30days')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'last30days' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 30 Days
              </button>
              <button 
                onClick={() => setDateFilter('last90days')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'last90days' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 90 Days
              </button>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
              placeholder="Search by pet name, owner, or ID..."
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Booking History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pet
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Package
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
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
              {filteredHistory.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.petName}</div>
                    <div className="text-sm text-gray-500">{booking.petType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.owner}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.package}</div>
                    <div className="text-sm text-gray-500">{booking.service}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.completedDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${booking.revenue}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/cremation/bookings/${booking.id}`} className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredHistory.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 text-sm">No booking history found matching your criteria.</p>
            </div>
          )}
        </div>
        
        {/* Pagination (can be implemented later) */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredHistory.length}</span> results
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Previous
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </CremationDashboardLayout>
  );
} 