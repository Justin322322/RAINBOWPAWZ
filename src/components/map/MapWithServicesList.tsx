'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  CalendarIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import MapFilters, { FilterState, ServiceProvider as FilterServiceProvider } from './MapFilters';
import dynamic from 'next/dynamic';
import { SectionLoader } from '@/components/ui/SectionLoader';

// Import the map component with dynamic loading and better performance
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

// Memoized provider card component for better performance
const ProviderCard = React.memo(function ProviderCard({
  provider,
  isSelected,
  onGetDirections
}: {
  provider: any;
  isSelected: boolean;
  onGetDirections: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-3 transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-[var(--primary-green)] bg-green-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onGetDirections(provider.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{provider.name}</h4>
        <span className="text-xs bg-[var(--primary-green)] text-white px-2 py-1 rounded">
          {provider.type}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-1 flex items-start">
        <MapPinIcon className="h-3 w-3 text-[var(--primary-green)] mr-1 flex-shrink-0 mt-0.5" />
        <span className="line-clamp-2">{provider.address?.replace(', Philippines', '')}</span>
      </p>

      {provider.operational_hours && provider.operational_hours !== 'Not specified' && (
        <p className="text-sm text-gray-600 mb-2 flex items-start">
          <ClockIcon className="h-3 w-3 text-[var(--primary-green)] mr-1 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">{provider.operational_hours}</span>
        </p>
      )}

      <div className="flex justify-between items-center mb-2">
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
          onClick={(e) => {
            e.stopPropagation();
            onGetDirections(provider.id);
          }}
        >
          Directions
        </button>
      </div>
    </motion.div>
  );
});

const MapWithServicesList = React.memo(function MapWithServicesList({
  serviceProviders,
  userLocation,
  isLoading,
  selectedProviderId,
  onGetDirections
}: MapWithServicesListProps) {
  const [currentPage, setCurrentPage] = useState(1);
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

  // Apply client-side filtering (same logic as MapFilters)
  const filteredProviders = useMemo(() => {
    let filtered = [...serviceProviders];

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(provider =>
        provider.name.toLowerCase().includes(query) ||
        (provider.address && provider.address.toLowerCase().includes(query))
      );
    }

    // Distance filter
    if (filters.maxDistance !== null && filters.maxDistance !== undefined) {
      const maxDistance = filters.maxDistance;
      filtered = filtered.filter(provider =>
        provider.distanceValue <= maxDistance
      );
    }

    // Service type filter
    if (filters.serviceType) {
      filtered = filtered.filter(provider =>
        (provider.type || 'cremation').toLowerCase().includes(filters.serviceType.toLowerCase())
      );
    }

    // Package count filter
    if (filters.minPackages !== null) {
      filtered = filtered.filter(provider =>
        (provider.packages || 0) >= filters.minPackages!
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'distance':
          comparison = a.distanceValue - b.distanceValue;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'packages':
          comparison = (a.packages || 0) - (b.packages || 0);
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [serviceProviders, filters]);

  const mappedProvidersForFilter = useMemo(() =>
    serviceProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      address: provider.address,
      type: provider.type || 'cremation',
      distance: provider.distance || '',
      distanceValue: provider.distanceValue || 0,
      packages: provider.packages || 0,
      operational_hours: provider.operational_hours || 'Not specified'
    })), [serviceProviders]);

  const mappedProvidersForMap = useMemo(() =>
    serviceProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      address: provider.address,
      operational_hours: provider.operational_hours || 'Not specified'
    })), [serviceProviders]);

  const mappedFilteredProvidersForMap = useMemo(() =>
    filteredProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      address: provider.address,
      operational_hours: provider.operational_hours || 'Not specified'
    })), [filteredProviders]);

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

  // When loading, render placeholder cards in the list and keep the map frame visible

  // Skeleton component for filters
  const FilterSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      {/* Header skeleton */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Search input skeleton */}
          <div className="flex-1">
            <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
          {/* Filter button skeleton */}
          <div className="h-10 w-20 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
      </div>

      {/* Expanded filter section skeleton */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        {/* Quick stats skeleton */}
        <div className="mb-4 p-3 bg-white rounded-md border border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx}>
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Filter controls skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx}>
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Results count skeleton */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Filters */}
      {isLoading ? (
        <FilterSkeleton />
      ) : serviceProviders.length > 0 ? (
        <div className="mb-6">
          <MapFilters
            providers={mappedProvidersForFilter}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
      ) : null}

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
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Services List - Left Side on Desktop */}
        <AnimatePresence>
          {showServices && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="lg:w-1/4 xl:w-1/3 lg:self-start"
            >
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
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

                <div className="p-4">
                  {isLoading ? (
                    <>
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="border rounded-lg p-3 animate-pulse">
                            <div className="flex justify-between items-start mb-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-5 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                            <div className="flex justify-between items-center mb-2">
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                              <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : providersForPagination.length === 0 ? (
                    <div className="text-center py-8">
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
                      <div className="space-y-3">
                        {currentProviders.map(provider => (
                          <ProviderCard
                            key={provider.id}
                            provider={provider}
                            isSelected={selectedProviderId === provider.id}
                            onGetDirections={onGetDirections}
                          />
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-4 pt-3 border-t border-gray-200">
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
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Map View</h3>
              {userLocation ? (
                <p className="text-sm text-gray-600 mt-1">
                  {filteredProviders.length > 0
                    ? `${filteredProviders.length} service${filteredProviders.length !== 1 ? 's' : ''} near ${userLocation.address}`
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
              <div className="w-full h-[500px] rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />
                ) : serviceProviders.length === 0 || !userLocation ? (
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
});

export default MapWithServicesList;