'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
// Removed FurParentNavbar and withOTPVerification imports - handled by layout
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';
import { useCart } from '@/contexts/CartContext';
import CartSidebar from '@/components/cart/CartSidebar';
import { handleImageError } from '@/utils/imageUtils';
import { useToast } from '@/context/ToastContext';

interface PackageDetailPageProps {
  userData?: any;
}

function PackageDetailPage({ userData: _userData }: PackageDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id;
  const packageId = params.packageId;
  const { showToast } = useToast();

  const [provider, setProvider] = useState<any>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Get cart functions from context
  const { addItem: addToCart } = useCart();

  // Will fetch real data from API

  useEffect(() => {
    // Fetch real provider and package data
    setLoading(true);

    const fetchData = async () => {
      try {

        // Fetch provider details
        const providerResponse = await fetch(`/api/service-providers/${providerId}`);

        if (!providerResponse.ok) {
          throw new Error(`Failed to fetch provider details (${providerResponse.status})`);
        }

        const providerData = await providerResponse.json();
        if (!providerData.provider) {
          throw new Error('Provider data is invalid or empty');
        }

        setProvider(providerData.provider);

        // Fetch specific package details
        const packageResponse = await fetch(`/api/packages/${packageId}`);

        if (!packageResponse.ok) {
          throw new Error(`Failed to fetch package details (${packageResponse.status})`);
        }

        const packageData = await packageResponse.json();
        if (!packageData.package) {
          throw new Error('Package data is invalid or empty');
        }

        // Images are already included in the package data from the API
        setPackageData(packageData.package);
      } catch (err: any) {
        setError(err.message || 'Failed to load package details');
      } finally {
        setLoading(false);
      }
    };

    if (providerId && packageId) {
      fetchData();
    }
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
      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

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
                  {packageData.images && packageData.images.length > 0 ? (
                    <>
                      <Image
                        src={packageData.images[currentImageIndex]}
                        alt={packageData.name}
                        fill
                        className="object-cover"
                        onError={(e) => handleImageError(e, `/bg_4.png`)}
                      />
                      {packageData.images.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/70 p-1 rounded-full hover:bg-white transition"
                            disabled={currentImageIndex === 0}
                          >
                            <ChevronLeftIcon className="h-6 w-6 text-gray-800" />
                          </button>
                          <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/70 p-1 rounded-full hover:bg-white transition"
                            disabled={currentImageIndex === packageData.images.length - 1}
                          >
                            <ChevronRightIcon className="h-6 w-6 text-gray-800" />
                          </button>
                        </>
                      )}

                      {/* Dot indicators - only show if there are multiple images */}
                      {packageData.images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black/30 px-3 py-1.5 rounded-full">
                          {packageData.images.map((_: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                                currentImageIndex === index
                                  ? 'bg-white scale-110 ring-2 ring-white/50'
                                  : 'bg-white/50 hover:bg-white/80'
                              }`}
                              aria-label={`View image ${index + 1} of ${packageData.images.length}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
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
                        <p className="text-sm text-gray-500">Base Price</p>
                        <p className="font-medium flex items-center">
                          <span className="text-[var(--primary-green)] mr-2">✓</span>
                          ₱{packageData.price.toLocaleString()}
                        </p>
                      </div>

                      {packageData.pricePerKg > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Price Per Kg</p>
                          <p className="font-medium flex items-center">
                            <span className="text-[var(--primary-green)] mr-2">✓</span>
                            ₱{packageData.pricePerKg.toLocaleString()}/kg
                          </p>
                        </div>
                      )}
                    </div>



                    {/* Supported Pet Types */}
                    {packageData.supportedPetTypes && packageData.supportedPetTypes.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Supported Pet Types</p>
                        <div className="flex flex-wrap gap-2">
                          {packageData.supportedPetTypes.map((petType: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {petType}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-500">Memorial Inclusions</p>
                      <ul className="mt-1 space-y-1">
                        {packageData.inclusions.map((inclusion: any, index: number) => {
                          const desc = typeof inclusion === 'string' ? inclusion : inclusion.description;
                          const image = typeof inclusion === 'string' ? undefined : inclusion.image;
                          return (
                            <li key={index} className="flex items-center gap-2">
                              <span className="text-[var(--primary-green)]">✓</span>
                              {image && (
                                <Image src={image} alt="inclusion" width={20} height={20} className="h-5 w-5 rounded object-cover border" unoptimized />
                              )}
                              <span>{desc}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Add Ons (Optional)</p>
                      <ul className="mt-1 space-y-1">
                        {packageData.addOns.map((addon: any, index: number) => {
                          const name = typeof addon === 'string' ? addon : addon.name;
                          const price = typeof addon === 'string' ? undefined : addon.price;
                          const image = typeof addon === 'string' ? undefined : addon.image;
                          return (
                            <li key={index} className="flex items-center gap-2">
                              <span className="text-[var(--primary-green)]">✓</span>
                              {image && (
                                <Image src={image} alt="addon" width={20} height={20} className="h-5 w-5 rounded object-cover border" unoptimized />
                              )}
                              <span>
                                {name}{price ? ` (+₱${price.toLocaleString()})` : ''}
                              </span>
                            </li>
                          );
                        })}
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
                          if (packageData) {
                            // Add item to cart
                            const cartItem = {
                              id: `${packageData.id}-${Date.now()}`,
                              packageId: packageData.id,
                              providerId: packageData.providerId,
                              providerName: packageData.providerName,
                              packageName: packageData.name,
                              price: packageData.price,
                              quantity: 1,
                              category: packageData.category,
                              cremationType: packageData.cremationType,
                              processingTime: packageData.processingTime,
                              addOns: packageData.addOns ? packageData.addOns.map((addon: any) =>
                                typeof addon === 'string' ? addon : `${addon.name}${addon.price ? ` (+₱${addon.price.toLocaleString()})` : ''}`
                              ) : [],
                              selectedAddOns: [],
                              image: packageData.images && packageData.images.length > 0 ? packageData.images[0] : undefined
                            };

                            addToCart(cartItem);

                            // Show toast notification
                            showToast('Item added to cart!', 'success', 3000);

                            // Optional: Open cart sidebar after short delay
                            setTimeout(() => setIsCartOpen(true), 1000);
                          }
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

// Export the component directly (OTP verification is now handled by layout)
export default PackageDetailPage;
