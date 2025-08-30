'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  CalendarIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import MapFilters, { FilterState, ServiceProvider as FilterServiceProvider } from './MapFilters';
import dynamic from 'next/dynamic';
import { SectionLoader } from '@/components/ui/SectionLoader';

// Import the map component with dynamic loading
const MapComponent = dynamic(
  () => import('./MapComponent'),
  {
    ssr: false,
    loading: () => (
      <SectionLoader
        message="Loading map..."
        minHeight="h-[500px]"
        withBackground={true}
        rounded={true}
      />
    )
  }
);

interface LocationData {
  address: string;
  coordinates?: [number, number];
  source: 'profile' | 'default' | 'geolocation';
}

interface MapWithServicesListProps {
  serviceProviders: FilterServiceProvider[];
  userLocation: LocationData | null;
  isLoading: boolean;
  selectedProviderId: number | null;
  onGetDirections: (providerId: number) => void;
}

export default function MapWithServicesList({
  serviceProviders,
  userLocation,
  isLoading,
  selectedProviderId,
  onGetDirections
}: MapWithServicesListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredProviders, setFilteredProviders] = useState<FilterServiceProvider[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    maxDistance: null,
    serviceType: '',
    minPackages: null,
    sortBy: 'distance',
    sortOrder: 'asc'
  });
  const [showServices, setShowServices] = useState(true); // For mobile toggle

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  useEffect(() => {
    const applyFilters = () => {
      // Destructure all needed filter properties once at the start
      const { 
        searchQuery, 
        maxDistance, 
        serviceType, 
        minPackages, 
        sortBy, 
        sortOrder 
      } = filters;

      let filtered = [...serviceProviders];

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(provider =>
          provider.name.toLowerCase().includes(query) ||
          provider.address.toLowerCase().includes(query)
        );
      }

      // Distance filter
      if (maxDistance !== null && maxDistance !== undefined) {
        filtered = filtered.filter(provider => 
          provider.distanceValue <= maxDistance
        );
      }

      // Service type filter
      if (serviceType) {
        filtered = filtered.filter(provider =>
          provider.type.toLowerCase().includes(serviceType.toLowerCase())
        );
      }

      // Package count filter
      if (minPackages !== null && minPackages !== undefined) {
        filtered = filtered.filter(provider =>
          provider.packages >= minPackages
        );
      }

      // Sorting
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'distance':
            comparison = a.distanceValue - b.distanceValue;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'packages':
            comparison = a.packages - b.packages;
            break;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      setFilteredProviders(filtered);
    };

    applyFilters();
  }, [filters, serviceProviders]);

  const mappedProvidersForFilter = useMemo(() => 
    serviceProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      address: provider.address,
      type: provider.type || 'cremation',
      distance: provider.distance || '',
      distanceValue: provider.distanceValue || 0,
      packages: provider.packages || 0
    })), [serviceProviders]);

  const mappedProvidersForMap = useMemo(() => 
    serviceProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      address: provider.address
    })), [serviceProviders]);

  const mappedFilteredProvidersForMap = useMemo(() => 
    filteredProviders.length > 0 ? filteredProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      address: provider.address
    })) : undefined, [filteredProviders]);

  // Pagination - use filtered providers for pagination
  const providersPerPage = 4; // Increased for vertical layout
  const providersForPagination = filteredProviders;
  const totalPages = Math.ceil(providersForPagination.length / providersPerPage);
  const currentProviders = providersForPagination.slice(
    (currentPage - 1) * providersPerPage,
    currentPage * providersPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Auto-show services on desktop, hide on mobile initially
  useEffect(() => {
    const checkScreenSize = () => {
      setShowServices(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isLoading) {
    return (
      <SectionLoader
        message="Loading services and map..."
        minHeight="min-h-[600px]"
        withBackground={true}
        withShadow={true}
        rounded={true}
        sectionId="services-map-grid"
      />
    );
  }

  return (
    <div className="w-full">
      {/* Filters */}
      {serviceProviders.length > 0 && (
        <div className="mb-6">
          <MapFilters
            providers={mappedProvidersForFilter}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowServices(!showServices)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors"
        >
          {showServices ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          {showServices ? 'Hide Services' : 'Show Services'}
          <span className="bg-white text-[var(--primary-green)] rounded-full px-2 py-0.5 text-xs font-semibold ml-1">
            {providersForPagination.length}
          </span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        {/* Services List - Left Side on Desktop */}
        <AnimatePresence>
          {showServices && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="lg:w-1/4 xl:w-1/3"
            >
              <div className="bg-white rounded-lg shadow-md border border-gray-200 h-full">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Service Providers
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({providersForPagination.length} found)
                    </span>
                  </h3>
                  {filteredProviders.length !== serviceProviders.length && (
                    <p className="text-sm text-[var(--primary-green)] mt-1">
                      Showing {filteredProviders.length} of {serviceProviders.length} providers
                    </p>
                  )}
                </div>

                <div className="p-4 h-full overflow-y-auto max-h-[550px]">
                  {providersForPagination.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPinIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h4 className="text-lg font-medium text-gray-700 mb-2">
                        {serviceProviders.length === 0 ? 'No service providers found' : 'No providers match your filters'}
                      </h4>
                      <p className="text-gray-500">
                        {serviceProviders.length === 0 
                          ? "We couldn't find any pet cremation services in your area."
                          : "Try adjusting your search criteria or filters to see more results."
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Provider Cards */}
                      <div className="space-y-4">
                        {currentProviders.map(provider => (
                          <div
                            key={provider.id}
                            className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                              selectedProviderId === provider.id 
                                ? 'border-[var(--primary-green)] bg-green-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900 text-sm">{provider.name}</h4>
                              <span className="text-xs bg-[var(--primary-green)] text-white px-2 py-1 rounded">
                                {provider.type}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2 flex items-start">
                              <MapPinIcon className="h-3 w-3 text-[var(--primary-green)] mr-1 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{provider.address?.replace(', Philippines', '')}</span>
                            </p>
                            
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm text-[var(--primary-green)] font-medium">
                                {provider.distance}
                              </span>
                              <span className="text-xs text-gray-500">
                                {provider.packages} package{provider.packages !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/user/furparent_dashboard/services/${provider.id}`}
                                className="flex-1 bg-[var(--primary-green)] text-white px-3 py-2 rounded text-xs font-medium hover:bg-[var(--primary-green-hover)] transition-colors text-center"
                              >
                                <CalendarIcon className="h-3 w-3 inline mr-1" />
                                Book Now
                              </Link>
                              <button
                                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                                onClick={() => onGetDirections(provider.id)}
                              >
                                Directions
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
                          <nav className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="p-1.5 rounded bg-[var(--primary-green)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeftIcon className="h-4 w-4" />
                            </button>

                            {Array.from({ length: totalPages }).map((_, index) => (
                              <button
                                key={index}
                                onClick={() => handlePageChange(index + 1)}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium ${
                                  currentPage === index + 1
                                    ? 'bg-[var(--primary-green)] text-white'
                                    : 'border border-[var(--primary-green)] text-[var(--primary-green)] hover:bg-green-50'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}

                            <button
                              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="p-1.5 rounded bg-[var(--primary-green)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronRightIcon className="h-4 w-4" />
                            </button>
                          </nav>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map - Right Side on Desktop */}
        <div className="lg:w-3/4 xl:w-2/3">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Map View</h3>
              {userLocation ? (
                <p className="text-sm text-gray-600 mt-1">
                  {filteredProviders.length > 0 && filteredProviders.length !== serviceProviders.length
                    ? `Showing ${filteredProviders.length} of ${serviceProviders.length} services near ${userLocation.address}`
                    : `Services near ${userLocation.address}`
                  }
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  Update your address in your profile to see services on the map
                </p>
              )}
            </div>

            <div className="p-4">
              <div className="w-full h-[600px] rounded-lg overflow-hidden">
                {serviceProviders.length === 0 || !userLocation ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg text-center p-8">
                    <div>
                      <MapPinIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">
                        {!userLocation 
                          ? "Please update your address in your profile to see nearby services on the map"
                          : "No service providers found to display on map"
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <MapComponent
                    userAddress={userLocation.address}
                    userCoordinates={userLocation.coordinates}
                    serviceProviders={mappedProvidersForMap}
                    filteredProviders={mappedFilteredProvidersForMap}
                    selectedProviderId={selectedProviderId}
                    maxDistance={filters.maxDistance}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 