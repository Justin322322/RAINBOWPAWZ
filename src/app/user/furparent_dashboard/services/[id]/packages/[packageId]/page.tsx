'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';

interface PackageDetailPageProps {
  userData?: any;
}

function PackageDetailPage({ userData }: PackageDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id;
  const packageId = params.packageId;

  const [provider, setProvider] = useState<any>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
    // More providers would be here
  ];

  useEffect(() => {
    // Simulate fetching provider and package data
    setLoading(true);

    // Add a small delay to ensure the skeleton is visible
    const fetchData = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const foundProvider = serviceProviders.find(p => p.id.toString() === providerId);
        if (foundProvider) {
          setProvider(foundProvider);
          const foundPackage = foundProvider.packages.find(p => p.id.toString() === packageId);
          if (foundPackage) {
            setPackageData(foundPackage);
          } else {
            setError('Package not found');
          }
        } else {
          setError('Provider not found');
        }
      } catch (err) {
        setError('Failed to load package details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerId, packageId]);

  const handleNextImage = () => {
    if (packageData && currentImageIndex < packageData.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleBookNow = () => {
    // Navigate to the checkout page with provider and package IDs
    router.push(`/user/furparent_dashboard/bookings/checkout?provider=${providerId}&package=${packageId}`);
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
      ) : provider && packageData ? (
        <div className="bg-white">
          {/* Back button */}
          <div className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              <span>Back to Packages</span>
            </button>
          </div>

          {/* Package Details */}
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Package Image Carousel */}
                <div className="relative h-80 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No image available</p>
                    </div>
                  </div>


                </div>

                {/* Package Info */}
                <div>
                  <h1 className="text-3xl font-bold text-[var(--primary-green)]">{packageData.name}</h1>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-gray-700">{packageData.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Package Category</p>
                        <p className="font-medium flex items-center">
                          <span className="text-[var(--primary-green)] mr-2">✓</span>
                          {packageData.category}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cremation Type</p>
                        <p className="font-medium flex items-center">
                          <span className="text-[var(--primary-green)] mr-2">✓</span>
                          {packageData.cremationType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Processing Time</p>
                        <p className="font-medium flex items-center">
                          <span className="text-[var(--primary-green)] mr-2">✓</span>
                          {packageData.processingTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pricing</p>
                        <p className="font-medium flex items-center">
                          <span className="text-[var(--primary-green)] mr-2">✓</span>
                          ₱{packageData.price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Memorial Inclusions</p>
                      <ul className="mt-1 space-y-1">
                        {packageData.inclusions.map((inclusion: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-[var(--primary-green)] mr-2">✓</span>
                            {inclusion}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Add Ons (Optional)</p>
                      <ul className="mt-1 space-y-1">
                        {packageData.addOns.map((addon: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-[var(--primary-green)] mr-2">✓</span>
                            {addon}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Package Conditions</p>
                      <p className="mt-1 flex items-start">
                        <span className="text-[var(--primary-green)] mr-2">✓</span>
                        {packageData.conditions}
                      </p>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button
                        onClick={handleBookNow}
                        className="w-full py-3 px-4 bg-[var(--primary-green)] text-white font-medium rounded-md hover:bg-[var(--primary-green-hover)] transition-colors"
                      >
                        BOOK NOW
                      </button>

                      <button
                        onClick={() => {
                          // In a real app, this would add the item to cart
                          alert('Item added to cart!');
                          // Then navigate to cart page or stay on the same page
                        }}
                        className="w-full py-3 px-4 border border-[var(--primary-green)] text-[var(--primary-green)] font-medium rounded-md hover:bg-green-50 transition-colors flex items-center justify-center"
                      >
                        <ShoppingCartIcon className="h-5 w-5 mr-2" />
                        ADD TO CART
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default withOTPVerification(PackageDetailPage);
