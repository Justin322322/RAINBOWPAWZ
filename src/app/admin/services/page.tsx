'use client';

import { useState, useEffect } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
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
import { LoadingSpinner, EmptyState } from './client';

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
          // Process service images to ensure they're consistent
          
          // Find what image files exist in the uploads directory
          try {
            fetch('/api/packages/available-images')
              .then(resp => resp.json())
              .then(imgData => {
                // Store available images in a cookie for the PackageImage component to use
                if (imgData.images) {
                  document.cookie = `packageFiles=${JSON.stringify(imgData.images)}; path=/; max-age=300`;
                }
              })
          } catch (e) {
          }
          
          const servicesWithImages = data.services.map((service: any) => {
            // Reset error state for all services
            setImageError(prev => ({ ...prev, [service.id]: false }));
            
            // Ensure that images is always an array
            const images = service.images && Array.isArray(service.images) && service.images.length > 0
              ? service.images 
              : service.image && typeof service.image === 'string'
                ? [service.image]
                : [];

            // Remove default sample image fallback — show placeholder when no images provided
            
            return {
              ...service,
              image: images.length > 0 ? images[0] : null, // Set primary image or null
              images: images    // Set images array (empty if none)
            };
          });
          
          setServices(servicesWithImages || []);
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
    // Create a proper images array for the PackageImage component
    let images: string[] = [];
    
    // Add images from service.images array if it exists
    if (service.images && service.images.length > 0) {
      images = [...service.images];
    }
    
    // Add the main image if it exists and isn't already in the images array
    if (service.image) {
      // Process the path correctly
      const imagePath = service.image.startsWith('http') 
        ? service.image
        : service.image.startsWith('/') 
          ? service.image
          : `/uploads/${service.image}`;
          
      if (!images.includes(imagePath)) {
        images.push(imagePath);
      }
    }

    // Removed automatic image path generation based on package ID
    
    // Check if we have any images to display
    if (images.length === 0 || imageError[service.id]) {
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
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        <PackageImage
          images={images}
          alt={service.name || 'Service package'}
          size={large ? 'large' : 'large'}
          className="object-cover"
          onError={() => {
            setImageError(prev => ({ ...prev, [service.id]: true }));
          }}
        />
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

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 p-6 text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Error Loading Services</h3>
          <p className="mt-2 text-gray-500">{error}</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <EmptyState />
        </div>
      ) : (
        // Card View
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
                  <p className="font-bold text-[var(--primary-green)]">₱{service.price.toLocaleString()}</p>
                </div>
                <p className="text-sm text-gray-600 mb-3">{service.cremationCenter}</p>
                <p className="text-sm text-gray-700 line-clamp-2 mb-3">{service.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{service.bookings || 0} bookings</span>
                  <div className="flex space-x-2">
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
            </div>
          ))}
        </div>
      )}

      {/* Service Details Modal */}
      {showDetailsModal && selectedService && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-white p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Service Image */}
                  <div className="md:col-span-1">
                    <div className="aspect-square w-full rounded-lg overflow-hidden mb-4">
                      {renderServiceImage(selectedService, true)}
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        {getStatusBadge(selectedService.status)}
                      </div>
                      <div>
                        {getCategoryBadge(selectedService.category)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Service Details */}
                  <div className="md:col-span-2">
                    <h3 className="text-xl font-medium text-gray-900 mb-4">{selectedService.name}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Provider</p>
                        <p className="text-base text-gray-900">{selectedService.cremationCenter}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Price</p>
                        <p className="text-base text-gray-900">₱{selectedService.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Cremation Type</p>
                        <p className="text-base text-gray-900">{selectedService.cremationType || 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Processing Time</p>
                        <p className="text-base text-gray-900">{selectedService.processingTime || '2-3 days'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Bookings</p>
                        <p className="text-base text-gray-900">{selectedService.bookings || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <p className="text-base capitalize text-gray-900">{selectedService.category || 'Standard'}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-base text-gray-900">{selectedService.description}</p>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Inclusions</p>
                      {selectedService.inclusions && selectedService.inclusions.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {selectedService.inclusions.map((inclusion: string, idx: number) => (
                            <li key={idx}>{inclusion}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No inclusions specified</p>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Add-ons</p>
                      {selectedService.addOns && selectedService.addOns.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {selectedService.addOns.map((addon: string, idx: number) => (
                            <li key={idx}>{addon}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No add-ons available</p>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Conditions</p>
                      <p className="text-sm text-gray-700">{selectedService.conditions || 'No specific conditions'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 flex flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNumber: number;
              if (pagination.totalPages <= 5) {
                // If we have 5 or fewer pages, show all page numbers
                pageNumber = i + 1;
              } else if (pagination.page <= 3) {
                // If we're on pages 1-3, show pages 1-5
                pageNumber = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                // If we're on the last 3 pages, show the last 5 pages
                pageNumber = pagination.totalPages - 4 + i;
              } else {
                // Otherwise, show 2 pages before and 2 pages after the current page
                pageNumber = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                  className={`px-3 py-1 rounded-md ${
                    pagination.page === pageNumber
                      ? 'bg-[var(--primary-green)] text-white font-medium'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
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
    </AdminDashboardLayout>
  );
}