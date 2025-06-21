'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  HomeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import SectionLoader from '@/components/ui/SectionLoader';
import { motion } from 'framer-motion';
import { geocodeAddress, LocationData } from '@/utils/geolocation';
import { cacheManager } from '@/utils/cache';

// Import the map component with dynamic loading and standardized loading indicator
const MapComponent = dynamic(
  () => import('@/components/map/MapComponent'),
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

interface ServicesPageProps {
  userData?: any;
}

function ServicesPage({ userData }: ServicesPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [_isMapLoaded, _setIsMapLoaded] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  // Ref to hold map section element to scroll to when showing directions
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Get user location from profile when component mounts
  useEffect(() => {
    const getLocation = async () => {
      setIsLoadingLocation(true);
      try {
        // Get user data from props or session storage
        let userDataToUse = userData;

        // If userData is not provided as prop, try to get it from session storage
        if (!userDataToUse && typeof window !== 'undefined') {
          const sessionUserData = sessionStorage.getItem('user_data');
          if (sessionUserData) {
            try {
              userDataToUse = JSON.parse(sessionUserData);
            } catch (error) {
              console.error('Failed to parse user data from session storage:', error);
            }
          }
        }

        // Debug: Log user location detection
        console.log('🔍 [Services] User data available:', !!userDataToUse);
        console.log('🔍 [Services] User address:', userDataToUse?.address);

        // Clear routing cache to remove old invalid entries (one-time fix)
        console.log('🗑️ [Services] Clearing routing cache to fix trafficAware issue');
        cacheManager.clearRoutingCache();

        // Use profile address or default, and geocode to get coordinates
        let location;

        if (userDataToUse?.address && userDataToUse.address.trim() !== '') {
          console.log('✅ Using user profile address:', userDataToUse.address);
          console.log('🗺️ Geocoding user profile address to get coordinates...');

          try {
            // Geocode the user's profile address to get coordinates
            console.log('🗺️ [Frontend] Starting geocoding for address:', userDataToUse.address);
            const geocodedLocation = await geocodeAddress(userDataToUse.address);
            location = {
              address: userDataToUse.address,
              coordinates: geocodedLocation.coordinates,
              source: 'profile' as const
            };
            console.log('✅ Successfully geocoded user address to coordinates:', geocodedLocation.coordinates);
            console.log('✅ Final location object:', location);
          } catch (error) {
            console.error('❌ Failed to geocode user address:', error);
            console.error('❌ Error details:', error);
            // Fallback to address without coordinates
            location = {
              address: userDataToUse.address,
              source: 'profile' as const
            };
            console.log('⚠️ Using fallback location without coordinates:', location);
          }
        } else {
          console.log('⚠️ No user address found in profile');
          console.log('User data address was:', userDataToUse?.address);
          // Don't set a location if user hasn't provided one
          location = null;
        }

        setUserLocation(location);
      } catch (error) {
        console.error('Error getting user location:', error);
        // Don't fall back to a hardcoded address
        setUserLocation(null);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocation();
  }, [userData]);

  // Load map after component mounts and location is determined
  useEffect(() => {
    if (!isLoadingLocation) {
      // Short delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        setIsMapVisible(true);
      }, 100);

      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup function for else case
  }, [isLoadingLocation]);

  // Scroll to map when showing directions
  useEffect(() => {
    if (selectedProviderId !== null && mapSectionRef.current) {
      // Scroll to the map section with smooth behavior
      mapSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [selectedProviderId]);

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
          console.log('⏳ [Frontend] Waiting for location loading to complete...');
          return;
        }

        // Check if we have user location
        if (!userLocation) {
          console.log('❌ [Frontend] No user location available');
          setServiceProviders([]);
          return;
        }

        // Pass user location to the API for accurate distance calculation
        let apiUrl = `/api/service-providers?location=${encodeURIComponent(userLocation.address)}`;

        // Add coordinates if available for more accurate distance calculation
        console.log('🔍 [Frontend] Checking userLocation for coordinates:', userLocation);
        if (userLocation.coordinates) {
          const [lat, lng] = userLocation.coordinates;
          apiUrl += `&lat=${lat}&lng=${lng}`;
          console.log('🎯 [Frontend] Sending coordinates to API:', { lat, lng });
        } else {
          console.log('📍 [Frontend] No coordinates available, using address only:', userLocation.address);
          console.log('📍 [Frontend] userLocation.coordinates is:', userLocation.coordinates);
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
        // Reset to first page when providers change
        setCurrentPage(1);
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

  // Pagination
  const providersPerPage = 3;
  const totalPages = Math.ceil(serviceProviders.length / providersPerPage);
  const currentProviders = serviceProviders.slice(
    (currentPage - 1) * providersPerPage,
    currentPage * providersPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle Get Directions click
  const handleGetDirections = (providerId: number) => {
    setSelectedProviderId(providerId);
  };

  // No longer needed since we're only using profile data

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation is now handled by layout */}

      {/* Main Content */}
      <main>
        {/* Hero Section with Pattern Background */}
        <div className="relative py-16 bg-[var(--primary-green)]">
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

        {/* Map Section */}
        <div ref={mapSectionRef} className="bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-8 -mt-16 relative z-20">
              {isLoading ? (
                <>
                  {/* Skeleton for main heading */}
                  <div className="text-center mb-6">
                    <motion.div
                      className="h-6 bg-gray-200 rounded-md w-3/4 mx-auto mb-2"
                      initial={{ opacity: 0.6 }}
                      animate={{
                        opacity: [0.6, 1, 0.6],
                        transition: {
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "easeInOut"
                        }
                      }}
                    />
                    <motion.div
                      className="h-6 bg-gray-200 rounded-md w-1/2 mx-auto"
                      initial={{ opacity: 0.6 }}
                      animate={{
                        opacity: [0.6, 1, 0.6],
                        transition: {
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "easeInOut",
                          delay: 0.2
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-4 items-center justify-center">
                    {/* Skeleton for location text */}
                    <div className="flex items-center justify-center w-full mb-2">
                      <div className="flex items-center">
                        <motion.div
                          className="h-4 w-4 bg-gray-200 rounded-sm mr-2"
                          initial={{ opacity: 0.6 }}
                          animate={{
                            opacity: [0.6, 1, 0.6],
                            transition: {
                              repeat: Infinity,
                              duration: 1.5,
                              ease: "easeInOut",
                              delay: 0.4
                            }
                          }}
                        />
                        <motion.div
                          className="h-4 bg-gray-200 rounded-md w-64"
                          initial={{ opacity: 0.6 }}
                          animate={{
                            opacity: [0.6, 1, 0.6],
                            transition: {
                              repeat: Infinity,
                              duration: 1.5,
                              ease: "easeInOut",
                              delay: 0.6
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : userLocation ? (
                <>
                  <h2 className="text-lg md:text-xl text-[var(--primary-green)] text-center mb-6 modern-heading">
                    Based on your location, we&apos;ve found these nearby cremation centers:
                  </h2>

                  <div className="flex flex-col gap-4 items-center justify-center">
                    <div className="flex items-center justify-center w-full mb-2">
                      <span className="modern-text text-sm text-gray-600 flex items-center">
                        <HomeIcon className="h-4 w-4 mr-1 text-[var(--primary-green)]" />
                        Your location: {userLocation.address}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg md:text-xl text-[var(--primary-green)] text-center mb-6 modern-heading">
                    Pet Cremation Services
                  </h2>

                  <div className="flex flex-col gap-4 items-center justify-center">
                    <div className="flex items-center justify-center w-full mb-2">
                      <span className="modern-text text-sm text-gray-600 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1 text-[var(--primary-green)]" />
                        Please update your address in your profile to see nearby services
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Map Container with conditional rendering */}
              <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-inner relative">
                {isLoading ? (
                  <SectionLoader
                    message="Loading map..."
                    minHeight="h-full"
                    withBackground={true}
                    rounded={true}
                  />
                ) : isMapVisible && serviceProviders.length > 0 && userLocation ? (
                  <MapComponent
                    userAddress={userLocation.address}
                    userCoordinates={userLocation.coordinates}
                    serviceProviders={serviceProviders.map(provider => ({
                      id: provider.id,
                      name: provider.name,
                      address: provider.address
                    }))}
                    selectedProviderId={selectedProviderId}
                  />
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
                  <SectionLoader
                    message="Loading map..."
                    minHeight="h-full"
                    withBackground={true}
                    rounded={true}
                    sectionId="services-map"
                  />
                )}
              </div>

              {/* Footer text with optimized skeleton loading */}
              {isLoading ? (
                <div className="mt-2 text-center">
                  <div className="h-4 bg-gray-200 rounded-md w-3/4 mx-auto mb-1 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded-md w-1/2 mx-auto animate-pulse" />
                </div>
              ) : userLocation ? (
                <p className="modern-caption mt-2 text-center">
                  Showing cremation services near your location in {userLocation.address}.
                </p>
              ) : (
                <p className="modern-caption mt-2 text-center">
                  Update your address in your profile to see cremation services near you.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Service Providers Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLoading ? (
            <SectionLoader
              message="Loading service providers..."
              minHeight="min-h-[300px]"
              withBackground={true}
              withShadow={true}
              rounded={true}
              sectionId="services-grid"
            />
          ) : serviceProviders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <MapPinIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">No service providers found</h2>
              <p className="text-gray-500 mb-6">We couldn&apos;t find any pet cremation services in your area.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {currentProviders.map(provider => (
                  <div
                    key={provider.id}
                    className="rounded-lg overflow-hidden border border-gray-200 flex flex-col hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="bg-[var(--primary-green)] text-white p-4 text-center">
                      <h3 className="font-medium text-lg text-white">{provider.type}</h3>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="modern-heading text-xl mb-2">{provider.name}</h3>
                      <p className="modern-text text-sm text-gray-600 mb-2 flex items-start">
                        <MapPinIcon className="h-4 w-4 text-[var(--primary-green)] mr-1 flex-shrink-0 mt-0.5" />
                        <span>{provider.address?.replace(', Philippines', '')}</span>
                      </p>
                      <p className="modern-label text-green-600 mb-4">{provider.distance}</p>
                      <p className="modern-text text-sm text-gray-600 mb-6">{provider.packages} Packages Available</p>

                      <div className="mt-auto flex flex-col space-y-3">
                        <div className="flex justify-between">
                          <Link
                            href={`/user/furparent_dashboard/services/${provider.id}`}
                            className="bg-[var(--primary-green)] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--primary-green-hover)] transition-colors duration-300 flex items-center"
                          >
                            View Services
                          </Link>
                          <button
                            className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors duration-300"
                            onClick={() => handleGetDirections(provider.id)}
                          >
                            Get Directions
                          </button>
                        </div>
                        <Link
                          href={`/user/furparent_dashboard/services/${provider.id}`}
                          className="bg-[var(--primary-green-hover)] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--primary-green)] transition-colors duration-300 flex items-center justify-center"
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Book Now
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <nav className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md bg-[var(--primary-green)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>

                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handlePageChange(index + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md font-medium ${
                          currentPage === index + 1
                            ? 'bg-[var(--primary-green)] text-white'
                            : 'border border-[var(--primary-green)] text-[var(--primary-green)]'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md bg-[var(--primary-green)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Export the component directly (OTP verification is now handled by layout)
export default ServicesPage;
