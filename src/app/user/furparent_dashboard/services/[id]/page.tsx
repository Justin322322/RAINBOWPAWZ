'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';

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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Mock data for service providers
  const serviceProviders = [
    {
      id: 1,
      name: "Rainbow Bridge Pet Cremation",
      city: 'Capitol Drive, Balanga City, Bataan',
      distance: '0.5 km away',
      type: 'Pet Cremation Services',
      address: 'Capitol Drive, Balanga City, Bataan, Philippines',
      phone: '(123) 456-7890',
      email: 'info@rainbowbridge.com',
      description: 'Compassionate pet cremation services with personalized memorials. We provide dignified and respectful end-of-life care for your beloved companions. Our team understands the deep bond between pets and their families, and we strive to honor that connection through our thoughtful services.',
      packages: [
        {
          id: 1,
          name: 'Basic Cremation',
          description: 'Simple cremation service with standard urn',
          category: 'Communal',
          cremationType: 'Standard',
          processingTime: '2-3 days',
          price: 3500,
          inclusions: ['Standard clay urn', 'Memorial certificate', 'Paw print impression'],
          addOns: ['Personalized nameplate (+₱500)', 'Photo frame (+₱800)'],
          conditions: 'For pets up to 50 lbs. Additional fees may apply for larger pets.',
          images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
        },
        {
          id: 2,
          name: 'Premium Cremation',
          description: 'Private cremation with premium urn and memorial certificate',
          category: 'Private',
          cremationType: 'Premium',
          processingTime: '1-2 days',
          price: 5500,
          inclusions: ['Wooden urn with nameplate', 'Memorial certificate', 'Paw print impression', 'Fur clipping'],
          addOns: ['Memorial video (+₱1,200)', 'Additional urns (+₱1,500)'],
          conditions: 'Available for all pet sizes. Viewing options available upon request.',
          images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
        },
        {
          id: 3,
          name: 'Deluxe Package',
          description: 'Private cremation with wooden urn and memorial service',
          category: 'Private',
          cremationType: 'Deluxe',
          processingTime: 'Same day',
          price: 6000,
          inclusions: ['Custom wooden urn', 'Memorial service', 'Photo memorial', 'Paw print keepsake', 'Fur clipping'],
          addOns: ['Memorial jewelry (+₱2,000)', 'Canvas portrait (+₱2,500)'],
          conditions: 'Includes private viewing room for family. 24-hour service available.',
          images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
        }
      ]
    },
    {
      id: 2,
      name: 'Peaceful Paws Memorial',
      city: 'Tuyo, Balanga City, Bataan',
      distance: '2.2 km away',
      type: 'Pet Cremation Services',
      address: 'Tuyo, Balanga City, Bataan, Philippines',
      phone: '(234) 567-8901',
      email: 'care@peacefulpaws.com',
      description: 'Dignified pet cremation with eco-friendly options. We focus on providing environmentally conscious memorial services while honoring your pet with the respect they deserve. Our facility is designed to provide a peaceful setting for families during this difficult time.',
      packages: [
        {
          id: 1,
          name: 'Eco-Friendly Basic',
          description: 'Environmentally conscious cremation with biodegradable urn',
          category: 'Communal',
          cremationType: 'Standard',
          processingTime: '2-3 days',
          price: 3800,
          inclusions: ['Biodegradable urn', 'Plantable memorial card', 'Digital memorial'],
          addOns: ['Tree planting ceremony (+₱1,200)', 'Memorial garden stone (+₱900)'],
          conditions: 'For pets up to 40 lbs. Additional fees may apply for larger pets.',
          images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
        },
        {
          id: 2,
          name: 'Private Eco-Cremation',
          description: 'Private cremation with sustainable memorial options',
          category: 'Private',
          cremationType: 'Premium',
          processingTime: '1-2 days',
          price: 5800,
          inclusions: ['Bamboo urn', 'Seed paper memorial card', 'Paw print in clay', 'Digital memorial album'],
          addOns: ['Memorial tree planting (+₱2,000)', 'Biodegradable water burial urn (+₱1,500)'],
          conditions: 'Available for all pet sizes. Carbon offset included in price.',
          images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
        },
        {
          id: 3,
          name: 'Legacy Memorial',
          description: 'Comprehensive memorial service with sustainable options',
          category: 'Private',
          cremationType: 'Deluxe',
          processingTime: 'Same day',
          price: 7500,
          inclusions: ['Choice of sustainable urn', 'Memorial service', 'Photo tribute', 'Paw print keepsake', 'Memorial planting'],
          addOns: ['Video tribute (+₱1,800)', 'Custom memorial garden (+₱3,500)'],
          conditions: 'Includes private viewing room and memorial planning assistance.',
          images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
        }
      ]
    },
    // More providers would be here
  ];

  // Mock data for user's pets
  const mockPets = [
    { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: 8 },
    { id: 2, name: 'Luna', species: 'Cat', breed: 'Siamese', age: 5 }
  ];

  // State for package carousel
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [sortBy, setSortBy] = useState('all');

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
    // Simulate fetching provider data
    setLoading(true);

    // Add a small delay to ensure the skeleton is visible
    const fetchData = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const foundProvider = serviceProviders.find(p => p.id.toString() === providerId);
        if (foundProvider) {
          setProvider(foundProvider);
          setPets(mockPets); // In a real app, this would be fetched from the API
        } else {
          setError('Provider not found');
        }
      } catch (err) {
        setError('Failed to load provider details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerId]);

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

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService || !selectedPet || !bookingDate || !bookingTime) {
      setBookingError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // Get the selected service details
      const service = provider.services.find((s: any) => s.id === selectedService);
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
    } catch (error) {
      setBookingError('An error occurred while creating your booking');
      console.error('Booking error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage="services" userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`} />

      {loading ? (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <FurParentPageSkeleton type="package" />
        </div>
      ) : error ? (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
            >
              Go Back
            </button>
          </div>
        </div>
      ) : provider ? (
        <>
          {/* Provider Banner */}
          <div className="bg-[var(--primary-green)] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h1 className="text-3xl font-bold uppercase text-white">{provider.name}</h1>
                <p className="mt-2 text-white/80">{provider.city}</p>
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2 text-white">Business Description:</h2>
                  <p className="text-white/90 leading-relaxed">{provider.description}</p>
                </div>
              </div>
              <div className="relative h-64 md:h-auto overflow-hidden rounded-lg border border-white/20">
                {provider.image ? (
                  <div className="absolute inset-0 bg-[url('/bg_2.png')] bg-cover bg-center"></div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                    <div className="text-center p-4">
                      <svg className="mx-auto h-12 w-12 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-white/80">No image available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Back button */}
              <div className="mb-8">
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  <span>Back to Services</span>
                </button>
              </div>

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
                      <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-40 flex items-center justify-center bg-gray-100">
                          <div className="text-center p-4">
                            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="p-4 text-center">
                          <h3 className="font-medium text-lg">{pkg.name}</h3>
                          <p className="text-[var(--primary-green)] font-semibold mt-1">₱{pkg.price.toLocaleString()}</p>
                          <button
                            onClick={() => handleViewPackage(pkg.id)}
                            className="mt-3 w-full px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors"
                          >
                            View Details
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
          </div>
        </>
      ) : null}


    </div>
  );
}

// Export the component wrapped with OTP verification
export default withOTPVerification(ServiceDetailPage);
