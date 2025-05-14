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
      
      const response = await fetch(`/api/cremation/history?period=${periodParam}&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Parse the JSON response regardless of status code
      const data = await response.json();
      
      if (!response.ok) {
        // Use the specific error message from the API if available
        const errorMessage = data.message || data.error || 'Failed to fetch booking history';
        console.error('API Error:', errorMessage, data);
        throw new Error(errorMessage);
      }
      
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
    const matchesSearch = 
      booking.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
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
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 min-w-[90px] justify-center">
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
            <p className="text-sm font-medium text-gray-700 mr-2">Filter by:</p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateFilter === 'all' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
              <button 
                onClick={() => setDateFilter('last7days')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateFilter === 'last7days' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 7 Days
              </button>
              <button 
                onClick={() => setDateFilter('last30days')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateFilter === 'last30days' 
                    ? 'bg-[var(--primary-green)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 30 Days
              </button>
              <button 
                onClick={() => setDateFilter('last90days')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
              placeholder="Search bookings..."
            />
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Data</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-opacity-90"
            >
              Try Again
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Bookings Found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'No bookings match your search criteria. Try different search terms.' 
                : 'No booking history found for the selected time period.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pet Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[var(--primary-green)]">
                        <Link href={`/cremation/bookings/${booking.id}`} className="hover:underline">
                          #{booking.id}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.petName}</div>
                      <div className="text-xs text-gray-500">{booking.petType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.owner}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.completedDate || booking.bookingDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${booking.revenue > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {booking.revenue > 0 ? `₱${booking.revenue.toLocaleString()}` : '-'}
                      </div>
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