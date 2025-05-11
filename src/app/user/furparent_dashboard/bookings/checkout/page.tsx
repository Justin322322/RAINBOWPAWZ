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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';

interface CheckoutPageProps {
  userData?: any;
}

function CheckoutPage({ userData }: CheckoutPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
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
  
  // Mock data for user's pets
  const mockPets = [
    { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: 8 },
    { id: 2, name: 'Luna', species: 'Cat', breed: 'Siamese', age: 5 }
  ];
  
  useEffect(() => {
    // Get provider and package IDs from URL params
    const providerId = searchParams.get('provider');
    const packageId = searchParams.get('package');
    
    if (!providerId || !packageId) {
      setError('Missing booking information. Please try again.');
      setLoading(false);
      return;
    }
    
    // Simulate fetching booking data
    try {
      const provider = serviceProviders.find(p => p.id.toString() === providerId);
      if (!provider) {
        setError('Provider not found');
        setLoading(false);
        return;
      }
      
      const packageData = provider.packages.find(p => p.id.toString() === packageId);
      if (!packageData) {
        setError('Package not found');
        setLoading(false);
        return;
      }
      
      setBookingData({
        provider,
        package: packageData
      });
      
      setPets(mockPets);
      
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setBookingDate(tomorrow.toISOString().split('T')[0]);
      
      // Set default time
      setBookingTime('10:00');
      
    } catch (err) {
      setError('Failed to load booking information');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPet || !bookingDate || !bookingTime) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCheckoutComplete(true);
      
      // Redirect to confirmation page after a delay
      setTimeout(() => {
        router.push('/user/furparent_dashboard/bookings');
      }, 3000);
      
    } catch (err) {
      setError('Failed to process your booking. Please try again.');
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
          <div className="flex justify-center items-center py-12">
            <div className="spinner"></div>
            <p className="ml-4 text-gray-600">Loading booking information...</p>
          </div>
        ) : error ? (
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
                        Select Your Pet <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedPet || ''}
                        onChange={(e) => setSelectedPet(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                        required
                      >
                        <option value="">Select a pet</option>
                        {pets.map(pet => (
                          <option key={pet.id} value={pet.id}>
                            {pet.name} ({pet.species})
                          </option>
                        ))}
                      </select>
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
                            value="credit_card"
                            checked={paymentMethod === 'credit_card'}
                            onChange={() => setPaymentMethod('credit_card')}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <CreditCardIcon className="h-6 w-6 ml-3 text-gray-600" />
                          <span className="ml-2 text-gray-700">Credit Card</span>
                        </label>
                        
                        <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="payment-method"
                            value="bank_transfer"
                            checked={paymentMethod === 'bank_transfer'}
                            onChange={() => setPaymentMethod('bank_transfer')}
                            className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <BuildingLibraryIcon className="h-6 w-6 ml-3 text-gray-600" />
                          <span className="ml-2 text-gray-700">Bank Transfer</span>
                        </label>
                        
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
                    
                    {/* Add any additional fees or discounts here */}
                    
                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="font-medium">Total</span>
                      <span className="font-bold text-[var(--primary-green)]">₱{bookingData.package.price.toLocaleString()}</span>
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
