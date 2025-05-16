'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

function CremationHistoryPage({ userData }: { userData: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageRevenue: 0
  });
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  // Function to fetch booking history with retry logic
  const fetchBookingHistory = async (retry = false) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Make sure we're using the correct period format based on the dateFilter value
      let periodParam = dateFilter;
      if (dateFilter === 'last7days') periodParam = 'last7days';
      else if (dateFilter === 'last30days') periodParam = 'last30days';
      else if (dateFilter === 'last90days') periodParam = 'last90days';
      else periodParam = 'all';
      
      console.log(`Fetching history data with period: ${periodParam}`);
      const response = await fetch(`/api/cremation/history?period=${periodParam}&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Parse the JSON response regardless of status code
      const data = await response.json();
      console.log(`Response status: ${response.status}`, data);
      
      if (!response.ok) {
        // Use the specific error message from the API if available
        const errorMessage = data.message || data.error || 'Failed to fetch booking history';
        console.error('API Error:', errorMessage, data);
        throw new Error(errorMessage);
      }
      
      console.log(`Received ${data.bookings?.length || 0} bookings`);
      
      setBookings(data.bookings || []);
      setStats(data.stats || {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        averageRevenue: 0
      });
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching booking history:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
      
      // Only show toast once per fetch attempt
      if (!retry) {
        showToast(error instanceof Error ? error.message : 'Failed to load booking history. Please try again.', 'error');
      }
      
      // Auto-retry logic (max 2 retries)
      if (retry && retryCount < 2) {
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          fetchBookingHistory(true);
        }, 2000); // Wait 2 seconds before retrying
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking history when component mounts or date filter changes
  useEffect(() => {
    fetchBookingHistory();
  }, [dateFilter]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchBookingHistory();
  };

  // Filter bookings based on search term
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return booking.petName?.toLowerCase().includes(searchLower) ||
           booking.owner?.toLowerCase().includes(searchLower) ||
           booking.id?.toString().includes(searchLower) ||
           booking.package?.toLowerCase().includes(searchLower);
  });

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
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            Confirmed
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            In Progress
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

  const handleExportCSV = () => {
    // Export functionality would go here
    showToast('Export functionality is not yet implemented', 'info');
  };

  return (
    <CremationDashboardLayout activePage="history" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Booking History</h1>
            <p className="text-gray-600 mt-1">View and export your past cremation service bookings</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button 
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" />
              Export CSV
            </button>
            <button 
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link 
              href="/cremation/reports" 
              className="inline-flex items-center px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Reports
            </Link>
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
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{stats.completedBookings}</p>
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
              <p className="text-2xl font-semibold text-gray-900">₱{stats.totalRevenue.toLocaleString()}</p>
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
              <p className="text-2xl font-semibold text-gray-900">₱{stats.averageRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                dateFilter === 'all'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('last7days')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                dateFilter === 'last7days'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('last30days')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                dateFilter === 'last30days'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateFilter('last90days')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                dateFilter === 'last90days'
                  ? 'bg-[var(--primary-green)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 90 Days
            </button>
          </div>
          <div className="relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
              placeholder="Search by pet or owner..."
            />
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Booking History</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Try Again
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-gray-400 mb-4">
              <CalendarDaysIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No booking history found</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm
                ? 'Try changing your search term to see more results.'
                : dateFilter !== 'all'
                ? 'Try changing the date filter to see more results.'
                : 'There are no completed or cancelled bookings to display at this time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pet Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">#{booking.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.petName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{booking.petType || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-[200px]">{booking.owner || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.package || 'Unknown Package'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.date || 'Not scheduled'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status || 'pending')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ₱{parseFloat(booking.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/cremation/bookings/${booking.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationHistoryPage); 