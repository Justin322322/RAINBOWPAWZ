'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon
} from '@heroicons/react/24/outline';

import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';
import { handleImageError } from '@/utils/imageUtils';
import ReviewsList from '@/components/reviews/ReviewsList';
import withUserAuth from '@/components/withUserAuth';
// LocationData type removed with geolocation utils
type LocationData = {
  address: string;
  coordinates?: [number, number];
  source: 'profile' | 'default' | 'geolocation';
};

interface ServiceDetailPageProps {
  userData?: any;
}

function ServiceDetailPage({ userData }: ServiceDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id;

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedPet, setSelectedPet] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [pets, setPets] = useState<any[]>([]);
  const [_showBookingForm, setShowBookingForm] = useState(false);
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [_bookingSuccess, setBookingSuccess] = useState(false);
  const [_bookingError, setBookingError] = useState<string | null>(null);
  const [_selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [_selectedTimeSlot, setSelectedTimeSlot] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('packages');

  // Will fetch real data from API

  // Mock data for user's pets
  const mockPets = useMemo(() => [
    { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: 8 },
    { id: 2, name: 'Luna', species: 'Cat', breed: 'Siamese', age: 5 }
  ], []);

  // State for package carousel
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [sortBy, setSortBy] = useState('all');

  // Get user location from profile with coordinates support
  // Remove hardcoded default address
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

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

      // Set location based on current user data
      let location = null;
      if (currentUserData?.address && currentUserData.address.trim() !== '') {
        location = {
          address: currentUserData.address,
          source: 'profile' as const
        };
      }

      setUserLocation(location);
      setIsLoadingLocation(false);
    };

    // Run immediately
    getLocation();

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

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [userData]);

  // Function to sort packages based on selected criteria
  const getSortedPackages = () => {
    if (!provider || !provider.packages) return [];

    let sortedPackages = [...provider.packages];

    switch (sortBy) {
      case 'price_low':
        return sortedPackages.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sortedPackages.sort((a, b) => b.price - a.price);
      default:
        return sortedPackages;
    }
  };

  useEffect(() => {
    // Wait for location loading to complete to ensure we have coordinates if available
    if (isLoadingLocation) {
      return;
    }

    // Fetch real provider data
    setLoading(true);

    const fetchData = async () => {
      try {
        // Fetch provider details with user location for accurate distance calculation (if available)
        let apiUrl = `/api/service-providers/${providerId}`;
        
                 if (userLocation) {
           apiUrl += `?location=${encodeURIComponent(userLocation.address)}`;
         }

        const providerResponse = await fetch(apiUrl);

        if (!providerResponse.ok) {
          throw new Error('Failed to fetch provider details');
        }

        const providerData = await providerResponse.json();

        // Fetch packages for this provider
        const packagesResponse = await fetch(`/api/packages?providerId=${providerId}`);

        if (!packagesResponse.ok) {
          throw new Error('Failed to fetch packages');
        }

        const packagesData = await packagesResponse.json();

        // Process packages to fetch images
        const packages = packagesData.packages || [];

        // Get images for each package
        const packagesWithImages = await Promise.all(
          packages.map(async (pkg: any) => {
            try {
              // Use our imageUtils function to get the verified images
              const responseImages = await fetch(`/api/packages/available-images?id=${pkg.id}`);
              const imagesData = await responseImages.json();

              if (imagesData.success && imagesData.imagesFound && imagesData.imagesFound.length > 0) {
                return { ...pkg, images: imagesData.imagesFound };
              }

              return pkg;
            } catch {
              return pkg;
            }
          })
        );

        // Combine provider data with packages
        const providerWithPackages = {
          ...providerData.provider,
          packages: packagesWithImages
        };

        setProvider(providerWithPackages);

        // Fetch user's pets
        try {
          const petsResponse = await fetch('/api/pets');
          if (petsResponse.ok) {
            const petsData = await petsResponse.json();
            setPets(petsData.pets || []);
          } else {
            // Fallback to mock pets if API fails
            setPets(mockPets);
          }
        } catch {
          setPets(mockPets);
        }
      } catch {
        setError('Failed to load provider details');
      } finally {
        setLoading(false);
      }
    };

    if (providerId && !isLoadingLocation) {
      fetchData();
    }
  }, [providerId, userLocation, isLoadingLocation, mockPets]);

  const handleNextPackage = () => {
    const sortedPackages = getSortedPackages();
    if (sortedPackages.length > 3 && currentPackageIndex < sortedPackages.length - 3) {
      setCurrentPackageIndex(currentPackageIndex + 3);
    }
  };

  const handlePrevPackage = () => {
    if (currentPackageIndex >= 3) {
      setCurrentPackageIndex(currentPackageIndex - 3);
    }
  };

  // Reset package index when sort criteria changes
  useEffect(() => {
    setCurrentPackageIndex(0);
  }, [sortBy]);

  const handleViewPackage = (packageId: number) => {
    router.push(`/user/furparent_dashboard/services/${providerId}/packages/${packageId}`);
  };

  const _handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService || !selectedPet || !bookingDate || !bookingTime) {
      setBookingError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // Get the selected service details
      const _service = provider.services.find((s: any) => s.id === selectedService);
      const pet = pets.find(p => p.id === selectedPet);

      // Prepare booking data
      const bookingData = {
        serviceId: selectedService,
        providerId: provider.id,
        providerName: provider.name,
        date: bookingDate,
        time: bookingTime,
        petId: selectedPet,
        petName: pet?.name,
        petType: pet?.species,
        specialRequests: specialRequests
      };

      // Send booking request to API
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (response.ok) {
        setBookingSuccess(true);
        // Reset form
        setSelectedService(null);
        setSelectedPet(null);
        setBookingDate('');
        setBookingTime('');
        setSpecialRequests('');
        setShowBookingForm(false);

        // Redirect to bookings page after a delay
        setTimeout(() => {
          router.push('/user/furparent_dashboard/bookings');
        }, 3000);
      } else {
        setBookingError(data.error || 'Failed to create booking');
      }
    } catch {
      setBookingError('An error occurred while creating your booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleDateTimeSelected = (date: string, timeSlot: any | null) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation is now handled by layout */}

      {loading ? (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <FurParentPageSkeleton type="package" />
        </div>
      ) : error ? (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 p-8 rounded-lg text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-red-800 mb-3">Provider Not Found</h2>
            <p className="text-red-700 mb-6 max-w-lg mx-auto">{error || "We couldn't find the service provider you're looking for. It may have been removed or is temporarily unavailable."}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Go Back
              </button>
              <Link
                href="/user/furparent_dashboard/services"
                className="px-6 py-3 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
              >
                Browse All Providers
              </Link>
            </div>
          </div>
        </div>
      ) : provider ? (
        <>
          {/* Provider Banner */}
          <div className="relative bg-gray-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 text-white">
            <div className="absolute inset-0 overflow-hidden">
              {provider.profile_picture ? (
                <Image
                  src={`/api/image/profile-pictures/${provider.id}/${provider.profile_picture.split('/').pop()}`}
                  alt={`${provider.name} Profile`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="absolute inset-0 bg-[url('/bg_2.png')] bg-cover bg-center"></div>`;
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-[url('/bg_2.png')] bg-cover bg-center" />
              )}
            </div>
            <div className="absolute inset-0 bg-[var(--primary-green-light)] mix-blend-multiply" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-green)] via-transparent to-transparent md:bg-gradient-to-r" aria-hidden="true" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 md:py-32 text-center md:text-left">
              <div className="md:w-3/5 lg:w-1/2">
                <div className="flex flex-col items-center md:flex-row gap-4 mb-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">{provider.name}</h1>
                  <div className="flex-shrink-0 flex items-center bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    <StarIcon className="h-5 w-5 text-yellow-300 mr-2" />
                    <span className="font-semibold text-white">{provider.rating ? provider.rating.toFixed(1) : 'New'}</span>
                  </div>
                </div>
                <p className="mt-4 text-lg text-white/80 flex items-center justify-center md:justify-start">
                  <MapPinIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{provider.address?.replace(', Philippines', '')}</span>
                </p>
                <div className="mt-8 border-l-4 border-white/30 pl-6 max-w-md mx-auto md:mx-0">
                  <p className="text-white/90 text-lg italic leading-relaxed">
                    "{provider.description || 'Professional pet cremation services with care and compassion.'}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Back button and Tabs */}
              <div className="flex justify-between items-center mb-8">
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  <span>Back to Services</span>
                </button>
                
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('packages')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'packages' ? 'bg-white text-[var(--primary-green)] shadow' : 'text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Packages
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'reviews' ? 'bg-white text-[var(--primary-green)] shadow' : 'text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Reviews
                  </button>
                </div>
              </div>

              {activeTab === 'packages' && (
                <div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <h2 className="text-4xl font-bold text-[var(--primary-green)]">Our Packages</h2>
                    <div className="mt-4 md:mt-0 flex items-center">
                      <span className="mr-2 text-gray-700">Sort By:</span>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        >
                          <option value="all">All</option>
                          <option value="price_low">Price: Low to High</option>
                          <option value="price_high">Price: High to Low</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-gray-300 mb-8"></div>

                  {/* Packages Carousel */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <button
                        onClick={handlePrevPackage}
                        disabled={currentPackageIndex === 0}
                        className="p-2 rounded-full bg-[var(--primary-green)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-6 w-6" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mx-4">
                        {getSortedPackages().slice(currentPackageIndex, currentPackageIndex + 3).map((pkg: any) => (
                          <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <div className="h-48 relative overflow-hidden bg-gray-100">
                              {pkg.images && pkg.images.length > 0 ? (
                                <Image
                                  src={pkg.images[0]}
                                  alt={pkg.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => handleImageError(e)}
                                />
                              ) : (
                                <Image
                                  src={`/bg_4.png`}
                                  alt={pkg.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => handleImageError(e)}
                                />
                              )}
                              {/* Price Badge */}
                              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                                <span className="text-[var(--primary-green)] font-bold text-lg">
                                  ₱{pkg.price.toLocaleString()}
                                  {pkg.pricePerKg > 0 && <span className="text-xs">+/kg</span>}
                                </span>
                              </div>
                            </div>

                            <div className="p-5">
                              {/* Package Name */}
                              <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-2">{pkg.name}</h3>

                              {/* Package Tags */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {pkg.category && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {pkg.category}
                                  </span>
                                )}
                                {pkg.cremationType && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {pkg.cremationType}
                                  </span>
                                )}
                                {pkg.processingTime && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <ClockIcon className="w-3 h-3 mr-1" />
                                    {pkg.processingTime}
                                  </span>
                                )}
                              </div>

                              {/* Description Preview */}
                              {pkg.description && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                  {pkg.description}
                                </p>
                              )}

                              {/* Key Inclusions */}
                              {pkg.inclusions && pkg.inclusions.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Includes:</h4>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {pkg.inclusions.slice(0, 3).map((inclusion: string, index: number) => (
                                      <li key={index} className="flex items-center">
                                        <CheckCircleIcon className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                        <span className="line-clamp-1">{inclusion}</span>
                                      </li>
                                    ))}
                                    {pkg.inclusions.length > 3 && (
                                      <li className="text-[var(--primary-green)] font-medium">
                                        +{pkg.inclusions.length - 3} more inclusions
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}

                              {/* Supported Pet Types */}
                              {pkg.supportedPetTypes && pkg.supportedPetTypes.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Suitable for:</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {pkg.supportedPetTypes.slice(0, 4).map((petType: string, index: number) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700"
                                      >
                                        {petType}
                                      </span>
                                    ))}
                                    {pkg.supportedPetTypes.length > 4 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        +{pkg.supportedPetTypes.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Price Per Kg Indicator */}
                              {pkg.pricePerKg > 0 && (
                                <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                                  <div className="flex items-center text-xs text-blue-700">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>₱{pkg.pricePerKg.toLocaleString()}/kg additional</span>
                                  </div>
                                </div>
                              )}

                              {/* Delivery Info */}
                              {pkg.deliveryFeePerKm && (
                                <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center text-xs text-gray-600">
                                    <MapPinIcon className="w-3 h-3 mr-1" />
                                    <span>Delivery: ₱{pkg.deliveryFeePerKm}/km</span>
                                  </div>
                                </div>
                              )}

                              {/* Action Button */}
                              <button
                                onClick={() => handleViewPackage(pkg.id)}
                                className="w-full px-4 py-3 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors font-semibold text-sm"
                              >
                                View Full Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleNextPackage}
                        disabled={getSortedPackages().length <= 3 || currentPackageIndex >= getSortedPackages().length - 3}
                        className="p-2 rounded-full bg-[var(--primary-green)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Pagination dots */}
                    <div className="flex justify-center space-x-2">
                      {getSortedPackages().length > 0 && Array.from({ length: Math.ceil(getSortedPackages().length / 3) }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPackageIndex(index * 3)}
                          className={`h-2 w-2 rounded-full ${currentPackageIndex / 3 === index ? 'bg-[var(--primary-green)]' : 'bg-gray-300'}`}
                          aria-label={`Go to page ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'reviews' && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-[var(--primary-green)] mb-2">What Our Customers Say</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Read authentic reviews from pet parents who have trusted us with their beloved companions.
                    </p>
                  </div>
                  <ReviewsList providerId={Number(providerId)} className="" />
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}


    </div>
  );
}

// Export the component wrapped with auth HOC
export default withUserAuth(ServiceDetailPage);
