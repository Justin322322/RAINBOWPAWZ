'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  ArchiveBoxIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterState {
  searchQuery: string;
  maxDistance: number | null;
  serviceType: string;
  minPackages: number | null;
  sortBy: 'distance' | 'name' | 'packages';
  sortOrder: 'asc' | 'desc';
}

export interface ServiceProvider {
  id: number;
  name: string;
  address: string;
  type: string;
  distance: string;
  distanceValue: number;
  packages: number;
  operational_hours?: string;
}

interface MapFiltersProps {
  providers: ServiceProvider[];
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  className?: string;
}

const DISTANCE_OPTIONS = [
  { value: null, label: 'Any distance' },
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 20, label: 'Within 20 km' },
  { value: 50, label: 'Within 50 km' },
  { value: 100, label: 'Within 100 km' }
];

const SERVICE_TYPE_OPTIONS = [
  { value: '', label: 'All services' },
  { value: 'cremation', label: 'Cremation Services' },
  { value: 'memorial', label: 'Memorial Services' },
  { value: 'burial', label: 'Burial Services' }
];

const PACKAGE_COUNT_OPTIONS = [
  { value: null, label: 'Any packages' },
  { value: 1, label: '1+ packages' },
  { value: 3, label: '3+ packages' },
  { value: 5, label: '5+ packages' },
  { value: 10, label: '10+ packages' }
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'name', label: 'Name' },
  { value: 'packages', label: 'Package Count' }
];

export default function MapFilters({ providers, filters, onFilterChange, className = '' }: MapFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Auto-expand on desktop for better UX
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsExpanded(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Update active filter count when filters change
  useEffect(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.maxDistance !== null) count++;
    if (filters.serviceType) count++;
    if (filters.minPackages !== null) count++;
    setActiveFilterCount(count);
  }, [filters]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ [key]: value });
  };

  const clearAllFilters = () => {
    onFilterChange({
      searchQuery: '',
      maxDistance: null,
      serviceType: '',
      minPackages: null,
      sortBy: 'distance',
      sortOrder: 'asc'
    });
  };

  const toggleSortOrder = () => {
    onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  const filteredProviders = (() => {
    let filtered = [...providers];

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(provider =>
        provider.name.toLowerCase().includes(query) ||
        provider.address.toLowerCase().includes(query)
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
        provider.type.toLowerCase().includes(filters.serviceType.toLowerCase())
      );
    }

    // Package count filter
    if (filters.minPackages !== null) {
      filtered = filtered.filter(provider =>
        provider.packages >= filters.minPackages!
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
          comparison = a.packages - b.packages;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  })();

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Header with search and toggle */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or location..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
            />
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isExpanded || activeFilterCount > 0
                ? 'bg-[var(--primary-green)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-[var(--primary-green)] rounded-full px-1.5 py-0.5 text-xs font-semibold min-w-[1.25rem] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear filters button */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
              title="Clear all filters"
            >
              <XMarkIcon className="h-4 w-4" />
              <span className="sr-only">Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable filter section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              {/* Quick stats */}
              <div className="mb-4 p-3 bg-white rounded-md border border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-[var(--primary-green)]">
                      {filteredProviders.length}
                    </div>
                    <div className="text-xs text-gray-500">Providers</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--primary-green)]">
                      {filteredProviders.reduce((sum, p) => sum + p.packages, 0)}
                    </div>
                    <div className="text-xs text-gray-500">Total Packages</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--primary-green)]">
                      {filteredProviders.length > 0 
                        ? `${Math.min(...filteredProviders.map(p => p.distanceValue)).toFixed(1)} km`
                        : '—'
                      }
                    </div>
                    <div className="text-xs text-gray-500">Nearest</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--primary-green)]">
                      {filteredProviders.length > 0 
                        ? `${Math.max(...filteredProviders.map(p => p.distanceValue)).toFixed(1)} km`
                        : '—'
                      }
                    </div>
                    <div className="text-xs text-gray-500">Farthest</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Distance filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPinIcon className="inline h-4 w-4 mr-1" />
                    Distance
                  </label>
                  <select
                    value={filters.maxDistance || ''}
                    onChange={(e) => updateFilter('maxDistance', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
                  >
                    {DISTANCE_OPTIONS.map(option => (
                      <option key={option.value || 'any'} value={option.value || ''}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service type filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BuildingStorefrontIcon className="inline h-4 w-4 mr-1" />
                    Service Type
                  </label>
                  <select
                    value={filters.serviceType}
                    onChange={(e) => updateFilter('serviceType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
                  >
                    {SERVICE_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package count filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ArchiveBoxIcon className="inline h-4 w-4 mr-1" />
                    Packages
                  </label>
                  <select
                    value={filters.minPackages || ''}
                    onChange={(e) => updateFilter('minPackages', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
                  >
                    {PACKAGE_COUNT_OPTIONS.map(option => (
                      <option key={option.value || 'any'} value={option.value || ''}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AdjustmentsHorizontalIcon className="inline h-4 w-4 mr-1" />
                    Sort By
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilter('sortBy', e.target.value as FilterState['sortBy'])}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent text-sm"
                    >
                      {SORT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={toggleSortOrder}
                      className="px-3 py-2 bg-gray-200 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-300 transition-colors text-sm"
                      title={`Sort ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active filters display */}
              {activeFilterCount > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {filters.searchQuery && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary-green)] text-white rounded-md text-xs">
                        Search: &quot;{filters.searchQuery}&quot;
                        <button
                          onClick={() => updateFilter('searchQuery', '')}
                          className="hover:bg-white hover:bg-opacity-20 rounded"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.maxDistance && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary-green)] text-white rounded-md text-xs">
                        Distance: {filters.maxDistance}km
                        <button
                          onClick={() => updateFilter('maxDistance', null)}
                          className="hover:bg-white hover:bg-opacity-20 rounded"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.serviceType && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary-green)] text-white rounded-md text-xs">
                        Type: {SERVICE_TYPE_OPTIONS.find(o => o.value === filters.serviceType)?.label}
                        <button
                          onClick={() => updateFilter('serviceType', '')}
                          className="hover:bg-white hover:bg-opacity-20 rounded"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.minPackages && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary-green)] text-white rounded-md text-xs">
                        Packages: {filters.minPackages}+
                        <button
                          onClick={() => updateFilter('minPackages', null)}
                          className="hover:bg-white hover:bg-opacity-20 rounded"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        {providers.length > 0 ? (
          <span>
            Showing {filteredProviders.length} of {providers.length} service providers
          </span>
        ) : (
          <span>No service providers available</span>
        )}
      </div>
    </div>
  );
} 