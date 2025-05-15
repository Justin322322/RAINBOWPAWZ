'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckIcon,
  CreditCardIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PaperAirplaneIcon,
  ExclamationCircleIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';

interface CheckoutPageProps {
  userData?: any;
}

function CheckoutPage({ userData }: CheckoutPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [petName, setPetName] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [petType, setPetType] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [petImageFile, setPetImageFile] = useState<File | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  
  // Remove selectedPet and pets states as we're removing the pet dropdown

  // Mock data for service providers and packages
  const serviceProviders = [
    {
      id: 1,
      name: "Rainbow Bridge Pet Cremation",
      city: 'Capitol Drive, Balanga City, Bataan',
      type: 'Pet Cremation Services',
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
          conditions: 'For pets up to 50 lbs. Additional fees may apply for larger pets.'
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
          conditions: 'Available for all pet sizes. Viewing options available upon request.'
        }
      ]
    }
  ];

  // Handle pet image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPetImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPetImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle image removal
  const handleRemoveImage = () => {
    setPetImageFile(null);
    setPetImagePreview(null);
    
    // Clear the file input
    const fileInput = document.getElementById('pet-image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  useEffect(() => {
    // Get provider and package IDs from URL params
    const providerId = searchParams.get('provider');
    const packageId = searchParams.get('package');

    if (!providerId || !packageId) {
      setError('Missing booking information. Please try again.');
      setLoading(false);
      return;
    }

    // Fetch real data from API
    const fetchData = async () => {
      try {
        console.log(`Fetching provider (ID: ${providerId}) and package (ID: ${packageId}) data for checkout`);
        
        // First try to fetch debug data to check status of provider and package
        try {
          console.log('Getting debug information for checkout...');
          const debugResponse = await fetch(`/api/debug/checkout?provider=${providerId}&package=${packageId}`);
          const debugData = await debugResponse.json();
          console.log('Debug data:', debugData);
          
          // If we have debug data, we can better understand any issues
          if (debugData.databaseChecks?.error) {
            console.error('Database check error in debug route:', debugData.databaseChecks.error);
          }
        } catch (debugError) {
          console.warn('Could not fetch debug information:', debugError);
          // Continue with normal checkout - debug is optional
        }
        
        // Fetch provider data
        const providerResponse = await fetch(`/api/service-providers/${providerId}`);
        if (!providerResponse.ok) {
          console.error(`Failed to fetch provider: ${providerResponse.status} ${providerResponse.statusText}`);
          
          // Try special case for test providers
          if (providerId === '1001' || providerId === '1002' || providerId === '1003') {
            console.log('Attempting to use test provider data');
            const testProviders = {
              '1001': {
                id: 1001,
                name: "Rainbow Bridge Pet Cremation",
                city: "Balanga City, Bataan",
                address: "Capitol Drive, Balanga City, Bataan, 2100 Philippines",
                phone: "(123) 456-7890",
                email: "info@rainbowbridge.com",
                description: "Compassionate pet cremation services with personalized memorials.",
                type: "Pet Cremation Services",
                packages: 3,
                distance: "5.5 km away",
                distanceValue: 5.5,
                created_at: new Date().toISOString()
              },
              '1002': {
                id: 1002,
                name: "Peaceful Paws Memorial",
                city: "Orani, Bataan",
                address: "National Road, Orani, Bataan, 2112 Philippines",
                phone: "(234) 567-8901",
                email: "care@peacefulpaws.com",
                description: "Dignified pet cremation with eco-friendly options.",
                type: "Pet Cremation Services",
                packages: 2,
                distance: "12.3 km away",
                distanceValue: 12.3,
                created_at: new Date().toISOString()
              },
              '1003': {
                id: 1003,
                name: "Forever Friends Pet Services",
                city: "Dinalupihan, Bataan",
                address: "San Ramon Highway, Dinalupihan, Bataan, 2110 Philippines",
                phone: "(345) 678-9012",
                email: "service@foreverfriends.com",
                description: "Comprehensive pet memorial services with home pickup options.",
                type: "Pet Cremation Services",
                packages: 4,
                distance: "18.7 km away",
                distanceValue: 18.7,
                created_at: new Date().toISOString()
              }
            };
            
            const testProvider = testProviders[providerId as keyof typeof testProviders];
            if (testProvider) {
              // Continue with test provider
              // For packages, we'll also need test package data
              const testPackages = {
                '10001': {
                  id: 10001,
                  name: "Basic Cremation Package",
                  description: "Simple cremation service with standard urn",
                  category: "Communal",
                  cremationType: "Standard",
                  processingTime: "2-3 days",
                  price: 3500,
                  inclusions: ["Standard clay urn", "Memorial certificate", "Paw print impression"],
                  addOns: ["Personalized nameplate (+₱500)", "Photo frame (+₱800)"],
                  conditions: "For pets up to 50 lbs. Additional fees may apply for larger pets.",
                  providerName: testProvider.name,
                  providerId: testProvider.id
                },
                '10002': {
                  id: 10002,
                  name: "Premium Cremation Package",
                  description: "Private cremation with premium urn and memorial certificate",
                  category: "Private",
                  cremationType: "Premium",
                  processingTime: "1-2 days",
                  price: 5500,
                  inclusions: ["Wooden urn with nameplate", "Memorial certificate", "Paw print impression", "Fur clipping"],
                  addOns: ["Memorial video (+₱1,200)", "Additional urns (+₱1,500)"],
                  conditions: "Available for all pet sizes. Viewing options available upon request.",
                  providerName: testProvider.name,
                  providerId: testProvider.id
                },
                '10003': {
                  id: 10003,
                  name: "Deluxe Package",
                  description: "Private cremation with wooden urn and memorial service",
                  category: "Private",
                  cremationType: "Premium",
                  processingTime: "24 hours",
                  price: 7500,
                  inclusions: ["Premium wooden urn", "Memorial certificate", "Paw print impression", "Fur clipping", "Photo memorial"],
                  addOns: ["Memorial video (+₱1,200)", "Custom engraving (+₱800)"],
                  conditions: "Includes home pickup service within 20km radius.",
                  providerName: testProvider.name,
                  providerId: testProvider.id
                }
              };
              
              let testPackage = testPackages[packageId as keyof typeof testPackages];
              if (!testPackage) {
                // If package ID isn't one of our test IDs, use the first package as default
                testPackage = testPackages['10001'];
              }
              
              // Set booking data with test data
              setBookingData({
                provider: testProvider,
                package: testPackage
              });
              
              // We no longer need to set mock pets
              
              // Set default date to tomorrow
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setBookingDate(tomorrow.toISOString().split('T')[0]);
              
              // Set default time
              setBookingTime('10:00');
              
              // Mark as loaded
              setLoading(false);
              return;
            }
          }
          
          setError('Provider not found. Please try again or contact support.');
          return;
        }
        
        const providerData = await providerResponse.json();
        if (!providerData.provider) {
          console.error('Provider data is empty or invalid:', providerData);
          setError('Provider information is unavailable. Please try again.');
          return;
        }
        
        console.log('Successfully fetched provider:', providerData.provider);
        
        // Fetch package data
        const packageResponse = await fetch(`/api/packages/${packageId}`);
        if (!packageResponse.ok) {
          console.error(`Failed to fetch package: ${packageResponse.status} ${packageResponse.statusText}`);
          setError('Package not found. Please try again or contact support.');
          return;
        }
        
        const packageData = await packageResponse.json();
        if (!packageData.package) {
          console.error('Package data is empty or invalid:', packageData);
          setError('Package information is unavailable. Please try again.');
          return;
        }
        
        console.log('Successfully fetched package:', packageData.package);
        
        setBookingData({
          provider: providerData.provider,
          package: packageData.package
        });

        // We no longer fetch pets as we'll use petName and causeOfDeath fields directly

        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setBookingDate(tomorrow.toISOString().split('T')[0]);

        // Set default time
        setBookingTime('10:00');
      } catch (err) {
        console.error('Failed to load booking information:', err);
        setError('Failed to load booking information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  // Calculate delivery fee when distance or option changes
  useEffect(() => {
    if (deliveryOption === 'delivery' && bookingData?.package?.deliveryFeePerKm) {
      const fee = Math.round(deliveryDistance * bookingData.package.deliveryFeePerKm);
      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryDistance, deliveryOption, bookingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!petName || !petType || !bookingDate || !bookingTime) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('Submitting booking...');
      
      // Upload pet image if available
      let petImageUrl = null;
      if (petImageFile) {
        try {
          const formData = new FormData();
          formData.append('file', petImageFile); // Using 'file' as the parameter name to match the API
          formData.append('petName', petName);
          
          const imageResponse = await fetch('/api/upload/pet-image', {
            method: 'POST',
            body: formData
          });
          
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            petImageUrl = imageData.imageUrl || imageData.filePath; // Get URL from either property
            console.log('Successfully uploaded pet image:', petImageUrl);
          } else {
            console.error('Failed to upload pet image:', await imageResponse.text());
          }
        } catch (imageError) {
          console.error('Error uploading pet image:', imageError);
        }
      }
      
      // Prepare booking data
      const bookingRequestData = {
        packageId: bookingData.package.id,
        providerId: bookingData.provider.id,
        providerName: bookingData.provider.name,
        providerAddress: bookingData.provider.address || bookingData.provider.city || '',
        packageName: bookingData.package.name,
        price: bookingData.package.price,
        date: bookingDate,
        time: bookingTime,
        petName: petName,
        petType: petType,
        causeOfDeath: causeOfDeath || 'Not specified',
        petImageUrl: petImageUrl, 
        specialRequests: specialRequests,
        paymentMethod: paymentMethod,
        deliveryOption: deliveryOption,
        deliveryDistance: deliveryOption === 'delivery' ? deliveryDistance : 0,
        deliveryFee: deliveryOption === 'delivery' ? deliveryFee : 0,
        totalPrice: bookingData.package.price + (deliveryOption === 'delivery' ? deliveryFee : 0),
        userId: userData?.id // Include user ID if available
      };
      
      console.log('Booking request data:', bookingRequestData);

      // Send booking request to API
      console.log('Sending booking request to API...');
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingRequestData)
      });

      console.log('API response status:', response.status);
      const responseData = await response.json();
      console.log('API response data:', responseData);
      
      if (response.ok) {
        console.log('Booking successful:', responseData);
        setCheckoutComplete(true);

        // Redirect to confirmation page after a delay
        setTimeout(() => {
          router.push('/user/furparent_dashboard/bookings');
        }, 3000);
      } else {
        console.error('Booking failed:', responseData);
        setError(responseData.error || responseData.message || 'Failed to process your booking. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting booking:', err);
      setError('An error occurred while processing your booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <FurParentNavbar activePage="bookings" userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`} />

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            <span>Back to Package</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-[var(--primary-green)] mb-8">Checkout</h1>

        {loading ? (
          <FurParentPageSkeleton type="checkout" />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <div className="mt-6 space-y-4">
              <button
                onClick={() => router.back()}
                className="w-full sm:w-auto px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] flex items-center justify-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Go Back
              </button>
              
              <button
                onClick={() => router.push('/user/furparent_dashboard/services')}
                className="w-full sm:w-auto px-4 py-2 border border-[var(--primary-green)] text-[var(--primary-green)] rounded-md hover:bg-green-50 flex items-center justify-center mt-3 sm:mt-0 sm:ml-3"
              >
                Browse All Services
              </button>
              
              <p className="text-gray-600 text-sm mt-4">
                If this error persists, please contact our support team for assistance.
              </p>
            </div>
          </div>
        ) : bookingData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="bg-[var(--primary-green)] p-6">
                  <h2 className="text-xl font-bold text-white">Booking Details</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name of Your Pet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        placeholder="Enter your pet's name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type of Pet <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={petType}
                        onChange={(e) => setPetType(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        required
                      >
                        <option value="">Select Pet Type</option>
                        <option value="Dog">Dog</option>
                        <option value="Cat">Cat</option>
                        <option value="Bird">Bird</option>
                        <option value="Hamster">Hamster</option>
                        <option value="Rabbit">Rabbit</option>
                        <option value="Guinea Pig">Guinea Pig</option>
                        <option value="Fish">Fish</option>
                        <option value="Reptile">Reptile</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cause of Death
                      </label>
                      <input
                        type="text"
                        value={causeOfDeath}
                        onChange={(e) => setCauseOfDeath(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        placeholder="Optional - enter cause of death"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Pet Photo
                      </label>
                      <div className="mt-1 flex items-center space-x-4">
                        {petImagePreview ? (
                          <div className="relative">
                            <img 
                              src={petImagePreview} 
                              alt="Pet preview" 
                              className="w-24 h-24 rounded-md object-cover"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-300 border-dashed cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-gray-500 mt-1">Upload</p>
                            </div>
                            <input 
                              id="pet-image" 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </label>
                        )}
                        <span className="text-sm text-gray-500">Upload a photo of your pet for memorial purposes</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Booking Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CalendarIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Booking Time <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ClockIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="time"
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        placeholder="Any special requests or instructions..."
                      ></textarea>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Method</h3>
                      <div className="space-y-3">
                        <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="payment-method"
                            value="cash"
                            checked={paymentMethod === 'cash'}
                            onChange={() => setPaymentMethod('cash')}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <BanknotesIcon className="h-6 w-6 ml-3 text-gray-600" />
                          <span className="ml-2 text-gray-700">Cash on Arrival</span>
                        </label>

                        <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="payment-method"
                            value="gcash"
                            checked={paymentMethod === 'gcash'}
                            onChange={() => setPaymentMethod('gcash')}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <div className="h-6 w-6 ml-3 flex-shrink-0 relative">
                            <img 
                              src="/images/check-icon.svg" 
                              alt="GCash" 
                              className="h-6 w-6 object-contain"
                              style={{ filter: 'invert(33%) sepia(93%) saturate(1352%) hue-rotate(184deg) brightness(97%) contrast(96%)' }}
                            />
                          </div>
                          <span className="ml-2 text-gray-700">GCash</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Delivery Options</h3>
                      <div className="space-y-3">
                        <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="delivery-option"
                            value="pickup"
                            checked={deliveryOption === 'pickup'}
                            onChange={() => setDeliveryOption('pickup')}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <div className="ml-3">
                            <span className="text-gray-700 font-medium">Pick-up</span>
                            <p className="text-sm text-gray-500 mt-1">
                              You'll need to visit the provider's location to pick up your pet's remains.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="delivery-option"
                            value="delivery"
                            checked={deliveryOption === 'delivery'}
                            onChange={() => setDeliveryOption('delivery')}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <TruckIcon className="h-6 w-6 ml-3 text-gray-600" />
                          <div className="ml-2">
                            <span className="text-gray-700 font-medium">Delivery (additional fee)</span>
                            <p className="text-sm text-gray-500 mt-1">
                              Have your pet's remains delivered to your address.
                            </p>
                          </div>
                        </label>

                        {deliveryOption === 'delivery' && (
                          <div className="ml-7 mt-2 p-4 bg-gray-50 rounded-md">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Delivery Distance (km)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={deliveryDistance || ''}
                              onChange={(e) => setDeliveryDistance(parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="Enter distance in kilometers"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                              Delivery fee: ₱{deliveryFee} (₱{bookingData?.package?.deliveryFeePerKm || 0} per km)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="ml-3 text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-3 px-4 bg-[var(--primary-green)] text-white font-medium rounded-md hover:bg-[var(--primary-green-hover)] transition-colors disabled:opacity-70 flex items-center justify-center"
                    >
                      {isProcessing ? (
                        <>
                          <div className="spinner-sm mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                          Complete Booking
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8"
              >
                <div className="bg-[var(--primary-green)] p-6">
                  <h2 className="text-xl font-bold text-white">Order Summary</h2>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900">{bookingData.provider.name}</h3>
                    <p className="text-gray-600 text-sm">{bookingData.provider.city}</p>
                  </div>

                  <div className="border-t border-b border-gray-200 py-4 mb-4">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium">{bookingData.package.name}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{bookingData.package.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="text-[var(--primary-green)] mr-2">✓</span>
                      {bookingData.package.category} • {bookingData.package.processingTime}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Package Price</span>
                      <span className="font-medium">₱{bookingData.package.price.toLocaleString()}</span>
                    </div>

                    {deliveryOption === 'delivery' && deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-medium">₱{deliveryFee.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="font-medium">Total</span>
                      <span className="font-bold text-[var(--primary-green)]">
                        ₱{(bookingData.package.price + (deliveryOption === 'delivery' ? deliveryFee : 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">Booking Information</h4>
                    <p className="text-sm text-gray-600">
                      Please complete your booking details on the left. Once submitted, you will receive a confirmation email with all the details.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : null}

        {/* Checkout Success Message */}
        {checkoutComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                <p className="text-gray-600 mb-6">
                  Your booking has been successfully processed. You will receive a confirmation email shortly.
                </p>
                <button
                  onClick={() => router.push('/user/furparent_dashboard/bookings')}
                  className="w-full py-3 px-4 bg-[var(--primary-green)] text-white font-medium rounded-md hover:bg-[var(--primary-green-hover)] transition-colors"
                >
                  View My Bookings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default withOTPVerification(CheckoutPage);
