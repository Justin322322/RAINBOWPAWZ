'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
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
import { Modal } from '@/components/ui/Modal';

// Lazy-loaded image component for better performance
const LazyServiceImage: React.FC<{
  images: string[];
  alt: string;
  className?: string;
  onError?: () => void;
}> = ({ images, alt, className = '', onError }) => {
  const [isInView, setIsInView] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const _handleLoad = () => {
    setHasLoaded(true);
  };

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`w-full h-full bg-gray-100 flex items-center justify-center ${className}`}
      >
        <div className="animate-pulse bg-gray-200 w-full h-full rounded"></div>
      </div>
    );
  }

  return (
    <PackageImage
      images={images}
      alt={alt}
      size="large"
      className={`${className} ${hasLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onError={onError}
    />
  );
};
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
  reviewsCount: number;
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

const StatusBadge = React.memo(function StatusBadge({ status }: { status: Service['status'] }) {
  const common = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full min-w-[90px] justify-center';
  switch (status) {
    case 'active':
      return <span className={`${common} bg-green-100 text-green-800`}>Active</span>;
    case 'inactive':
      return <span className={`${common} bg-gray-100 text-gray-800`}>Inactive</span>;
    default:
      return <span className={`${common} bg-gray-100 text-gray-800`}>{status}</span>;
  }
});

const CategoryBadge = React.memo(function CategoryBadge({ category }: { category: string }) {
  const common = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full';
  switch (category) {
    case 'individual': return <span className={`${common} bg-blue-100 text-blue-800`}>Individual</span>;
    case 'premium':    return <span className={`${common} bg-purple-100 text-purple-800`}>Premium</span>;
    case 'communal':   return <span className={`${common} bg-amber-100 text-amber-800`}>Communal</span>;
    case 'service':    return <span className={`${common} bg-emerald-100 text-emerald-800`}>Service</span>;
    case 'memorial':   return <span className={`${common} bg-indigo-100 text-indigo-800`}>Memorial</span>;
    default:           return <span className={`${common} bg-gray-100 text-gray-800`}>{category}</span>;
  }
});

// Module-level cache that persists across component remounts
const servicesCache = new Map<string, { data: any; timestamp: number }>();

// Cache version - increment this when data structure changes
let cacheVersion = 1;

// Function to clear cache (can be called manually)
export function clearServicesCache() {
  servicesCache.clear();
}

// Function to invalidate cache (call this after data mutations)
export function invalidateServicesCache() {
  cacheVersion++;
  servicesCache.clear();
}

// Hook to fetch services + stats + pagination
function useServices(params: {
  search: string;
  status: string;
  category: string;
  page: number;
  limit: number;
  onError: (msg: string) => void;
}) {
  const { search, status, category, page, limit, onError } = params;
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

  // Persistent cache implementation using module-level variable
  // Reduced to 5 minutes to match CDN cache for consistency
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let isMounted = true;
    let retryTimer: NodeJS.Timeout | null = null;

    // Create stable cache key with version
    const cacheKey = `v${cacheVersion}_${search}_${status}_${category}_${page}_${limit}`;
    const now = Date.now();

    // Check cache first
    const cachedData = servicesCache.get(cacheKey);
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      // Use cached data
      setServices(cachedData.data.services || []);
      setPagination(cachedData.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      setStats(cachedData.data.stats || { activeServices: 0, totalBookings: 0, verifiedCenters: 0 });
      setLoading(false);
      setIsInitialLoad(false);
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
        });

        const res = await fetch(`/api/admin/services/listing?${query}`, {
          signal,
          headers: {
            'Cache-Control': 'max-age=300' // Cache for 5 minutes
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

        const servicesData = data.services || [];
        const paginationData = data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
        
        // Update stats if available
        let statsData;
        if (data.stats) {
          statsData = {
            activeServices: data.stats.activeServices || 0,
            totalBookings: data.stats.totalBookings || 0,
            verifiedCenters: data.stats.verifiedCenters || 0,
          };
        } else {
          // Use data from the response directly if stats object is not present
          statsData = {
            activeServices: data.activeServicesCount || 0,
            totalBookings: 0,
            verifiedCenters: data.serviceProvidersCount || 0,
          };
        }

        setServices(servicesData);
        setPagination(paginationData);
        setStats(statsData);

        // Update cache
        servicesCache.set(cacheKey, {
          data: {
            services: servicesData,
            pagination: paginationData,
            stats: statsData
          },
          timestamp: now
        });

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
  }, [search, status, category, page, limit, onError, retryCount, CACHE_DURATION]);

  return { services, loading, stats, pagination, setPagination };
}

const AdminServicesPage = React.memo(function AdminServicesPage() {
  const [userName]       = useState('System Administrator');
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [notification, setNotification]   = useState<{ message: string; type: 'error'|'success'|null }>({ message:'', type:null });
  const [page, setPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const limit = 20;

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { services, loading, stats, pagination, setPagination } = useServices({
    search: debouncedSearch,
    status: statusFilter,
    category: categoryFilter,
    page,
    limit,
    onError: (msg) => setNotification({ message: msg, type: 'error' })
  });



  // Track initial load state
  useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

  // Remove client-side filtering since API already handles search
  const filteredServices = services;

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Service | null>(null);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  const openDetails = useCallback((svc: Service) => {
    setSelected(svc);
    setShowModal(true);
  }, []);
  const closeDetails = useCallback(() => setShowModal(false), []);

  // clear notifications_unified
  useEffect(() => {
    if (notification.type) {
      const t = setTimeout(() => setNotification({ message:'', type:null }), 5000);
      return () => clearTimeout(t);
    }
    return undefined; // Explicitly return undefined when there's no cleanup needed
  }, [notification]);

  // Reset to first page when filters change, but preserve cache for same filters
  useEffect(() => {
    setPage(1); // Reset to first page when filters change
    // Don't reset cache here - let it persist for performance
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
          icon={<FireIcon />}
          label="Active Services"
          value={typeof stats.activeServices === 'number' ? stats.activeServices : 0}
          color="green"
        />
        <StatCard
          icon={<QueueListIcon />}
          label="Total Bookings"
          value={typeof stats.totalBookings === 'number' ? stats.totalBookings : 0}
          color="blue"
        />
        <StatCard
          icon={<ShieldCheckIcon />}
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
});

export default AdminServicesPage;


// ——— Helper components below ———

const ServiceCard = React.memo(function ServiceCard({
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
  const _bookings = typeof service.bookings === 'number' && !isNaN(service.bookings)
    ? service.bookings
    : 0;

  const _reviewsCount2 = typeof service.reviewsCount === 'number' && !isNaN(service.reviewsCount)
    ? service.reviewsCount
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
          <LazyServiceImage
            images={service.images}
            alt={formattedName}
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
            {_reviewsCount2 > 0 ? `${rating.toFixed(1)} (${_reviewsCount2} ${_reviewsCount2 === 1 ? 'review' : 'reviews'})` : 'No reviews yet'}
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
});

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

  const _reviewsCount = typeof service.reviewsCount === 'number' && !isNaN(service.reviewsCount)
    ? service.reviewsCount
    : 0;

  // Ensure inclusions and addOns are arrays
  const inclusions = Array.isArray(service.inclusions) ? service.inclusions : [];
  const addOns = Array.isArray(service.addOns) ? service.addOns : [];

  // Format price with currency
  const formattedPrice = typeof service.price === 'number'
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(service.price)
    : service.price;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Service Details"
      size="large"
      className="max-w-4xl mx-4 sm:mx-auto"
      contentClassName="max-h-[85vh] overflow-y-auto"
      customZIndex="z-[50000]"
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Content area */}
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{formattedName}</h1>
            <p className="text-gray-600">{formattedCenter}</p>
          </div>
          {/* Stats Row */}
          <div className="flex justify-center space-x-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{bookings}</div>
              <div className="text-sm text-gray-600">Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formattedPrice}</div>
              <div className="text-sm text-gray-600">Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{rating.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Image Section */}
          <div className="relative">
            {service.images.length === 0 || imageError[service.id] ? (
              <div className="w-full h-48 sm:h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                <svg className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">No image available</span>
              </div>
            ) : (
              <div className="w-full h-48 sm:h-64 rounded-lg overflow-hidden">
                <PackageImage
                  images={service.images}
                  alt={formattedName}
                  size="large"
                  className="object-cover w-full h-full"
                  onError={() => setImageError(prev => ({ ...prev, [service.id]: true }))}
                />
              </div>
            )}
            <div className="absolute top-3 right-3">
              <CategoryBadge category={service.category} />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Service Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Status:</span>
              <StatusBadge status={service.status} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Category:</span>
              <span className="text-sm text-gray-900">{service.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Type:</span>
              <span className="text-sm text-gray-900">{formattedType}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Processing Time:</span>
              <span className="text-sm text-gray-900">{formattedTime}</span>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Description</h3>
            <p className="text-gray-700 leading-relaxed">{formattedDescription}</p>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* What's Included & Add-ons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* What&apos;s Included */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What&apos;s Included</h3>
              {inclusions.length > 0 ? (
                <ul className="space-y-2">
                  {inclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No inclusions specified</p>
              )}
            </div>

            {/* Add-ons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Add-ons</h3>
              {addOns.length > 0 ? (
                <ul className="space-y-2">
                  {addOns.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="h-2 w-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No add-ons available</p>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Terms & Conditions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
            <p className="text-gray-700 leading-relaxed">{formattedConditions}</p>
          </div>
        </div>
      </div>
    </Modal>
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
