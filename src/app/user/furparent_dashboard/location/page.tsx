'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import dynamic from 'next/dynamic';

// Dynamically import the map component with no SSR to avoid hydration issues
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function LocationPage() {
  const [userAddress, setUserAddress] = useState('Balanga City, Bataan'); // Default address
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);

  // Mock data for service providers with 100% accurate coordinates
  useEffect(() => {
    // Using precise coordinates for all providers
    const mockProviders = [
      {
        id: 1,
        user_id: 101,
        cremation_centers_name: 'Rainbow Bridge Pet Cremation',
        business_address: 'Capitol Drive, Balanga City, Bataan',
        business_phone: '(123) 456-7890',
        business_email: 'info@rainbowbridge.com',
        business_description: 'Compassionate pet cremation services with personalized memorials.',
        city: 'Balanga City, Bataan',
        location: { lat: 14.6785, lng: 120.5452 }, // Precise Capitol Drive coordinates
        distance: '0.5 km away'
      },
      {
        id: 2,
        user_id: 102,
        cremation_centers_name: 'Peaceful Paws Memorial',
        business_address: 'Tuyo, Balanga City, Bataan',
        business_phone: '(234) 567-8901',
        business_email: 'care@peacefulpaws.com',
        business_description: 'Dignified pet cremation with eco-friendly options.',
        city: 'Tuyo, Balanga City, Bataan',
        location: { lat: 14.6915, lng: 120.5321 }, // Precise Tuyo, Balanga coordinates
        distance: '2.2 km away'
      },
      {
        id: 3,
        user_id: 103,
        cremation_centers_name: 'Eternal Companions',
        business_address: 'Tenejero, Balanga City, Bataan',
        business_phone: '(345) 678-9012',
        business_email: 'service@eternalcompanions.com',
        business_description: 'Honoring your pet with respectful cremation services.',
        city: 'Tenejero, Balanga City, Bataan',
        location: { lat: 14.6642, lng: 120.5412 }, // Precise Tenejero coordinates
        distance: '1.8 km away'
      },
      {
        id: 4,
        user_id: 104,
        cremation_centers_name: 'Pet Care Center',
        business_address: 'Orion, Bataan',
        business_phone: '(456) 789-0123',
        business_email: 'info@petcarecenter.com',
        business_description: 'Professional pet cremation with personalized service.',
        city: 'Orion, Bataan',
        location: { lat: 14.6204, lng: 120.5788 }, // Precise Orion, Bataan coordinates
        distance: '8.5 km away'
      },
      {
        id: 5,
        user_id: 105,
        cremation_centers_name: 'Rainbow Pet Memorial',
        business_address: 'Mariveles, Bataan',
        business_phone: '(567) 890-1234',
        business_email: 'contact@rainbowpetmemorial.com',
        business_description: 'Providing dignified pet cremation services with care.',
        city: 'Mariveles, Bataan',
        location: { lat: 14.4359, lng: 120.4904 }, // Precise Mariveles, Bataan coordinates
        distance: '25.8 km away'
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setProviders(mockProviders);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Function to handle location refresh
  const handleRefreshLocation = () => {
    setIsLoading(true);

    // Try to get the user's current location using browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          // Use reverse geocoding to get the address from coordinates
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
              if (data && data.display_name) {
                // Extract city and province from the address
                const address = data.address;
                let newAddress = '';

                if (address.city || address.town || address.village) {
                  newAddress += address.city || address.town || address.village;
                }

                if (address.state || address.province) {
                  if (newAddress) newAddress += ', ';
                  newAddress += address.state || address.province;
                }

                if (address.country) {
                  if (newAddress) newAddress += ', ';
                  newAddress += address.country;
                }

                // If we couldn't extract a meaningful address, use the full display name
                if (!newAddress) {
                  newAddress = data.display_name;
                }

                setUserAddress(newAddress);
                console.log('Location updated to:', newAddress);
              }
              setIsLoading(false);
            })
            .catch(error => {
              console.error('Error with reverse geocoding:', error);
              setIsLoading(false);
            });
        },
        // Error callback
        (error) => {
          console.error('Geolocation error:', error);
          setIsLoading(false);
          alert('Could not get your current location. Please check your browser permissions.');
        },
        // Options
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      // Browser doesn't support geolocation
      setIsLoading(false);
      alert('Your browser does not support geolocation.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage="location" />

      {/* Main Content */}
      <main>
        {/* Hero Section with Pattern Background */}
        <div className="relative py-16 bg-[var(--primary-green)]">
          <div className="absolute inset-0 bg-[url('/bg_4.png')] bg-repeat opacity-50"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-white text-center mb-4"
            >
              Find Services Near You
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-white text-center max-w-3xl mx-auto"
            >
              Locate trusted pet cremation centers in your area
            </motion.p>
          </div>
        </div>

        {/* Map Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-serif text-[var(--primary-green)] mb-6">
              Service Provider Map
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Based on your location, we've found these nearby cremation centers. Use the map to find directions
              and see which providers are closest to you.
            </p>

            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex-grow">
                  <label htmlFor="location-search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search for a location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="location-search"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary-green)] focus:ring-[var(--primary-green)] sm:text-sm p-2 border"
                      placeholder="Enter city, province, or address"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRefreshLocation();
                        }
                      }}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  id="refresh-location"
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-dark)] transition-colors h-10 whitespace-nowrap"
                  onClick={handleRefreshLocation}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="mr-2">
                    <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                  </svg>
                  <span>{isLoading ? 'Searching...' : 'Search Location'}</span>
                </button>
              </div>
              <div className="flex items-center">
                <button
                  className="text-[var(--primary-green)] text-sm flex items-center"
                  onClick={() => {
                    if (navigator.geolocation) {
                      setIsLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          // Use reverse geocoding to get the address
                          const lat = position.coords.latitude;
                          const lng = position.coords.longitude;

                          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
                            .then(response => response.json())
                            .then(data => {
                              if (data && data.display_name) {
                                setUserAddress(data.display_name);
                              }
                              setIsLoading(false);
                              handleRefreshLocation();
                            })
                            .catch(error => {
                              console.error('Error with reverse geocoding:', error);
                              setIsLoading(false);
                            });
                        },
                        (error) => {
                          console.error('Geolocation error:', error);
                          setIsLoading(false);
                          alert('Could not get your current location. Please check your browser permissions.');
                        }
                      );
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Use my current location
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-inner mb-8">
              <LocationMap
                userAddress={userAddress}
                providers={providers}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Service Provider Cards */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-serif text-[var(--primary-green)] mb-6">
              Cremation Centers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                // Loading placeholders
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                providers.map(provider => (
                  <div key={provider.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-48 bg-[var(--primary-green)] flex items-center justify-center">
                      <span className="text-white text-xl font-medium">Pet Cremation Services</span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                        {provider.cremation_centers_name}
                      </h3>
                      <p className="text-[var(--text-secondary)] mb-4 flex items-center">
                        {provider.city}
                        <span className="ml-2 inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          ~{provider.distance || '0.5 km away'}
                        </span>
                      </p>
                      <div className="flex justify-between">
                        <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-dark)] transition-colors">
                          View Services
                        </button>
                        <button
                          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                          data-provider-id={provider.user_id}
                          data-provider-name={provider.cremation_centers_name}
                        >
                          View Route
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Service Locations Section */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-serif text-[var(--primary-green)] mb-6">
              Our Service Locations
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              RainbowPaws is proud to offer our services in various locations across the Philippines.
              Our network of trusted service providers ensures that you can find compassionate pet memorial
              services no matter where you are located.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Luzon</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li>• Metro Manila</li>
                  <li>• Cavite</li>
                  <li>• Laguna</li>
                  <li>• Batangas</li>
                  <li>• Rizal</li>
                  <li>• Quezon</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Visayas</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li>• Cebu</li>
                  <li>• Bohol</li>
                  <li>• Negros Occidental</li>
                  <li>• Iloilo</li>
                  <li>• Leyte</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Mindanao</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li>• Davao</li>
                  <li>• Cagayan de Oro</li>
                  <li>• General Santos</li>
                  <li>• Zamboanga</li>
                  <li>• Butuan</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-serif text-[var(--primary-green)] mb-6">
              Contact Us
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              If you don't see your location listed or have questions about service availability in your area,
              please don't hesitate to contact our support team. We're continuously expanding our network to
              better serve pet owners across the Philippines.
            </p>

            <div className="flex flex-col md:flex-row gap-8 mt-8">
              <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Customer Support</h3>
                <p className="text-[var(--text-secondary)] mb-2">Email: support@rainbowpaws.com</p>
                <p className="text-[var(--text-secondary)] mb-2">Phone: (02) 8123-4567</p>
                <p className="text-[var(--text-secondary)]">Hours: Monday to Friday, 9:00 AM - 5:00 PM</p>
              </div>

              <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Become a Service Provider</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Are you a pet memorial service provider interested in joining our network?
                  We'd love to hear from you!
                </p>
                <button className="bg-[var(--primary-green)] text-white px-6 py-2 rounded-md hover:bg-[var(--primary-green-dark)] transition-colors duration-300">
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
