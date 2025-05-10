'use client';

import { useState } from 'react';
import Link from 'next/link';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
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

export default function CremationBookingsPage() {
  const [userName] = useState('Happy Paws Cremation');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Sample booking data
  const bookings = [
    {
      id: 'B001',
      petName: 'Max',
      petType: 'Golden Retriever',
      petSize: 'Large (65 lbs)',
      owner: {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567'
      },
      service: 'Private Cremation',
      package: 'Premium Memorial',
      status: 'scheduled',
      scheduledDate: 'May 15, 2023',
      scheduledTime: '10:00 AM',
      notes: 'Owner requests private viewing before cremation.',
      price: 275,
      createdAt: 'May 12, 2023'
    },
    {
      id: 'B002',
      petName: 'Luna',
      petType: 'Siamese Cat',
      petSize: 'Small (8 lbs)',
      owner: {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        phone: '(555) 987-6543'
      },
      service: 'Private Cremation with Memorial',
      package: 'Full Service Memorial',
      status: 'in_progress',
      scheduledDate: 'May 14, 2023',
      scheduledTime: '2:00 PM',
      notes: 'Special engraving requested for memorial.',
      price: 400,
      createdAt: 'May 10, 2023'
    },
    {
      id: 'B003',
      petName: 'Rocky',
      petType: 'Labrador Mix',
      petSize: 'Medium (45 lbs)',
      owner: {
        name: 'Michael Brown',
        email: 'mbrown@example.com',
        phone: '(555) 456-7890'
      },
      service: 'Private Cremation',
      package: 'Basic Cremation',
      status: 'pending',
      scheduledDate: 'May 16, 2023',
      scheduledTime: '1:00 PM',
      notes: 'Needs confirmation from owner.',
      price: 150,
      createdAt: 'May 13, 2023'
    },
    {
      id: 'B004',
      petName: 'Bella',
      petType: 'Domestic Shorthair',
      petSize: 'Small (7 lbs)',
      owner: {
        name: 'Emily Davis',
        email: 'emilyd@example.com',
        phone: '(555) 789-0123'
      },
      service: 'Private Cremation with Paw Print',
      package: 'Premium Memorial',
      status: 'completed',
      scheduledDate: 'May 12, 2023',
      scheduledTime: '11:30 AM',
      notes: 'Waiting for pickup.',
      price: 275,
      createdAt: 'May 8, 2023'
    },
    {
      id: 'B005',
      petName: 'Charlie',
      petType: 'Beagle',
      petSize: 'Medium (25 lbs)',
      owner: {
        name: 'David Wilson',
        email: 'dwilson@example.com',
        phone: '(555) 234-5678'
      },
      service: 'Private Cremation',
      package: 'Full Service Memorial',
      status: 'cancelled',
      scheduledDate: 'May 11, 2023',
      scheduledTime: '9:00 AM',
      notes: 'Cancelled by owner - family decided on home burial.',
      price: 400,
      createdAt: 'May 7, 2023'
    }
  ];

  // Filter bookings based on search term and status filter
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled':
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
    <CremationDashboardLayout activePage="bookings" userName={userName}>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search bookings..."
              />
            </div>
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">18</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800 mr-4">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-semibold text-gray-900">5</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 mr-4">
              <ArrowPathIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">3</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <CheckIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">10</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Current Bookings</h2>
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
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.petName}</div>
                    <div className="text-sm text-gray-500">{booking.petType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.owner.name}</div>
                    <div className="text-sm text-gray-500">{booking.owner.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.service}</div>
                    <div className="text-sm text-gray-500">${booking.price}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.scheduledDate}</div>
                    <div className="text-sm text-gray-500">{booking.scheduledTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(booking)}
                      className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline mr-4"
                    >
                      View
                    </button>
                    <Link href={`/cremation/bookings/${booking.id}/edit`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                      Update
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBookings.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 text-sm">No bookings match your search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Booking Details</h2>
              <button 
                onClick={() => setShowDetailsModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Pet Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Pet Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Name</p>
                          <p className="text-base text-gray-900">{selectedBooking.petName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Type</p>
                          <p className="text-base text-gray-900">{selectedBooking.petType}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Size</p>
                          <p className="text-base text-gray-900">{selectedBooking.petSize}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Service Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Service Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Service</p>
                          <p className="text-base text-gray-900">{selectedBooking.service}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Package</p>
                          <p className="text-base text-gray-900">{selectedBooking.package}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Price</p>
                          <p className="text-base text-gray-900">${selectedBooking.price}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Owner Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Owner Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Name</p>
                          <p className="text-base text-gray-900">{selectedBooking.owner.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Contact</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <PhoneIcon className="h-4 w-4 text-gray-500" />
                            <p className="text-base text-gray-900">{selectedBooking.owner.phone}</p>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                            <p className="text-base text-gray-900">{selectedBooking.owner.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Schedule Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Schedule</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="text-base text-gray-900">{selectedBooking.scheduledDate}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Time</p>
                          <p className="text-base text-gray-900">{selectedBooking.scheduledTime}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Created</p>
                          <p className="text-base text-gray-900">{selectedBooking.createdAt}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {selectedBooking.notes && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-base text-gray-900">{selectedBooking.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8">
                <Link 
                  href={`/cremation/bookings/${selectedBooking.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit Booking
                </Link>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-opacity-90">
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
} 