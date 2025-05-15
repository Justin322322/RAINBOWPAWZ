'use client';

import { useState, useEffect } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  FireIcon,
  QueueListIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  XMarkIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { PackageImage } from '@/components/packages/PackageImage';

export default function AdminServicesPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  // Add state for real data
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({
    message: '',
    type: null
  });
  const [stats, setStats] = useState({
    activeServices: 0,
    totalBookings: 0,
    verifiedCenters: 0,
    monthlyRevenue: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());

        const response = await fetch(`/api/admin/services/listing?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          setServices(data.services || []);
          setPagination(data.pagination || pagination);

          // Calculate stats
          const activeCount = data.services.filter((s: any) => s.status === 'active').length;
          const totalBookings = data.services.reduce((sum: number, s: any) => sum + (s.bookings || 0), 0);
          const uniqueProviders = new Set(data.services.map((s: any) => s.providerId)).size;
          const totalRevenue = data.services.reduce((sum: number, s: any) => sum + (s.priceValue || 0) * (s.bookings || 0), 0);

          setStats({
            activeServices: activeCount,
            totalBookings,
            verifiedCenters: uniqueProviders,
            monthlyRevenue: totalRevenue / 12 // Rough estimate for monthly revenue
          });
        } else {
          const errorMsg = data.error || 'Failed to fetch services';
          setError(errorMsg);
          setNotification({
            message: errorMsg,
            type: 'error'
          });
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMsg);
        setNotification({
          message: 'Failed to load services. Please try again.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [searchTerm, statusFilter, categoryFilter, pagination.page, pagination.limit]);

  // Filter services based on search term, status filter, and category filter
  const filteredServices = services.filter(service => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.cremationCenter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleViewDetails = (service: any) => {
    setSelectedService(service);
    setShowDetailsModal(true);
  };

  // Get status badge based on service status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Inactive
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
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

  // Get category badge
  const getCategoryBadge = (category: string) => {
    switch(category) {
      case 'individual':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Individual
          </span>
        );
      case 'premium':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            Premium
          </span>
        );
      case 'communal':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
            Communal
          </span>
        );
      case 'service':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
            Service
          </span>
        );
      case 'memorial':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
            Memorial
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {category}
          </span>
        );
    }
  };

  // Helper function to render image or placeholder
  const renderServiceImage = (service: any, large: boolean = false) => {
    // Check if service has an image
    if (!service.image || imageError[service.id]) {
      return (
        <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${large ? 'rounded-lg' : ''}`}>
          <div className="text-center p-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No Image Available</p>
          </div>
        </div>
      );
    }

    // Get the image path
    const imagePath = service.image.startsWith('http')
      ? service.image
      : `/uploads/${service.image}`;

    // Create an array of images if service has multiple images
    const images = service.images || [imagePath];

    return (
      <div className="relative w-full h-full">
        {large ? (
          <PackageImage
            images={images}
            alt={service.name}
            size="large"
            className="object-cover"
            onError={() => {
              setImageError(prev => ({ ...prev, [service.id]: true }));
            }}
          />
        ) : (
          <Image
            src={imagePath}
            alt={service.name}
            fill
            className="object-cover"
            onError={() => {
              setImageError(prev => ({ ...prev, [service.id]: true }));
            }}
          />
        )}
      </div>
    );
  };

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification.type) {
      const timer = setTimeout(() => {
        setNotification({ message: '', type: null });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <AdminDashboardLayout activePage="services" userName={userName}>
      {/* Notification */}
      {notification.type && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center ${
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {notification.type === 'error' ? (
            <ExclamationCircleIcon className="h-5 w-5 mr-2 text-red-500" />
          ) : (
            <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification({ message: '', type: null })}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Active Services</h1>
            <p className="text-gray-600 mt-1">Monitor and manage cremation services offered by providers</p>
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
                placeholder="Search services..."
              />
            </div>
            <div className="flex space-x-3">
              <div className="relative flex-grow">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="relative flex-grow">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
                >
                  <option value="all">All Categories</option>
                  <option value="individual">Individual</option>
                  <option value="premium">Premium</option>
                  <option value="communal">Communal</option>
                  <option value="service">Service</option>
                  <option value="memorial">Memorial</option>
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
      </div>

      {/* Service Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <FireIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Services</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeServices}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
              <QueueListIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-800 mr-4">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Service Providers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.verifiedCenters}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 text-amber-800 mr-4">
              <BanknotesIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">₱{Math.round(stats.monthlyRevenue).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="p-3 rounded-full bg-gray-200 animate-pulse inline-flex">
            <div className="h-12 w-12"></div>
          </div>
          <p className="text-gray-500 text-lg mt-4">Loading services...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredServices.map((service) => (
              <div key={service.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="w-full h-48 relative">
                  <div className="absolute top-2 right-2 z-10">
                    {getStatusBadge(service.status)}
                  </div>
                  <div className="absolute top-2 left-2 z-10">
                    {getCategoryBadge(service.category)}
                  </div>
                  {renderServiceImage(service)}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                    <p className="font-bold text-[var(--primary-green)]">{service.price}</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{service.cremationCenter}</p>
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`h-4 w-4 ${i < Math.floor(service.rating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-gray-600 ml-1">{service.rating}</span>
                    </div>
                    <span className="text-xs text-gray-600">{service.bookings} bookings</span>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => handleViewDetails(service)}
                      className="px-3 py-1.5 bg-[var(--primary-green)] text-white text-sm rounded-lg flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredServices.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-gray-500 text-lg">No services match your search criteria.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8 mb-8">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1 rounded-md ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Previous
                </button>

                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Only show a few page numbers around the current page
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`px-3 py-1 rounded-md ${
                          pagination.page === pageNum
                            ? 'bg-[var(--primary-green)] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }

                  // Show ellipsis for skipped pages
                  if (
                    (pageNum === 2 && pagination.page > 3) ||
                    (pageNum === pagination.totalPages - 1 && pagination.page < pagination.totalPages - 2)
                  ) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }

                  return null;
                })}

                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1 rounded-md ${
                    pagination.page === pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      {/* Service Details Modal */}
      {showDetailsModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Service Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <div className="w-full h-64 rounded-lg overflow-hidden relative mb-4">
                    {renderServiceImage(selectedService, true)}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                      <div>{getStatusBadge(selectedService.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Category</p>
                      <div>{getCategoryBadge(selectedService.category)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Price</p>
                      <p className="text-lg font-semibold text-[var(--primary-green)]">{selectedService.price}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Rating</p>
                      <div className="flex items-center">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`h-4 w-4 ${i < Math.floor(selectedService.rating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 ml-2">{selectedService.rating} ({selectedService.bookings} bookings)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:w-2/3">
                  <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-1">{selectedService.name}</h3>
                    <p className="text-[var(--primary-green)] font-medium">{selectedService.cremationCenter}</p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700">{selectedService.description}</p>
                  </div>

                  {selectedService.cremationType && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Cremation Type</h4>
                      <p className="text-gray-700">{selectedService.cremationType}</p>
                    </div>
                  )}

                  {selectedService.processingTime && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Processing Time</h4>
                      <p className="text-gray-700">{selectedService.processingTime}</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Features</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedService.features && selectedService.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedService.addOns && selectedService.addOns.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Add-ons</h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedService.addOns.map((addon: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-gray-700">{addon}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedService.conditions && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Conditions</h4>
                      <p className="text-gray-700">{selectedService.conditions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8 border-t pt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <Link
                  href={`/admin/services/${selectedService.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                  View Full Details
                </Link>
                {selectedService.status === 'active' ? (
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Deactivate Service
                  </button>
                ) : (
                  <button
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
                  >
                    Activate Service
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}