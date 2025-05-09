'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';

export default function ServicesPage() {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data for service providers
  const serviceProviders = [
    { id: 1, name: 'Service Provider Name', city: 'City', image: '/image_1.png' },
    { id: 2, name: 'Service Provider Name', city: 'City', image: '/image_2.png' },
    { id: 3, name: 'Service Provider Name', city: 'City', image: '/image_3.png' },
    { id: 4, name: 'Service Provider Name', city: 'City', image: '/image_1.png' },
    { id: 5, name: 'Service Provider Name', city: 'City', image: '/image_2.png' },
    { id: 6, name: 'Service Provider Name', city: 'City', image: '/image_3.png' },
  ];

  // Mock data for regions and provinces
  const regions = ['Luzon', 'Visayas', 'Mindanao'];
  const provinces = {
    'Luzon': ['Metro Manila', 'Cavite', 'Laguna', 'Batangas', 'Rizal', 'Quezon'],
    'Visayas': ['Cebu', 'Bohol', 'Negros Occidental', 'Iloilo', 'Leyte'],
    'Mindanao': ['Davao', 'Cagayan de Oro', 'General Santos', 'Zamboanga', 'Butuan']
  };

  // Pagination
  const providersPerPage = 3;
  const totalPages = Math.ceil(serviceProviders.length / providersPerPage);
  const currentProviders = serviceProviders.slice(
    (currentPage - 1) * providersPerPage,
    currentPage * providersPerPage
  );

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const region = e.target.value;
    setSelectedRegion(region);
    setSelectedProvince('');
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvince(e.target.value);
  };

  const handleSearch = () => {
    // In a real app, this would filter providers based on region and province
    console.log('Searching for providers in:', selectedRegion, selectedProvince);
  };

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
              Find the Right Service Provider with Ease
            </h1>
            <p className="text-xl text-white text-center max-w-3xl mx-auto">
              No more endless searching—quickly locate and connect with trusted professionals in your area.
            </p>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-8 -mt-16 relative z-20">
              <h2 className="text-lg text-[var(--primary-green)] text-center mb-6 font-serif">
                Select your location to discover trusted service providers in your community
              </h2>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="w-full md:w-[40%] relative">
                  <select
                    value={selectedRegion}
                    onChange={handleRegionChange}
                    className="w-full p-3 border border-[var(--primary-green)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] appearance-none bg-white pr-10 text-gray-600 font-serif shadow-sm"
                  >
                    <option value="">Select region</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--primary-green)]">
                    <ChevronDownIcon className="h-5 w-5" />
                  </div>
                </div>
                <div className="w-full md:w-[40%] relative">
                  <select
                    value={selectedProvince}
                    onChange={handleProvinceChange}
                    disabled={!selectedRegion}
                    className="w-full p-3 border border-[var(--primary-green)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-400 pr-10 text-gray-600 font-serif shadow-sm"
                  >
                    <option value="">Select province</option>
                    {selectedRegion && provinces[selectedRegion as keyof typeof provinces].map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--primary-green)]">
                    <ChevronDownIcon className="h-5 w-5" />
                  </div>
                </div>
                <div className="w-full md:w-[10%] flex justify-center">
                  <button
                    onClick={handleSearch}
                    className="w-12 h-12 bg-[var(--primary-green)] text-white rounded-full hover:bg-[var(--primary-green-hover)] transition-all duration-300 flex items-center justify-center shadow-md"
                  >
                    <MagnifyingGlassIcon className="h-6 w-6" />
                  </button>
                </div>
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
                className="rounded-lg overflow-hidden border border-gray-200"
              >
                <div className="h-64 relative overflow-hidden flex items-center justify-center bg-white">
                  <div className="text-[var(--primary-green)] text-4xl font-serif z-10">
                    PICTURE
                  </div>
                </div>
                <div className="bg-[var(--primary-green)] text-white p-4 text-center">
                  <h3 className="font-medium">Service Provider Name</h3>
                  <p className="text-sm">City</p>
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
