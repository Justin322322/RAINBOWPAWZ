'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FireIcon,
  QueueListIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  XMarkIcon,
  EyeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { PackageImage } from '@/components/packages/PackageImage';
import { LoadingSpinner, EmptyState } from './client';
import StarRating from '@/components/ui/StarRating';

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
  monthlyRevenue: string;
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
}) {
  const { search, status, category, page, limit } = params;
  const [services, setServices] = useState<Service[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page, limit, totalPages: 0 });
  const [stats, setStats] = useState<Stats>({
    activeServices: 0,
    totalBookings: 0,
    verifiedCenters: 0,
    monthlyRevenue: '₱0.00',
  });
  const [loading, setLoading] = useState(true);
  
  // Memoize the error handler to prevent unnecessary re-renders
  const handleError = useCallback((message: string) => {
    params.onError(message);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (search)   qs.append('search', search);
        if (status!=='all')   qs.append('status', status);
        if (category!=='all') qs.append('category', category);
        qs.append('page', `${page}`);
        qs.append('limit', `${limit}`);
        qs.append('_', `${Date.now()}`);

        const [svcRes, imgRes] = await Promise.all([
          fetch(`/api/admin/services/listing?${qs}`),
          fetch(`/api/packages/available-images?${Date.now()}`),
        ]);

        if (!svcRes.ok) throw new Error(`Error ${svcRes.status}`);
        const data = await svcRes.json();

        if (!data.success) {
          handleError(data.error || 'Failed to fetch services');
          return;
        }

        // save images list cookie
        const imgJson = await imgRes.json();
        if (imgJson.images) {
          document.cookie = `packageFiles=${JSON.stringify(imgJson.images)}; path=/; max-age=300`;
        }

        // normalize
        const withImg: Service[] = data.services.map((s: any) => {
          // Ensure we have an id field (might be package_id in the database)
          const serviceId = s.id || s.package_id || 0;
          
          const imgs = Array.isArray(s.images) && s.images.length
            ? s.images
            : s.image ? [s.image] : [];
          return {
            ...s,
            id: serviceId,
            images: imgs,
            image: imgs[0] ?? null,
          };
        });

        setServices(withImg);

        // Ensure pagination data is properly set with defaults if missing
        if (data.pagination) {
          setPagination({
            total: data.pagination.total || 0,
            page: data.pagination.page || page,
            limit: data.pagination.limit || limit,
            totalPages: data.pagination.totalPages || Math.ceil((data.pagination.total || 0) / limit)
          });
        } else {
          // If pagination data is missing, calculate it from the services array
          setPagination({
            total: withImg.length,
            page,
            limit,
            totalPages: Math.ceil(withImg.length / limit)
          });
        }

        // Fetch dashboard stats for more accurate data
        let dashboardStats;
        try {
          // First try to get stats from the dedicated dashboard-stats endpoint
          const dashboardRes = await fetch('/api/admin/dashboard-stats');
          if (dashboardRes.ok) {
            const dashboardData = await dashboardRes.json();
            if (dashboardData.success && dashboardData.stats) {
              dashboardStats = dashboardData.stats;
            }
          }

          // If that fails, try the regular dashboard endpoint
          if (!dashboardStats) {
            const regularDashboardRes = await fetch('/api/admin/dashboard');
            if (regularDashboardRes.ok) {
              const regularData = await regularDashboardRes.json();
              if (regularData.success && regularData.stats) {
                dashboardStats = regularData.stats;
              }
            }
          }
        } catch (dashboardErr) {
          console.error('Error fetching dashboard stats:', dashboardErr);
        }

        // Calculate more accurate stats
        let activeServicesCount = 0;
        let totalBookingsCount = 0;
        let serviceProvidersCount = 0;
        let monthlyRevenueAmount = 0;

        // Try to get the most accurate values from various sources
        if (dashboardStats) {
          // Use dashboard stats if available
          activeServicesCount = dashboardStats.services?.count || 0;
          serviceProvidersCount = dashboardStats.activeUsers?.cremation || 0;
          monthlyRevenueAmount = dashboardStats.revenue?.amount || 0;
        }

        // If dashboard stats are missing or zero, fall back to API data
        if (activeServicesCount === 0 && data.activeServicesCount) {
          activeServicesCount = data.activeServicesCount;
        }

        if (serviceProvidersCount === 0 && data.serviceProvidersCount) {
          serviceProvidersCount = data.serviceProvidersCount;
        }

        // If we have monthly revenue from API, parse it
        if (monthlyRevenueAmount === 0 && data.monthlyRevenue) {
          // Try to parse the formatted string (e.g., "₱25,000.00")
          const match = data.monthlyRevenue.match(/[0-9,.]+/);
          if (match) {
            monthlyRevenueAmount = parseFloat(match[0].replace(/,/g, '')) || 0;
          }
        }

        // Last resort: calculate from the services array
        if (activeServicesCount === 0) {
          activeServicesCount = withImg.filter(s => s.status === 'active').length;
        }

        // Calculate total bookings from services
        totalBookingsCount = data.totalBookings || withImg.reduce((sum, s) => sum + (s.bookings || 0), 0);

        // If service providers count is still 0, calculate from unique provider IDs
        if (serviceProvidersCount === 0) {
          serviceProvidersCount = new Set(withImg.filter(s => s.providerId).map(s => s.providerId)).size;
        }

        // Format the monthly revenue with the Philippine Peso symbol
        const formattedMonthlyRevenue = monthlyRevenueAmount > 0
          ? `₱${monthlyRevenueAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`
          : '₱0.00';

        // Set the stats with our values, using the real monthly revenue
        setStats({
          activeServices: activeServicesCount,
          totalBookings: totalBookingsCount,
          verifiedCenters: serviceProvidersCount,
          monthlyRevenue: formattedMonthlyRevenue,
        });
      } catch (err: any) {
        handleError(err.message || 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [search, status, category, page, limit, handleError]);

  return { services, loading, stats, pagination, setPagination };
}

export default function AdminServicesPage() {
  const [userName]       = useState('System Administrator');
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [notification, setNotification]   = useState<{ message: string; type: 'error'|'success'|null }>({ message:'', type:null });
  const [page, setPage]     = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { services, loading, stats, pagination, setPagination } = useServices({
    search: debouncedSearch,
    status: statusFilter,
    category: categoryFilter,
    page, limit,
    onError: (msg) => setNotification({ message: msg, type: 'error' }),
  });

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

  return (
    <AdminDashboardLayout activePage="services" userName={userName}>
      {/* Notification */}
      {notification.type && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center ${
          notification.type==='error'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {notification.type==='error'
            ? <ExclamationCircleIcon className="h-5 w-5 mr-2 text-red-500"/>
            : <span className="h-5 w-5 mr-2 text-green-500">✔</span>}
          <span>{notification.message}</span>
          <button onClick={()=>setNotification({message:'',type:null})} className="ml-4 text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Active Services</h1>
            <p className="text-gray-600 mt-1">Monitor and manage cremation services</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-grow sm:max-w-xs">
              <MagnifyingGlassIcon className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e=>setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={e=>setStatusFilter(e.target.value)}
              options={[
                {label:'All Statuses',value:'all'},
                {label:'Active',value:'active'},
                {label:'Inactive',value:'inactive'},
                {label:'Pending',value:'pending'},
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={e=>setCategoryFilter(e.target.value)}
              options={[
                {label:'All Categories',value:'all'},
                {label:'Individual',value:'individual'},
                {label:'Premium',value:'premium'},
                {label:'Communal',value:'communal'},
                {label:'Service',value:'service'},
                {label:'Memorial',value:'memorial'},
              ]}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <StatCard
          icon={<BanknotesIcon className="text-amber-800" />}
          label="Monthly Revenue"
          value={stats.monthlyRevenue || '₱0.00'}
          color="amber"
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredServices.length === 0 ? (
        <EmptyState />
      ) : (
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
      )}

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

function Select({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="block w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] appearance-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.293 7.293l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const bg = {
    green: 'bg-green-100 text-green-800',
    blue:  'bg-blue-100 text-blue-800',
    purple:'bg-purple-100 text-purple-800',
    amber: 'bg-amber-100 text-amber-800'
  }[color];
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${bg} mr-4 flex items-center justify-center`}>
          {/* Fixed size container for the icon */}
          <div className="h-6 w-6">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="relative w-full h-48">
        <div className="absolute top-2 right-2 z-10"><StatusBadge status={service.status} /></div>
        <div className="absolute top-2 left-2 z-10"><CategoryBadge category={service.category} /></div>
        {service.images.length === 0 || imageError[service.id] ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159..." />
            </svg>
          </div>
        ) : (
          <PackageImage
            images={service.images}
            alt={formattedName}
            size="large"
            className="object-cover w-full h-full"
            onError={() => setImageError(prev=>({...prev,[service.id]:true}))}
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{formattedName}</h3>
          <p className="font-bold text-[var(--primary-green)]">{service.price}</p>
        </div>
        <p className="text-sm text-gray-600 mb-2">{formattedCenter}</p>
        <div className="flex items-center mb-2">
          <StarRating rating={rating} size="small" />
          <span className="ml-2 text-xs text-gray-600">
            {rating > 0 ? `${rating.toFixed(1)} rating` : 'No ratings'}
          </span>
        </div>
        <p className="text-sm text-gray-700 line-clamp-2 mb-3">{formattedDescription}</p>
        <div className="flex items-center mb-2">
          <QueueListIcon className="h-4 w-4 text-blue-500 mr-1" />
          <span className="text-xs text-gray-600">{bookings} bookings</span>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => onViewDetails(service)}
            className="px-3 py-1.5 bg-[var(--primary-green)] text-white text-sm rounded-lg flex items-center"
          >
            <EyeIcon className="h-4 w-4 mr-1" /> View Details
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

  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Image + badges */}
              <div className="md:col-span-1">
                <div className="aspect-square w-full rounded-lg overflow-hidden mb-4">
                  {service.images.length===0 || imageError[service.id] ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 ..."/>
                      </svg>
                    </div>
                  ) : (
                    <PackageImage
                      images={service.images}
                      alt={formattedName}
                      size="large"
                      className="object-cover w-full h-full"
                      onError={()=>setImageError(prev=>({...prev,[service.id]:true}))}
                    />
                  )}
                </div>
                <div className="flex justify-between">
                  <StatusBadge status={service.status} />
                  <CategoryBadge category={service.category} />
                </div>
              </div>
              {/* Right Column: Details */}
              <div className="md:col-span-2">
                <h3 className="text-xl font-medium text-gray-900 mb-4">{formattedName}</h3>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500">Rating:</p>
                  <div className="flex items-center">
                    <StarRating rating={rating} size="medium" />
                    <span className="ml-2 text-gray-700">
                      {rating > 0 ? `${rating.toFixed(1)} / 5` : 'No ratings yet'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    ['Provider', formattedCenter],
                    ['Price', service.price],
                    ['Cremation Type', formattedType],
                    ['Processing Time', formattedTime],
                    ['Bookings', bookings],
                    ['Category', service.category],
                    ['Status', service.status],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-sm font-medium text-gray-500">{label}</p>
                      <p className="text-base text-gray-900">{val}</p>
                    </div>
                  ))}
                </div>
                <DetailSection title="Description" content={formattedDescription} />
                <DetailList title="Inclusions" items={inclusions} />
                <DetailList title="Add-ons" items={addOns} />
                <DetailSection title="Conditions" content={formattedConditions} />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
      <p className="text-sm text-gray-700">{content || '—'}</p>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
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
