'use client';

// NOTE: If there's still no cache and the page takes a long time to load,
// consider the following optimizations:
// 1. Check if the API route (/api/service-providers) has proper caching headers
// 2. Verify database query performance and add indexes if needed
// 3. Consider implementing server-side caching (Redis, etc.)
// 4. Review the 10-minute client-side cache duration and adjust if needed
// 5. Add loading states or skeleton screens for better UX during initial load

import { useState, useEffect, useCallback } from 'react';
import MapWithServicesList from '@/components/map/MapWithServicesList';
// Geolocation utils removed
type LocationData = {
  address: string;
  coordinates?: [number, number];
  source: 'profile' | 'default' | 'geolocation';
};
// Removed full-section skeleton; we now show skeletons only on provider cards
// OTP verification is handled by the layout

interface ServicesPageProps {
  userData?: any;
}

function ServicesPage({ userData }: ServicesPageProps) {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  // Get user location from profile - optimized approach
  useEffect(() => {
    const getLocation = async () => {
      setIsLoadingLocation(true);

      // Use userData prop first (from server), then fallback to session storage
      let currentUserData = userData;

      // Only check session storage if userData prop is not available
      if (!currentUserData && typeof window !== 'undefined') {
        const sessionUserData = sessionStorage.getItem('user_data');
        if (sessionUserData) {
          try {
            currentUserData = JSON.parse(sessionUserData);
          } catch (error) {
            console.error('Failed to parse user data from session storage:', error);
          }
        }
      }

      // Set location based on current user data
      let location: LocationData | null = null;
      if (currentUserData?.address && currentUserData.address.trim() !== '') {
        location = {
          address: currentUserData.address,
          source: 'profile' as const
        };
        
        // Geocode the address to get coordinates for consistent distance calculation
        try {
          const response = await fetch(`/api/geocoding?address=${encodeURIComponent(currentUserData.address)}`);
          if (response.ok) {
            const results = await response.json();
            if (results && results.length > 0) {
              const bestResult = results[0];
              location.coordinates = [bestResult.lat, bestResult.lon];
              console.log(`[Services Page] Geocoded coordinates for ${currentUserData.address}:`, location.coordinates);
            }
          }
        } catch (error) {
          console.error('Failed to geocode user address:', error);
        }
      }

      setUserLocation(location);
      setIsLoadingLocation(false);
    };

    // Run immediately
    getLocation().catch(console.error);

    // Listen for custom events (when profile is updated) - optimized
    const handleUserDataUpdate = (event: CustomEvent) => {
      if (event.detail) {
        // Update session storage with new data
        try {
          sessionStorage.setItem('user_data', JSON.stringify(event.detail));
        } catch (error) {
          console.error('Failed to update session storage:', error);
        }

        // Update location only if address actually changed
        const newAddress = event.detail.address?.trim() || '';
        const currentAddress = userLocation?.address?.trim() || '';
        
        if (newAddress !== currentAddress) {
          setUserLocation(newAddress ? {
            address: newAddress,
            source: 'profile' as const
          } : null);
        }
      }
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [userData, userLocation?.address]);

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

  // Function to extract distance value from string (e.g., "2.2 km away" -> 2.2)
  const extractDistanceValue = (distanceStr: string): number => {
    const match = distanceStr.match(/^(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : Infinity;
  };

  // Optimized fetch service providers with caching and pagination
  const fetchServiceProviders = useCallback(async (page: number = 1, forceRefresh: boolean = false) => {
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
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        location: encodeURIComponent(userLocation.address),
        limit: pagination.limit.toString(),
        offset: ((page - 1) * pagination.limit).toString()
      });

      // Add coordinates if available
      if (userLocation.coordinates) {
        const [lat, lng] = userLocation.coordinates;
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
      }

      const queryString = params.toString();
      const cacheKey = queryString;

      // Check cache first (2 minute cache for more frequent updates)
      if (!forceRefresh) {
        const cachedData = cache.get(cacheKey);
        const now = Date.now();
        const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

        if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
          setServiceProviders(cachedData.data.providers || []);
          setPagination(cachedData.data.pagination);
          setStatistics(cachedData.data.statistics || { totalProviders: 0, filteredCount: 0 });
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/service-providers?${queryString}`, {
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=600'
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
      const now = Date.now();
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
    } catch (error) {
      console.error('Error fetching service providers:', error);
      setServiceProviders([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
      setStatistics({ totalProviders: 0, filteredCount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, pagination.limit, cache, isLoadingLocation]);

  // Initial fetch and refetch when location changes
  useEffect(() => {
    if (!isLoadingLocation && userLocation) {
      // Force refresh on initial load to get latest data
      fetchServiceProviders(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation?.address, isLoadingLocation]);

  // Clear cache when component mounts to ensure fresh data
  useEffect(() => {
    setCache(new Map());
  }, []);



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

  return (
    <>
      {/* Hero Section with Pattern Background */}
      <div className="relative py-16 bg-[var(--primary-green)] -mt-20 md:-mt-24 pt-36 md:pt-40">
        <div className="absolute inset-0 bg-[url('/bg_4.png')] bg-repeat opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl modern-heading text-white text-center mb-4">
            Find the Right Pet Services with Ease
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
              
              {/* Loading Notice - First Time Load */}
              {(isLoading || isLoadingLocation) && serviceProviders.length === 0 && (
                <div className="mb-8 bg-green-50 border-2 border-[var(--primary-green)] rounded-xl p-6 flex items-start space-x-4">
                  <svg className="w-8 h-8 text-[var(--primary-green)] mt-1 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-lg text-gray-900 font-semibold mb-2">Loading service providers...</p>
                    <p className="text-base text-gray-700">This may take a moment on first load. We&apos;re finding the best service providers near you.</p>
                  </div>
                </div>
              )}

              <MapWithServicesList
                serviceProviders={serviceProviders}
                userLocation={userLocation}
                isLoading={isLoading || isLoadingLocation}
                selectedProviderId={selectedProviderId}
                onGetDirections={handleGetDirections}
              />

              {/* Statistics and Pagination */}
              {!isLoading && serviceProviders.length > 0 && (
                <div className="mt-8 space-y-6">


                  {/* Pagination Controls */}
                  {pagination.totalPages > 1 && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of {pagination.total} providers
                            {statistics.totalProviders > 0 && statistics.totalProviders !== pagination.total && (
                              <span className="text-gray-500"> (out of {statistics.totalProviders} total service providers)</span>
                            )}
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
