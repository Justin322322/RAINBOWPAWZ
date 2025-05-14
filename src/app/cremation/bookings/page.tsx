'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  FunnelIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

function CremationBookingsPage({ userData }: { userData: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    totalRevenue: 0
  });
  const { showToast } = useToast();

  // Fetch bookings data when component mounts or search/filter changes
  useEffect(() => {
    const fetchBookings = async () => {
      if (!userData?.business_id) {
        console.log('No business ID found in user data', userData);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams({
          providerId: userData.business_id.toString(),
          status: statusFilter,
          search: searchTerm
        });

        const response = await fetch(`/api/cremation/bookings?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API response not OK:', response.status, errorData);
          throw new Error(`Failed to fetch bookings data: ${response.status} ${errorData.error || ''}`);
        }
        
        const data = await response.json();
        console.log('Bookings data fetched successfully', data);
        
        setBookings(data.bookings || []);
        setStats(data.stats || {
          totalBookings: 0,
          scheduled: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          totalRevenue: 0
        });
      } catch (error) {
        console.error('Error fetching bookings data:', error);
        showToast('Failed to load bookings data. Please try again later.', 'error');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [userData, searchTerm, statusFilter, showToast]);

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled':
      case 'confirmed':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Scheduled
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            In Progress
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
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
    <CremationDashboardLayout activePage="bookings" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Active Bookings</h1>
            <p className="text-gray-600 mt-1">Manage your current cremation service bookings</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search bookings..."
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full mr-4">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-full mr-4">
              <ArrowPathIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
          </div>
        ) : (
          <>
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
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{booking.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.petName}</div>
                      <div className="text-sm text-gray-500">{booking.petType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.owner.name}</div>
                      <div className="text-sm text-gray-500">{booking.owner.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.service}</div>
                      <div className="text-sm text-gray-500">₱{booking.price?.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.scheduledDate}</div>
                      <div className="text-sm text-gray-500">{booking.scheduledTime}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleViewDetails(booking)}
                        className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] mr-3"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 text-sm">No bookings match your search criteria.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking details modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Booking ID</h4>
                <p className="text-base font-medium text-gray-900">#{selectedBooking.id}</p>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Scheduled Date</h4>
                  <p className="text-base text-gray-900">{selectedBooking.scheduledDate}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Scheduled Time</h4>
                  <p className="text-base text-gray-900">{selectedBooking.scheduledTime}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Service</h4>
                  <p className="text-base text-gray-900">{selectedBooking.service}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Price</h4>
                  <p className="text-base text-gray-900">₱{selectedBooking.price?.toLocaleString()}</p>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p className="text-base text-gray-900">{selectedBooking.notes || 'No special notes'}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-base font-medium text-gray-700 mb-2">Pet Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Name</h5>
                  <p className="text-base text-gray-900">{selectedBooking.petName}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Type</h5>
                  <p className="text-base text-gray-900">{selectedBooking.petType}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Size</h5>
                  <p className="text-base text-gray-900">{selectedBooking.petSize}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <h4 className="text-base font-medium text-gray-700 mb-2">Owner Information</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Name</h5>
                  <p className="text-base text-gray-900">{selectedBooking.owner.name}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Contact</h5>
                  <div className="flex items-center mt-1">
                    <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-base text-gray-900">{selectedBooking.owner.phone}</p>
                  </div>
                  <div className="flex items-center mt-1">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-base text-gray-900">{selectedBooking.owner.email}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationBookingsPage); 