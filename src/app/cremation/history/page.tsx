'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import StatCard from '@/components/ui/StatCard';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { StatsCardSkeleton, TableSkeleton } from '@/app/cremation/components/LoadingComponents';

function CremationHistoryPage({ userData }: { userData: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    averageRating: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const retryCountRef = useRef(0);
  const { showToast } = useToast();

  // Effect to filter bookings whenever search term, date filter, or status filter changes
  useEffect(() => {
    if (!bookings) return;

    const filtered = bookings.filter(booking => {
      // Filter by search term
      const matchesSearch = searchTerm === '' ||
        booking.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id?.toString().includes(searchTerm);

      // Filter by status
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    setFilteredBookings(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [bookings, searchTerm, statusFilter]);

  // Function to fetch booking history with retry logic - wrapped in useCallback
  const fetchBookingHistory = useCallback(async (retry = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Add minimum loading delay for better UX (same as admin)
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 600));
      
      const providerId = userData?.business_id || userData?.provider_id || 999;
      
      // Build query parameters including filters
      const queryParams = new URLSearchParams({
        providerId: providerId.toString()
      });
      
      // Add period filter (maps dateFilter to API's expected 'period' parameter)
      if (dateFilter && dateFilter !== 'all') {
        queryParams.append('period', dateFilter);
      }
      
      const dataPromise = fetch(`/api/cremation/history?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      // Wait for both the minimum time and the data
      const [, response] = await Promise.all([minLoadingTime, dataPromise]);

      // Parse the JSON response regardless of status code
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        // Extract error message from the response data
        let errorMessage = `Server error: ${response.status}`;
        if (data && data.error) {
          errorMessage = data.error;
          if (data.details) {
            errorMessage += ` - ${data.details}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      setBookings(data.bookings || []);
      setStats(data.stats || {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0
      });
      
      // Only reset retry count on successful fetch
      if (retryCountRef.current > 0) {
        retryCountRef.current = 0;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking history';
      setError(errorMessage);
      
      showToast(`Error: ${errorMessage}`, 'error');
      
      // Implement retry logic with exponential backoff
      if (retry && retryCountRef.current < 3) {
        const retryDelay = Math.pow(2, retryCountRef.current) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          retryCountRef.current += 1;
          fetchBookingHistory(true);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [userData, showToast, dateFilter]);

  // Fetch booking history when component mounts or date filter changes
  useEffect(() => {
    fetchBookingHistory();
  }, [dateFilter, fetchBookingHistory]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchBookingHistory();
  };

  // Export data as CSV
  const exportAsCSV = () => {
    if (!filteredBookings.length) {
      showToast('No data to export', 'info');
      return;
    }

    try {
      // Define headers
      const headers = [
        'ID',
        'Pet Name',
        'Pet Type',
        'Owner',
        'Service',
        'Status',
        'Date',
        'Price',
        'Payment Method'
      ].join(',');

      // Map data to CSV rows
      const rows = filteredBookings.map(booking => [
        booking.id,
        `"${booking.petName || ''}"`,
        `"${booking.petType || ''}"`,
        `"${booking.owner || ''}"`,
        `"${booking.package || ''}"`,
        `"${booking.status || ''}"`,
        `"${booking.createdAt || ''}"`,
        booking.price || 0,
        `"${booking.paymentMethod || 'Not specified'}"`
      ].join(','));

      // Combine headers and rows
      const csv = [headers, ...rows].join('\n');

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `cremation-history-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      showToast('Failed to export CSV', 'error');
    }
  };

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

  // Pagination logic
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBookings.length);
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{filteredBookings.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* Page numbers */}
              {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    page === currentPage
                      ? 'bg-[var(--primary-green)] text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-green)]'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <CremationDashboardLayout activePage="history" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Booking History</h1>
            <p className="text-gray-600 mt-1">View and export your past cremation service bookings</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={exportAsCSV}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          // Using standardized stats card skeleton - same as admin
          <StatsCardSkeleton count={4} />
        ) : (
          <>
            <StatCard
              icon={<CalendarDaysIcon />}
              label="Total Bookings"
              value={stats.totalBookings.toString()}
              color="blue"
            />
            <StatCard
              icon={<CheckCircleIcon />}
              label="Completed"
              value={stats.completedBookings.toString()}
              color="green"
            />
            <StatCard
              icon={<XCircleIcon />}
              label="Cancelled"
              value={stats.cancelledBookings.toString()}
              color="yellow"
            />
            <StatCard
              icon={<CurrencyDollarIcon />}
              label="Total Revenue"
              value={`₱${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Filter controls */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search filter */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search by pet name, owner..."
              />
            </div>
          </div>

          {/* Date range filter */}
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            >
              <option value="all">All Time</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="last6months">Last 6 Months</option>
              <option value="thisyear">This Year</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="in_progress">In Progress</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Booking History</h2>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchBookingHistory()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Retry
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
                : statusFilter !== 'all'
                ? 'Try changing the status filter to see more results.'
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
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{booking.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {booking.petImageUrl ? (
                            <Image
                              className="h-10 w-10 rounded-full object-cover"
                              src={booking.petImageUrl}
                              alt={booking.petName || 'Pet'}
                              width={40}
                              height={40}
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/icons/pet-placeholder.png';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-xs">{booking.petName?.charAt(0) || '?'}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{booking.petName || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{booking.petType || 'Not specified'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.owner || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{booking.owner?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.package || 'Unknown Service'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.createdAt}</div>
                      <div className="text-sm text-gray-500">{booking.scheduledDate !== 'Not scheduled' ? booking.scheduledDate : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.amount > 0
                          ? `₱${booking.amount.toLocaleString()}`
                          : booking.price > 0
                            ? `₱${booking.price.toLocaleString()}`
                            : booking.status === 'completed' || booking.status === 'paid'
                              ? 'Paid'
                              : 'Not specified'}
                      </div>
                      <div className="text-sm text-gray-500">{booking.paymentMethod || 'Not specified'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/cremation/bookings/${booking.id}`}
                        className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] inline-flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination component */}
            {renderPagination()}
          </div>
        )}
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationHistoryPage);
