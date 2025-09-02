'use client';

import { useState, useEffect, useCallback } from 'react';
import MapWithServicesList from '@/components/map/MapWithServicesList';
// Geolocation utils removed
type LocationData = {
  address: string;
  coordinates?: [number, number];
  source: 'profile' | 'default' | 'geolocation';
};
import { cacheManager } from '@/utils/cache';
// OTP verification is handled by the layout

interface ServicesPageProps {
  userData?: any;
}

function ServicesPage({ userData }: ServicesPageProps) {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  // Get user location from profile - simplified approach
  useEffect(() => {
    const getLocation = () => {
      setIsLoadingLocation(true);

      // Always get fresh data from session storage
      let currentUserData = userData;

      // Get the most recent data from session storage
      if (typeof window !== 'undefined') {
        const sessionUserData = sessionStorage.getItem('user_data');
        if (sessionUserData) {
          try {
            const parsedData = JSON.parse(sessionUserData);
            // Use session storage data if it's more recent or if userData prop is not available
            currentUserData = parsedData;
          } catch (error) {
            console.error('Failed to parse user data from session storage:', error);
          }
        }
      }

      // Clear routing cache to remove old invalid entries (one-time fix)
      cacheManager.clearRoutingCache();

      // Set location based on current user data
      let location = null;
      if (currentUserData?.address && currentUserData.address.trim() !== '') {
        location = {
          address: currentUserData.address,
          source: 'profile' as const
        };
        console.log('✅ Setting location to:', location);
      } else {
        console.log('❌ No address found in user data');
      }

      setUserLocation(location);
      setIsLoadingLocation(false);
    };

    // Run immediately
    getLocation();

    // Also listen for storage changes (when profile is updated in another tab/component)
    const handleStorageChange = () => {
      getLocation();
    };

    // Listen for custom events (when profile is updated)
    const handleUserDataUpdate = (event: CustomEvent) => {
      if (event.detail) {
        // Update session storage with new data
        try {
          sessionStorage.setItem('user_data', JSON.stringify(event.detail));
        } catch (error) {
          console.error('Failed to update session storage:', error);
        }

        // Update location
        if (event.detail.address && event.detail.address.trim() !== '') {
          setUserLocation({
            address: event.detail.address,
            source: 'profile' as const
          });
        } else {
          setUserLocation(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [userData]);

  // Load map after component mounts and location is determined
  useEffect(() => {
    if (!isLoadingLocation) {
      // Short delay to ensure component is fully mounted


      
    }
    return () => {}; // Return empty cleanup function for else case
  }, [isLoadingLocation]);



  // State for service providers with pagination and caching
  const [serviceProviders, setServiceProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 20,
    hasMore: false
  });
  const [statistics, setStatistics] = useState({
    totalProviders: 0,
    filteredCount: 0
  });

  // Cache management
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());
  const [lastFetchParams, setLastFetchParams] = useState<string>('');

  // Function to extract distance value from string (e.g., "2.2 km away" -> 2.2)
  const extractDistanceValue = (distanceStr: string): number => {
    const match = distanceStr.match(/^(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : Infinity;
  };

  // Optimized fetch service providers with caching and pagination
  const fetchServiceProviders = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);

      // Wait for location loading to complete
      if (isLoadingLocation) {
        return;
      }

      // Check if we have user location
      if (!userLocation) {
        setServiceProviders([]);
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
        setStatistics({ totalProviders: 0, filteredCount: 0 });
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        location: encodeURIComponent(userLocation.address),
        limit: pagination.limit.toString(),
        offset: ((page - 1) * pagination.limit).toString(),
        sortBy: 'distance',
        sortOrder: 'asc'
      });

      // Add coordinates if available
      if (userLocation.coordinates) {
        const [lat, lng] = userLocation.coordinates;
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
      }

      const queryString = params.toString();
      const cacheKey = queryString;

      // Check cache first (5 minute cache)
      const cachedData = cache.get(cacheKey);
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        setServiceProviders(cachedData.data.providers || []);
        setPagination(cachedData.data.pagination);
        setStatistics(cachedData.data.statistics);
        setIsLoading(false);
        return;
      }

      // Skip if same parameters were used recently
      if (lastFetchParams === queryString && cache.has(cacheKey)) {
        const existingData = cache.get(cacheKey);
        if (existingData && (now - existingData.timestamp) < CACHE_DURATION) {
          setServiceProviders(existingData.data.providers || []);
          setPagination(existingData.data.pagination);
          setStatistics(existingData.data.statistics);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/service-providers?${queryString}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch service providers');
      }

      const data = await response.json();

      // Sort providers by distance (server-side sorting should handle this, but ensure client-side consistency)
      const sortedProviders = [...(data.providers || [])].sort((a, b) => {
        const distanceA = extractDistanceValue(a.distance);
        const distanceB = extractDistanceValue(b.distance);
        return distanceA - distanceB;
      });

      setServiceProviders(sortedProviders);
      setPagination(data.pagination);
      setStatistics(data.statistics);

      // Update cache
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, {
          data: {
            providers: sortedProviders,
            pagination: data.pagination,
            statistics: data.statistics
          },
          timestamp: now
        });
        return newCache;
      });

      setLastFetchParams(queryString);
    } catch (error) {
      console.error('Error fetching service providers:', error);
      setServiceProviders([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
      setStatistics({ totalProviders: 0, filteredCount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, pagination, cache, lastFetchParams, isLoadingLocation]);

  // Initial fetch and refetch when location changes
  useEffect(() => {
    if (!isLoadingLocation && userLocation) {
      fetchServiceProviders();
    }
  }, [userLocation, isLoadingLocation, fetchServiceProviders]);



  // Handle Get Directions click
  const handleGetDirections = (providerId: number) => {
    setSelectedProviderId(providerId);
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      fetchServiceProviders(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      currentPage: 1 // Reset to first page when changing page size
    }));
    fetchServiceProviders(1);
  };

  // No longer needed since we're only using profile data

  return (
    <>
      {/* Hero Section with Pattern Background */}
      <div className="relative py-16 bg-[var(--primary-green)] -mt-20 md:-mt-24 pt-36 md:pt-40">
        <div className="absolute inset-0 bg-[url('/bg_4.png')] bg-repeat opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl modern-heading text-white text-center mb-4">
            Find the Right Cremation Services with Ease
          </h1>
          <p className="text-xl text-white text-center max-w-3xl mx-auto modern-text font-light">
            No more endless searching—quickly locate and connect with trusted professionals in your area.
          </p>
        </div>
      </div>

        {/* Map and Services Section */}
        <div className="bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-8 -mt-16 relative z-20">
              
              <MapWithServicesList
                serviceProviders={serviceProviders}
                userLocation={userLocation}
                isLoading={isLoading}
                selectedProviderId={selectedProviderId}
                onGetDirections={handleGetDirections}
              />

              {/* Statistics and Pagination */}
              {!isLoading && serviceProviders.length > 0 && (
                <div className="mt-8 space-y-6">
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">
                        {statistics.totalProviders}
                      </div>
                      <div className="text-sm text-blue-700">Total Providers</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.filteredCount}
                      </div>
                      <div className="text-sm text-green-700">Nearby Providers</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">
                        {pagination.total}
                      </div>
                      <div className="text-sm text-purple-700">In Your Area</div>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {pagination.totalPages > 1 && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of {pagination.total} providers
                          </span>

                          <select
                            value={pagination.limit}
                            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                          >
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                            if (pageNum > pagination.totalPages) return null;

                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-2 text-sm border rounded-lg ${
                                  pageNum === pagination.currentPage
                                    ? 'bg-[var(--primary-green)] text-white border-[var(--primary-green)]'
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  );
}

// OTP verification is handled by the layout
export default ServicesPage;
