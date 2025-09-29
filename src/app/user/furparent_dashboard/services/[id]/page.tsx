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

import { handleImageError } from '@/utils/imageUtils';
import ReviewsList from '@/components/reviews/ReviewsList';
import StaticMapComponent from '@/components/map/StaticMapComponent';
// OTP verification is handled by the layout
import { formatPrice } from '@/utils/numberUtils';
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
  const [packageImageIndexes, setPackageImageIndexes] = useState<Record<number, number>>({});
  const [sortBy, setSortBy] = useState('all');

  // Get user location from profile with coordinates support
  // Remove hardcoded default address
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    const getLocation = () => {
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
          console.error('Packages API error:', packagesResponse.status, packagesResponse.statusText);
          throw new Error(`Failed to fetch packages: ${packagesResponse.status} ${packagesResponse.statusText}`);
        }

        const packagesData = await packagesResponse.json();
        console.log('Packages data received:', packagesData);

        // The packages already contain images from the database via the /api/packages endpoint
        const packages = packagesData.packages || [];
        console.log('Packages array:', packages);

        // Combine provider data with packages (images are already included)
        const providerWithPackages = {
          ...providerData.provider,
          packages: packages
        };

        // Check if provider has no packages
        if (packages.length === 0) {
          console.warn(`Provider ${providerId} has no packages available`);
        }

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
      } catch (error) {
        console.error('Error fetching service details:', error);
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

  // Functions for individual package image carousels
  const handlePackageImageNext = (packageId: number, imageCount: number) => {
    setPackageImageIndexes(prev => ({
      ...prev,
      [packageId]: ((prev[packageId] || 0) + 1) % imageCount
    }));
  };

  const handlePackageImagePrev = (packageId: number, imageCount: number) => {
    setPackageImageIndexes(prev => ({
      ...prev,
      [packageId]: ((prev[packageId] || 0) - 1 + imageCount) % imageCount
    }));
  };

  const handlePackageImageDot = (packageId: number, imageIndex: number) => {
    setPackageImageIndexes(prev => ({
      ...prev,
      [packageId]: imageIndex
    }));
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

      {error ? (
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

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                <div className="w-full lg:w-1/2 order-2 lg:order-1">
                  <div className="flex flex-col items-center lg:items-start gap-3 lg:gap-4 mb-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight text-center lg:text-left">{provider.name}</h1>
                    <div className="flex-shrink-0 flex items-center bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                      <StarIcon className="h-5 w-5 text-yellow-300 mr-2" />
                      <span className="font-semibold text-white">{provider.rating ? provider.rating.toFixed(1) : 'New'}</span>
                    </div>
                  </div>
                  <p className="mt-3 lg:mt-4 text-base lg:text-lg text-white/80 flex items-center justify-center lg:justify-start">
                    <MapPinIcon className="h-4 w-4 lg:h-5 lg:w-5 mr-2 flex-shrink-0" />
                    <span className="text-center lg:text-left">{provider.address?.replace(', Philippines', '')}</span>
                  </p>
                  {provider.operational_hours && provider.operational_hours !== 'Not specified' && (
                    <p className="mt-2 lg:mt-2 text-base lg:text-lg text-white/80 flex items-center justify-center lg:justify-start">
                      <ClockIcon className="h-4 w-4 lg:h-5 lg:w-5 mr-2 flex-shrink-0" />
                      <span className="text-center lg:text-left">{provider.operational_hours}</span>
                    </p>
                  )}
                  <div className="mt-6 lg:mt-8 border-l-4 border-white/30 pl-4 lg:pl-6 max-w-md mx-auto lg:mx-0">
                    <p className="text-white/90 text-base lg:text-lg italic leading-relaxed text-center lg:text-left">
                      &quot;{provider.description || 'Professional pet cremation services with care and compassion.'}&quot;
                    </p>
                  </div>
                </div>
                
                                 {/* Map Section - Right Side */}
                 <div className="w-full lg:w-1/2 order-1 lg:order-2 mb-6 lg:mb-0">
                   <StaticMapComponent
                     providerAddress={provider.address}
                     providerName={provider.name}
                     className="w-full h-64 sm:h-72 md:h-80 lg:h-96"
                   />
                 </div>
              </div>
            </div>
          </div>

                     {/* Main Content */}
           <div className="bg-gray-50 py-8 sm:py-12">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               {/* Back button and Tabs */}
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                 <button
                   onClick={() => router.back()}
                   className="flex items-center justify-center sm:justify-start text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
                 >
                   <ArrowLeftIcon className="h-5 w-5 mr-2" />
                   <span>Back to Services</span>
                 </button>
                 
                 <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg self-center sm:self-auto">
                   <button
                     onClick={() => setActiveTab('packages')}
                     className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md ${
                       activeTab === 'packages' ? 'bg-white text-[var(--primary-green)] shadow' : 'text-gray-600 hover:bg-gray-300'
                     }`}
                   >
                     Packages
                   </button>
                   <button
                     onClick={() => setActiveTab('reviews')}
                     className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md ${
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
                     <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--primary-green)] text-center md:text-left mb-4 md:mb-0">Our Packages</h2>
                     <div className="flex items-center justify-center md:justify-start">
                       <span className="mr-2 text-gray-700 text-sm sm:text-base">Sort By:</span>
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
 
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full mx-2 sm:mx-4">
                         {getSortedPackages().slice(currentPackageIndex, currentPackageIndex + 3).map((pkg: any) => (
                          <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <div className="h-48 relative overflow-hidden bg-gray-100 group">
                              {pkg.images && pkg.images.length > 0 ? (
                                <Image
                                  src={pkg.images[packageImageIndexes[pkg.id] || 0]}
                                  alt={pkg.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => handleImageError(e)}
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                  <div className="text-center p-4">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-500">No image available</p>
                                  </div>
                                </div>
                              )}

                              {/* Navigation arrows - only show if there are multiple images */}
                              {pkg.images && pkg.images.length > 1 && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePackageImagePrev(pkg.id, pkg.images.length);
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePackageImageNext(pkg.id, pkg.images.length);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  >
                                    <ChevronRightIcon className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {/* Dot indicators - only show if there are multiple images */}
                              {pkg.images && pkg.images.length > 1 && (
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                  {pkg.images.map((_: any, index: number) => (
                                    <button
                                      key={index}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePackageImageDot(pkg.id, index);
                                      }}
                                      className={`h-2 w-2 rounded-full transition-all duration-200 ${
                                        (packageImageIndexes[pkg.id] || 0) === index
                                          ? 'bg-white scale-110'
                                          : 'bg-white/50 hover:bg-white/80'
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Price Badge */}
                              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                                <span className="text-[var(--primary-green)] font-bold text-lg">
                                  ₱{formatPrice(pkg.price)}
                                  {pkg.overageFeePerKg > 0 && <span className="text-xs">+/kg</span>}
                                </span>
                              </div>
                            </div>

                            <div className="p-5">
                              {/* Package Name */}
                              <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-2">{pkg.name}</h3>

                              {/* Package Tags */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {pkg.category && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {pkg.category}
                                  </span>
                                )}
                                {pkg.cremationType && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {pkg.cremationType}
                                  </span>
                                )}
                                {pkg.processingTime && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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

                              {/* Weight-Based Pricing */}
                              {pkg.pricingMode === 'by_size' && pkg.sizePricing && Array.isArray(pkg.sizePricing) && pkg.sizePricing.length > 0 && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center mb-2">
                                    <svg className="h-4 w-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    <span className="text-sm font-semibold text-gray-800">Weight-Based Pricing</span>
                                  </div>
                                  <div className="space-y-2">
                                    {pkg.sizePricing.map((tier: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-700">
                                          {tier.sizeCategory === 'small' ? 'Small' : 
                                           tier.sizeCategory === 'medium' ? 'Medium' :
                                           tier.sizeCategory === 'large' ? 'Large' :
                                           tier.sizeCategory === 'extra_large' ? 'Extra Large' : 
                                           tier.sizeCategory} ({tier.weightRangeMin}-{tier.weightRangeMax || '∞'}kg)
                                        </span>
                                        <span className="font-semibold text-gray-900">₱{formatPrice(Number(tier.price))}</span>
                                      </div>
                                    ))}
                                    {Number(pkg.overageFeePerKg || 0) > 0 && (
                                      <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-2">
                                        <span className="text-gray-700">Overage fee per kg</span>
                                        <span className="font-semibold text-gray-900">₱{formatPrice(Number(pkg.overageFeePerKg))}/kg</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Kg Price (for non-weight-based pricing) */}
                              {pkg.pricingMode !== 'by_size' && (
                                <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 font-medium">Kg Price:</span>
                                    <span className="text-gray-900 font-semibold">
                                      {Number(pkg.overageFeePerKg || 0) > 0 ? (
                                        <>₱{formatPrice(Number(pkg.overageFeePerKg))}/kg</>
                                      ) : (
                                        <span className="text-gray-500">Not applicable</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Delivery Info */}
                              {pkg.deliveryFeePerKm && (
                                <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center text-xs text-gray-600">
                                    <MapPinIcon className="w-3 h-3 mr-1" />
                                    <span>Delivery: ₱{formatPrice(pkg.deliveryFeePerKm)}/km</span>
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
                   <div className="text-center mb-6 sm:mb-8">
                     <h2 className="text-2xl sm:text-3xl font-bold text-[var(--primary-green)] mb-2">What Our Customers Say</h2>
                     <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base px-4 sm:px-0">
                       Read authentic reviews from pet parents who have trusted us with their beloved companions.
                     </p>
                   </div>
                   <ReviewsList providerId={Number(providerId)} className="" />
                 </div>
               )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Provider Banner (static shell when provider not yet available) */}
          <div className="relative bg-gray-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 text-white">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[url('/bg_2.png')] bg-cover bg-center" />
            </div>
            <div className="absolute inset-0 bg-[var(--primary-green-light)] mix-blend-multiply" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-green)] via-transparent to-transparent md:bg-gradient-to-r" aria-hidden="true" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 text-center lg:text-left" />
          </div>

          {/* Main Content shell */}
          <div className="bg-gray-50 py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                <button
                  onClick={() => router.back()}
                  className="flex items-center justify-center sm:justify-start text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  <span>Back to Services</span>
                </button>
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg self-center sm:self-auto">
                  <span className="px-3 sm:px-4 py-2 text-sm font-medium rounded-md bg-white text-[var(--primary-green)] shadow">Packages</span>
                  <span className="px-3 sm:px-4 py-2 text-sm font-medium rounded-md text-gray-600">Reviews</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}


    </div>
  );
}

// OTP verification is handled by the layout
export default ServiceDetailPage;
