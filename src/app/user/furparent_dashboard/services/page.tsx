'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import dynamic from 'next/dynamic';

// Import the map component with dynamic loading (no SSR)
const MapComponent = dynamic(
  () => import('@/components/map/MapComponent'),
  { ssr: false }
);

export default function ServicesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const defaultAddress = 'Balanga City, Bataan';

  // Mock data for service providers using descriptive addresses instead of coordinates
  const serviceProviders = [
    {
      id: 1,
      name: "Rainbow Bridge Pet Cremation",
      city: 'Capitol Drive, Balanga City, Bataan',
      distance: '0.5 km away',
      type: 'Pet Cremation Services',
      packages: 5,
      address: 'Capitol Drive, Balanga City, Bataan, Philippines',
      phone: '(123) 456-7890',
      email: 'info@rainbowbridge.com',
      description: 'Compassionate pet cremation services with personalized memorials.'
    },
    {
      id: 2,
      name: 'Peaceful Paws Memorial',
      city: 'Tuyo, Balanga City, Bataan',
      distance: '2.2 km away',
      type: 'Pet Cremation Services',
      packages: 7,
      address: 'Tuyo, Balanga City, Bataan, Philippines',
      phone: '(234) 567-8901',
      email: 'care@peacefulpaws.com',
      description: 'Dignified pet cremation with eco-friendly options.'
    },
    {
      id: 3,
      name: 'Eternal Companions',
      city: 'Tenejero, Balanga City, Bataan',
      distance: '1.8 km away',
      type: 'Pet Cremation Services',
      packages: 1,
      address: 'Tenejero, Balanga City, Bataan, Philippines',
      phone: '(345) 678-9012',
      email: 'service@eternalcompanions.com',
      description: 'Honoring your pet with respectful cremation services.'
    },
    {
      id: 4,
      name: 'Pet Care Center',
      city: 'Orion, Bataan',
      distance: '8.5 km away',
      type: 'Pet Cremation Services',
      packages: 3,
      address: 'Orion, Bataan, Philippines',
      phone: '(456) 789-0123',
      email: 'info@petcarecenter.com',
      description: 'Professional pet cremation with personalized service.'
    },
    {
      id: 5,
      name: 'Rainbow Pet Memorial',
      city: 'Mariveles, Bataan',
      distance: '25.8 km away',
      type: 'Pet Cremation Services',
      packages: 4,
      address: 'Mariveles, Bataan, Philippines',
      phone: '(567) 890-1234',
      email: 'contact@rainbowpetmemorial.com',
      description: 'Providing dignified pet cremation services with care.'
    },
    {
      id: 6,
      name: 'Paws & Hearts',
      city: 'Dinalupihan, Bataan',
      distance: '17.3 km away',
      type: 'Pet Cremation Services',
      packages: 2,
      address: 'Dinalupihan, Bataan, Philippines',
      phone: '(678) 901-2345',
      email: 'hello@pawsandhearts.com',
      description: 'Caring pet cremation services with a personal touch.'
    },
  ];

  // State for selected provider for routing
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage="services" />

      {/* Main Content */}
      <main>
        {/* Hero Section with Pattern Background */}
        <div className="relative py-16 bg-[var(--primary-green)]">
          <div className="absolute inset-0 bg-[url('/bg_4.png')] bg-repeat opacity-20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h1 className="text-4xl font-serif text-white text-center mb-4">
              Find the Right Cremation Services with Ease
            </h1>
            <p className="text-xl text-white text-center max-w-3xl mx-auto">
              No more endless searching—quickly locate and connect with trusted professionals in your area.
            </p>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-8 -mt-16 relative z-20">
              <h2 className="text-lg text-[var(--primary-green)] text-center mb-6 font-serif">
                Based on your location, we've found these nearby cremation centers:
              </h2>

              <div className="flex flex-col gap-4 items-center justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1 text-[var(--primary-green)]" />
                    Current location: {defaultAddress}
                  </span>
                </div>

                {/* Map Container */}
                <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-inner">
                  <MapComponent
                    userAddress={defaultAddress}
                    serviceProviders={serviceProviders.map(provider => ({
                      id: provider.id,
                      name: provider.name,
                      address: provider.address
                    }))}
                    selectedProviderId={selectedProviderId}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Note: Your location is set to Balanga City, Bataan. You can update your preferred location in your profile settings later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Providers Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentProviders.map(provider => (
              <div
                key={provider.id}
                className="rounded-lg overflow-hidden border border-gray-200 flex flex-col"
              >
                <div className="bg-[var(--primary-green)] text-white p-4 text-center">
                  <h3 className="font-medium text-lg">{provider.type}</h3>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-medium text-xl mb-1">{provider.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{provider.city}</p>
                  <p className="text-sm text-green-600 mb-4">{provider.distance}</p>
                  <p className="text-sm text-gray-600 mb-6">{provider.packages} Packages Available</p>

                  <div className="mt-auto flex justify-between">
                    <button className="bg-[var(--primary-green)] text-white px-4 py-2 rounded-md text-sm">
                      View Services
                    </button>
                    <button
                      className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm"
                      onClick={() => setSelectedProviderId(provider.id)}
                    >
                      Show Route
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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
                  className={`w-8 h-8 flex items-center justify-center rounded-md ${
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
        </div>
      </main>
    </div>
  );
}
