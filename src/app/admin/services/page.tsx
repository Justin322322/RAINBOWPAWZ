'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  QueueListIcon,
  FireIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import Select from '@/components/ui/Select';
import { PackageImage } from '@/components/packages/PackageImage';
import { LoadingSpinner } from './client';
import StarRating from '@/components/ui/StarRating';
import StatCard from '@/components/ui/StatCard';

type Service = {
  id: number;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'pending' | string;
  price: number | string;
  bookings: number;
  providerId: number;
  cremationCenter: string;
  cremationType: string;
  processingTime: string;
  images: string[];
  image: string | null;
  rating: number;
  inclusions: string[];
  addOns: string[];
  conditions: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type Stats = {
  activeServices: number;
  totalBookings: number;
  verifiedCenters: number;
};

function StatusBadge({ status }: { status: Service['status'] }) {
  const common = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full min-w-[90px] justify-center';
  switch (status) {
    case 'active':
      return <span className={`${common} bg-green-100 text-green-800`}>Active</span>;
    case 'inactive':
      return <span className={`${common} bg-gray-100 text-gray-800`}>Inactive</span>;
    case 'pending':
      return <span className={`${common} bg-yellow-100 text-yellow-800`}>Pending</span>;
    default:
      return <span className={`${common} bg-gray-100 text-gray-800`}>{status}</span>;
  }
}

function CategoryBadge({ category }: { category: string }) {
  const common = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full';
  switch (category) {
    case 'individual': return <span className={`${common} bg-blue-100 text-blue-800`}>Individual</span>;
    case 'premium':    return <span className={`${common} bg-purple-100 text-purple-800`}>Premium</span>;
    case 'communal':   return <span className={`${common} bg-amber-100 text-amber-800`}>Communal</span>;
    case 'service':    return <span className={`${common} bg-emerald-100 text-emerald-800`}>Service</span>;
    case 'memorial':   return <span className={`${common} bg-indigo-100 text-indigo-800`}>Memorial</span>;
    default:           return <span className={`${common} bg-gray-100 text-gray-800`}>{category}</span>;
  }
}

// Hook to fetch services + stats + pagination
function useServices(params: {
  search: string;
  status: string;
  category: string;
  page: number;
  limit: number;
  onError: (msg: string) => void;
  shouldFetch?: () => boolean;
}) {
  const { search, status, category, page, limit, onError, shouldFetch } = params;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [_isInitialLoad, setIsInitialLoad] = useState(true);
  const [stats, setStats] = useState<Stats>({
    activeServices: 0,
    totalBookings: 0,
    verifiedCenters: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Memoize the error handler to prevent unnecessary re-renders
  const _handleError = useCallback((message: string) => {
    onError(message);
  }, [onError]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let isMounted = true;
    let retryTimer: NodeJS.Timeout | null = null;

    // Check if we should fetch data based on the shouldFetch callback
    if (shouldFetch && !shouldFetch()) {
      // Skip fetching if shouldFetch returns false
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Set loading to true at the start of the request
      setLoading(true);

      try {
        const query = new URLSearchParams({
          search: search || '',
          status: status || 'all',
          category: category || 'all',
          page: page.toString(),
          limit: limit.toString(),
          _t: Date.now().toString(), // Prevent caching
        });

        const res = await fetch(`/api/admin/services/listing?${query}`, {
          signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!isMounted) return;

        if (!data.success) {
          throw new Error(data.error || 'Failed to load services');
        }

        setServices(data.services || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });

        // Update stats if available
        if (data.stats) {
          setStats({
            activeServices: data.stats.activeServices || 0,
            totalBookings: data.stats.totalBookings || 0,
            verifiedCenters: data.stats.verifiedCenters || 0,
          });
        } else {
          // Use data from the response directly if stats object is not present
          setStats({
            activeServices: data.activeServicesCount || 0,
            totalBookings: 0,
            verifiedCenters: data.serviceProvidersCount || 0,
          });
        }

        setError(null);
        setRetryCount(0); // Reset retry count on success
      } catch (err: any) {
        if (!isMounted) return;

        console.error('Error fetching services:', err);
        const errorMessage = err.message || 'Failed to load services. Please try again.';
        setError(errorMessage);
        onError(errorMessage);

        // Auto-retry logic - limit to 1 retry to prevent infinite loops
        if (retryCount < 1) {
          retryTimer = setTimeout(() => {
            if (isMounted) {
              setRetryCount(prev => prev + 1);
            }
          }, 3000); // Longer delay between retries
        } else {
          // After retry limit, set empty data to prevent infinite loading
          setServices([]);
          setPagination({ total: 0, page: 1, limit: 10, totalPages: 1 });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [search, status, category, page, limit, onError, retryCount, shouldFetch]);

  return { services, loading, stats, pagination, setPagination };
}

export default function AdminServicesPage() {
  const [userName]       = useState('System Administrator');
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [notification, setNotification]   = useState<{ message: string; type: 'error'|'success'|null }>({ message:'', type:null });
  const [page, setPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0); // Track last fetch time for cache
  const limit = 20;

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Create a cache key based on the current filters
  const _cacheKey = `${debouncedSearch}_${statusFilter}_${categoryFilter}_${page}_${limit}`;

  // Only fetch new data if filters change or if it's been more than 30 seconds
  const shouldFetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTime > 30000) { // 30 seconds cache
      setLastFetchTime(now);
      return true;
    }
    return false;
  }, [lastFetchTime]);

  const { services, loading, stats, pagination, setPagination } = useServices({
    search: debouncedSearch,
    status: statusFilter,
    category: categoryFilter,
    page,
    limit,
    onError: (msg) => setNotification({ message: msg, type: 'error' }),
    shouldFetch: shouldFetch
  });

  // Track initial load state
  useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

  const filteredServices = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return services.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.cremationCenter.toLowerCase().includes(term) ||
      `${s.id}`.includes(term)
    );
  }, [services, debouncedSearch]);

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Service | null>(null);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  const openDetails = useCallback((svc: Service) => {
    setSelected(svc);
    setShowModal(true);
  }, []);
  const closeDetails = useCallback(() => setShowModal(false), []);

  // clear notifications
  useEffect(() => {
    if (notification.type) {
      const t = setTimeout(() => setNotification({ message:'', type:null }), 5000);
      return () => clearTimeout(t);
    }
    return undefined; // Explicitly return undefined when there's no cleanup needed
  }, [notification]);

  // Reset loading state when filters change
  useEffect(() => {
    setPage(1); // Reset to first page when filters change
    setLastFetchTime(0); // Reset cache when filters change
  }, [searchTerm, statusFilter, categoryFilter]);

  if (loading && isInitialLoad) {
    return (
      <AdminDashboardLayout activePage="services" userName={userName}>
        <LoadingSpinner message="Loading services..." fullScreen={false} />
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout activePage="services" userName={userName}>
      {/* Notification Overlays */}
      <AnimatePresence>
        {notification.type === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-6">
                {notification.message}
              </p>
              <button
                onClick={() => setNotification({ message: '', type: null })}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}

        {notification.type === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Success</h3>
              <p className="text-gray-600 mb-6">
                {notification.message}
              </p>
              <button
                onClick={() => setNotification({ message: '', type: null })}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Active Services</h1>
            <p className="text-gray-600 mt-1">Monitor and manage cremation services</p>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search services..."
              />
            </div>
            <div className="w-full sm:w-auto">
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as string)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Select
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value as string)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'cremation', label: 'Cremation Services' },
                  { value: 'memorial', label: 'Memorial Services' },
                  { value: 'funeral', label: 'Funeral Services' },
                ]}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<FireIcon className="text-green-800" />}
          label="Active Services"
          value={typeof stats.activeServices === 'number' ? stats.activeServices : 0}
          color="green"
        />
        <StatCard
          icon={<QueueListIcon className="text-blue-800" />}
          label="Total Bookings"
          value={typeof stats.totalBookings === 'number' ? stats.totalBookings : 0}
          color="blue"
        />
        <StatCard
          icon={<ShieldCheckIcon className="text-purple-800" />}
          label="Service Providers"
          value={typeof stats.verifiedCenters === 'number' ? stats.verifiedCenters : 0}
          color="purple"
        />
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Service Packages</h2>
          </div>
        </div>

        {loading && !isInitialLoad ? (
          <LoadingSpinner message="Loading services..." className="px-6" />
        ) : filteredServices.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">No services match your search criteria.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map(svc => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  onViewDetails={openDetails}
                  imageError={imageError}
                  setImageError={setImageError}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selected && (
        <ServiceDetailsModal
          service={selected}
          onClose={closeDetails}
          imageError={imageError}
          setImageError={setImageError}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={p => { setPage(p); setPagination(prev=>({...prev,page:p})); }}
        />
      )}
    </AdminDashboardLayout>
  );
}


