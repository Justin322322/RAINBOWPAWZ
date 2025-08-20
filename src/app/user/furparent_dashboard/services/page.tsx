'use client';

import { useState, useEffect } from 'react';
import MapWithServicesList from '@/components/map/MapWithServicesList';
// Geolocation utils removed
type LocationData = {
  address: string;
  coordinates?: [number, number];
  source: 'profile' | 'default' | 'geolocation';
};
import { cacheManager } from '@/utils/cache';
import { withUserAuth } from '@/components/withAuth';

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



  // State for service providers
  const [serviceProviders, setServiceProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to extract distance value from string (e.g., "2.2 km away" -> 2.2)
  const extractDistanceValue = (distanceStr: string): number => {
    const match = distanceStr.match(/^(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : Infinity;
  };

  // Fetch service providers from API
  useEffect(() => {
    const fetchServiceProviders = async () => {
      try {
        setIsLoading(true);

        // Add a small delay to ensure the skeleton is visible
        await new Promise(resolve => setTimeout(resolve, 800));

        // Wait for location loading to complete to ensure we have coordinates if available
        if (isLoadingLocation) {
          return;
        }

        // Check if we have user location
        if (!userLocation) {
          setServiceProviders([]);
          return;
        }

        // Pass user location to the API for accurate distance calculation
        let apiUrl = `/api/service-providers?location=${encodeURIComponent(userLocation.address)}`;

        // Add coordinates if available for more accurate distance calculation
        if (userLocation.coordinates) {
          const [lat, lng] = userLocation.coordinates;
          apiUrl += `&lat=${lat}&lng=${lng}`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch service providers');
        }

        const data = await response.json();

        // Sort providers by distance (nearest to farthest)
        const sortedProviders = [...data.providers].sort((a, b) => {
          const distanceA = extractDistanceValue(a.distance);
          const distanceB = extractDistanceValue(b.distance);
          return distanceA - distanceB;
        });

        setServiceProviders(sortedProviders);
        // No pagination reset needed in new layout
      } catch {
        // Fallback to empty array if fetch fails
        setServiceProviders([]);
      } finally {
        // Ensure loading state is shown for at least a moment
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }
    };

    fetchServiceProviders();
  }, [userLocation, isLoadingLocation]);



  // Handle Get Directions click
  const handleGetDirections = (providerId: number) => {
    setSelectedProviderId(providerId);
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
            </div>
          </div>
        </div>
    </>
  );
}

// Export the component wrapped with withUserAuth HOC
export default withUserAuth(ServicesPage);
