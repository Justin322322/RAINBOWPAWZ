'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  HomeIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import dynamic from 'next/dynamic';
import withOTPVerification from '@/components/withOTPVerification';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';
import SectionLoader from '@/components/ui/SectionLoader';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { motion } from 'framer-motion';
import { getUserLocation, LocationData } from '@/utils/geolocation';

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
  const defaultAddress = 'Balanga City, 2100 Bataan, Philippines';
  const [userLocation, setUserLocation] = useState<LocationData>({
    address: defaultAddress,
    source: 'default'
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  // Ref to hold map section element to scroll to when showing directions
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Get user location from profile when component mounts
  useEffect(() => {
    const getLocation = async () => {
      setIsLoadingLocation(true);
      try {
        // Only use profile address or default
        let location;

        if (userData?.address && userData.address.trim() !== '') {
          location = {
            address: userData.address,
            source: 'profile'
          };
        } else {
          location = {
            address: defaultAddress,
            source: 'default'
          };
        }

        setUserLocation(location);
      } catch (error) {
        // Fall back to default address
        setUserLocation({
          address: defaultAddress,
          source: 'default'
        });
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocation();
  }, [userData, defaultAddress]);

  // Load map after component mounts and location is determined
  useEffect(() => {
    if (!isLoadingLocation) {
      // Short delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        setIsMapVisible(true);
      }, 100);

      return () => clearTimeout(timer);
    }
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

        // Pass user location to the API for accurate distance calculation
        const response = await fetch(`/api/service-providers?location=${encodeURIComponent(userLocation.address)}`);

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
      } catch (error) {
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
  }, [userLocation.address]);

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
      {/* Navigation */}
      <FurParentNavbar activePage="services" userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`} />

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
              ) : (
                <>
                  <h2 className="text-lg md:text-xl text-[var(--primary-green)] text-center mb-6 modern-heading">
                    Based on your location, we&apos;ve found these nearby cremation centers:
                  </h2>

                  <div className="flex flex-col gap-4 items-center justify-center">
                    <div className="flex items-center justify-center w-full mb-2">
                      <span className="modern-text text-sm text-gray-600 flex items-center">
                        <HomeIcon className="h-4 w-4 mr-1 text-[var(--primary-green)]" />
                        Your location: {userLocation.address}
                        {userLocation.source === 'default' && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                            Default location (update your profile to change)
                          </span>
                        )}
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
                ) : isMapVisible && serviceProviders.length > 0 ? (
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
                ) : serviceProviders.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg text-center p-8">
                    <div>
                      <MapPinIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No service providers found to display on map</p>
                    </div>
                  </div>
                ) : (
                  <FurParentPageSkeleton type="services" />
                )}
              </div>

              {/* Footer text with skeleton loading */}
              {isLoading ? (
                <div className="mt-2 text-center">
                  <motion.div
                    className="h-4 bg-gray-200 rounded-md w-3/4 mx-auto mb-1"
                    initial={{ opacity: 0.6 }}
                    animate={{
                      opacity: [0.6, 1, 0.6],
                      transition: {
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                        delay: 0.8
                      }
                    }}
                  />
                  <motion.div
                    className="h-3 bg-gray-200 rounded-md w-1/2 mx-auto"
                    initial={{ opacity: 0.6 }}
                    animate={{
                      opacity: [0.6, 1, 0.6],
                      transition: {
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                        delay: 1.0
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="modern-caption mt-2 text-center">
                  Showing cremation services near your location in {userLocation.address}.
                  {userLocation.source === 'default' && (
                    <span className="block text-xs text-gray-500 mt-1">
                      To use your actual location, please update your address in your profile.
                    </span>
                  )}
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

// Export the component wrapped with OTP verification
export default withOTPVerification(ServicesPage);