// ——— Helper components below ———

function ServiceCard({
  service,
  onViewDetails,
  imageError,
  setImageError
}: {
  service: Service;
  onViewDetails: (s: Service) => void;
  imageError: Record<number, boolean>;
  setImageError: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}) {
  // Format the service data for display
  const formattedName = service.name || 'Unnamed Service';
  const formattedCenter = service.cremationCenter || 'Cremation Center';
  const formattedDescription = service.description || 'No description available';

  // Use the exact rating from the database, defaulting to 0 if not available
  const rating = typeof service.rating === 'number' && !isNaN(service.rating)
    ? service.rating
    : 0;

  // Ensure bookings is a valid number
  const bookings = typeof service.bookings === 'number' && !isNaN(service.bookings)
    ? service.bookings
    : 0;

  // Format price with currency
  const formattedPrice = typeof service.price === 'number'
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(service.price)
    : service.price;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* Image Section */}
      <div className="relative w-full h-48 bg-gray-50">
        <div className="absolute top-2 right-2 z-10">
          <StatusBadge status={service.status} />
        </div>
        <div className="absolute top-2 left-2 z-10">
          <CategoryBadge category={service.category} />
        </div>

        {service.images.length === 0 || imageError[service.id] ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
            <svg className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-gray-500">No image available</span>
          </div>
        ) : (
          <PackageImage
            images={service.images}
            alt={formattedName}
            size="large"
            className="object-cover w-full h-full"
            onError={() => setImageError(prev => ({ ...prev, [service.id]: true }))}
          />
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 text-base line-clamp-1">{formattedName}</h3>
          <p className="font-bold text-[var(--primary-green)] whitespace-nowrap ml-2">
            {formattedPrice}
          </p>
        </div>

        <p className="text-sm text-gray-600 mb-2 line-clamp-1">{formattedCenter}</p>

        <div className="flex items-center mb-2">
          <StarRating rating={rating} size="small" />
          <span className="ml-2 text-xs text-gray-600">
            {rating > 0 ? `${rating.toFixed(1)} (${bookings} ${bookings === 1 ? 'review' : 'reviews'})` : 'No reviews yet'}
          </span>
        </div>

        <p className="text-sm text-gray-700 line-clamp-2 mb-3 flex-grow">
          {formattedDescription}
        </p>

        <div className="mt-auto pt-2 border-t border-gray-100">
          <button
            onClick={() => onViewDetails(service)}
            className="w-full px-4 py-2 bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] text-white text-sm font-medium rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceDetailsModal({
  service,
  onClose,
  imageError,
  setImageError
}: {
  service: Service;
  onClose: () => void;
  imageError: Record<number, boolean>;
  setImageError: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}) {
  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);
  // Format the service data for display
  const formattedName = service.name || 'Unnamed Service';
  const formattedCenter = service.cremationCenter || 'Cremation Center';
  const formattedDescription = service.description || 'No description available';
  const formattedConditions = service.conditions || 'No conditions specified';
  const formattedType = service.cremationType || 'Standard';
  const formattedTime = service.processingTime || '2-3 days';

  // Use the exact rating from the database, defaulting to 0 if not available
  const rating = typeof service.rating === 'number' && !isNaN(service.rating)
    ? service.rating
    : 0;

  // Ensure bookings is a valid number
  const bookings = typeof service.bookings === 'number' && !isNaN(service.bookings)
    ? service.bookings
    : 0;

  // Ensure inclusions and addOns are arrays
  const inclusions = Array.isArray(service.inclusions) ? service.inclusions : [];
  const addOns = Array.isArray(service.addOns) ? service.addOns : [];

  // Format price with currency
  const formattedPrice = typeof service.price === 'number'
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(service.price)
    : service.price;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-1 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-4xl w-full max-h-[98vh] sm:max-h-[90vh] flex flex-col overflow-hidden mx-1 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Service Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scrollbar">
          <div className="p-4 sm:p-6 pb-6 sm:pb-8">
            <div className="flex flex-col space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                  <FireIcon className="h-6 w-6 sm:h-10 sm:w-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">{formattedName}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1 space-y-1 sm:space-y-0">
                    <span className="text-sm sm:text-base text-gray-600 truncate">Provider: {formattedCenter}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center">
                      <StatusBadge status={service.status} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end sm:justify-start">
                <span className="text-xl sm:text-2xl font-bold text-[var(--primary-green)]">{formattedPrice}</span>
              </div>
            </div>

            {/* Image */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg overflow-hidden h-48 sm:h-64 relative">
              {service.images.length === 0 || imageError[service.id] ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
                  <svg className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">No image available</span>
                </div>
              ) : (
                <PackageImage
                  images={service.images}
                  alt={formattedName}
                  size="large"
                  className="object-cover w-full h-full rounded-lg"
                  onError={() => setImageError(prev => ({ ...prev, [service.id]: true }))}
                />
              )}
              <div className="absolute top-2 right-2">
                <CategoryBadge category={service.category} />
              </div>
            </div>

            {/* Service Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Service Information */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Service Information</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Cremation Type</p>
                      <p className="text-gray-900">{formattedType}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Processing Time</p>
                      <p className="text-gray-900">{formattedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Rating</p>
                      <div className="flex items-center space-x-2">
                        <StarRating rating={rating} size="small" />
                        <span className="text-sm text-gray-700">
                          {rating > 0 ? `${rating.toFixed(1)} / 5` : 'No ratings yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Booking Information</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Total Bookings</p>
                      <p className="text-gray-900">{bookings}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Category</p>
                      <p className="text-gray-900">{service.category}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{formattedDescription}</p>
              </div>
            </div>

            {/* Service Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Inclusions */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Inclusions</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                  {inclusions.length > 0 ? (
                    <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700">
                      {inclusions.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No inclusions specified</p>
                  )}
                </div>
              </div>

              {/* Add-ons */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Add-ons</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                  {addOns.length > 0 ? (
                    <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm text-gray-700">
                      {addOns.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No add-ons specified</p>
                  )}
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Terms & Conditions</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{formattedConditions}</p>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function _DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
      <p className="text-sm text-gray-700">{content || '—'}</p>
    </div>
  );
}

function _DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
      {items.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          {items.map((it, idx) => <li key={idx}>{it}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No {title.toLowerCase()} specified</p>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  // Ensure valid values for page and totalPages
  const validPage = Math.max(1, page || 1);
  const validTotalPages = Math.max(1, totalPages || 1);

  const generatePages = useMemo(() => {
    const pages: number[] = [];
    // Ensure we don't have negative values in calculations
    const start = Math.max(1, Math.min(validPage - 2, validTotalPages - 4));
    for (let i = start; i <= Math.min(start + 4, validTotalPages); i++) {
      pages.push(i);
    }
    return pages;
  }, [validPage, validTotalPages]);

  return (
    <nav className="flex justify-center space-x-2 my-8">
      <button
        onClick={() => onPageChange(validPage - 1)}
        disabled={validPage === 1}
        className={`px-3 py-1 rounded-md ${
          validPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 border'
        }`}
      >
        Previous
      </button>
      {generatePages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1 rounded-md ${
            p === validPage ? 'bg-[var(--primary-green)] text-white' : 'bg-white text-gray-700 border'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(validPage + 1)}
        disabled={validPage === validTotalPages}
        className={`px-3 py-1 rounded-md ${
          validPage === validTotalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 border'
        }`}
      >
        Next
      </button>
    </nav>
  );
}

// Simple debounce hook
function useDebounce<T>(val: T, delay: number) {
  const [deb, setDeb] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setDeb(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return deb;
}
