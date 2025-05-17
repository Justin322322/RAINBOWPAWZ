'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
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
import { useCart } from '@/contexts/CartContext';
import TimeSlotSelector from '@/components/booking/TimeSlotSelector';

interface CheckoutPageProps {
  userData?: any;
}

function CheckoutPage({ userData }: CheckoutPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem } = useCart();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('gcash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petGender, setPetGender] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [petType, setPetType] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any | null>(null);

  // Field validation state
  const [validationErrors, setValidationErrors] = useState<{
    petName?: string;
    petType?: string;
    selectedDate?: string;
    selectedTimeSlot?: string;
    deliveryAddress?: string;
    formSubmitted: boolean;
  }>({
    formSubmitted: false
  });
  // We'll use petSpecialNotes instead of specialRequests
  const [petImageFile, setPetImageFile] = useState<File | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [petSpecialNotes, setPetSpecialNotes] = useState('');
  const [providerData, setProviderData] = useState<any>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);

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

  // Clear validation error for a specific field
  const clearValidationError = (field: string) => {
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof validationErrors];
        return newErrors;
      });
    }
  };

  // Validate a field and show toast if invalid
  const validateField = (fieldName: string, value: string, displayName: string) => {
    if (!value.trim()) {
      // Set validation error
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: `${displayName} is required`,
        formSubmitted: true // Set this to true to show the error immediately
      }));

      // Show toast notification
      showToast(`${displayName} is required`, 'error');
      return false;
    }

    // Clear validation error if field is valid
    clearValidationError(fieldName);
    return true;
  };

  // Handle pet name change with validation
  const handlePetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPetName(value);

    // Clear validation error if field is now valid
    if (value.trim()) {
      clearValidationError('petName');
    }
  };

  // Handle pet name blur with validation
  const handlePetNameBlur = () => {
    validateField('petName', petName, 'Pet name');
  };

  // Handle pet type change with validation
  const handlePetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setPetType(value);

    // Clear validation error if field is now valid
    if (value) {
      clearValidationError('petType');
    }
  };

  // Handle pet type blur with validation
  const handlePetTypeBlur = () => {
    validateField('petType', petType, 'Pet type');
  };

  // Handle delivery option change with validation
  const handleDeliveryOptionChange = (option: 'pickup' | 'delivery') => {
    setDeliveryOption(option);

    // Clear delivery address validation error if switching to pickup
    if (option === 'pickup') {
      clearValidationError('deliveryAddress');
    } else if (option === 'delivery' && userData && (!userData.address && !userData.city)) {
      // If switching to delivery and user doesn't have an address, show validation error
      setValidationErrors(prev => ({
        ...prev,
        deliveryAddress: "Your profile does not have a delivery address. Please update your profile before selecting delivery.",
        formSubmitted: true
      }));
      showToast("Your profile does not have a delivery address. Please update your profile.", 'error');
    }
  };

  // Validate delivery address if delivery option is selected
  const validateDeliveryAddress = () => {
    if (deliveryOption === 'delivery' && userData && (!userData.address && !userData.city)) {
      setValidationErrors(prev => ({
        ...prev,
        deliveryAddress: "Your profile does not have a delivery address. Please update your profile before selecting delivery.",
        formSubmitted: true
      }));
      showToast("Your profile does not have a delivery address. Please update your profile.", 'error');
      return false;
    }
    return true;
  };

  // Validate date selection
  const validateDateSelection = () => {
    if (!selectedDate) {
      setValidationErrors(prev => ({
        ...prev,
        selectedDate: "Please select a date for your booking",
        formSubmitted: true
      }));
      showToast("Please select a date for your booking", 'error');
      return false;
    }
    return true;
  };

  // Validate time slot selection
  const validateTimeSlotSelection = () => {
    if (!selectedTimeSlot) {
      setValidationErrors(prev => ({
        ...prev,
        selectedTimeSlot: "Please select a time slot for your booking",
        formSubmitted: true
      }));
      showToast("Please select a time slot for your booking", 'error');
      return false;
    }
    return true;
  };

  // Handle date and time selection with validation
  const handleDateTimeSelected = (date: string, timeSlot: any | null) => {
    console.log('[Checkout] Date/time selection changed:', { date, timeSlot });

    // Only update state if we have valid values
    if (date) {
      setSelectedDate(date);
      clearValidationError('selectedDate');
    }

    // Only update time slot if one is provided
    // This prevents clearing the time slot when just the date is selected
    if (timeSlot) {
      setSelectedTimeSlot(timeSlot);
      clearValidationError('selectedTimeSlot');
    }

    // Always clear any date/time related errors when the user is making selections
    if (error && (
      error.includes("date") ||
      error.includes("time slot") ||
      error.includes("Missing booking information")
    )) {
      setError(null);
    }

    // If date is selected but time slot is null, the user is in the middle of the selection process
    if (date && !timeSlot) {
      console.log('[Checkout] Date selected but no time slot yet. Waiting for time slot selection.');
      // We don't set an error here because the user is still in the process of selecting
    }

    // If both date and time slot are selected, show a success toast
    if (date && timeSlot) {
      showToast(`Date and time selected: ${new Date(date).toLocaleDateString()} at ${timeSlot.start}`, 'success');
    }
  };

  // Store provider and package IDs from URL params to prevent losing them
  const [initialParamsProcessed, setInitialParamsProcessed] = useState(false);

  useEffect(() => {
    // Only process URL parameters once to prevent issues during re-renders
    if (initialParamsProcessed) {
      return;
    }

    // Get provider and package IDs from URL params
    const providerIdParam = searchParams.get('provider');
    const packageIdParam = searchParams.get('package');
    const fromCart = searchParams.get('fromCart');
    const petIdParam = searchParams.get('petId');
    const petNameParam = searchParams.get('petName');

    // Handle payment method and delivery option from URL params
    const paymentMethodParam = searchParams.get('payment-method');
    const deliveryOptionParam = searchParams.get('delivery-option');

    // Set payment method if provided in URL (only accept gcash)
    if (paymentMethodParam && paymentMethodParam === 'gcash') {
      setPaymentMethod('gcash');
    } else {
      // Default to gcash regardless of what's in the URL
      setPaymentMethod('gcash');
    }

    // Set delivery option if provided in URL
    if (deliveryOptionParam && ['pickup', 'delivery'].includes(deliveryOptionParam as any)) {
      setDeliveryOption(deliveryOptionParam as 'pickup' | 'delivery');
    }

    // Set the provider and package IDs in state
    if (providerIdParam) {
      setProviderId(parseInt(providerIdParam, 10));
    }
    if (packageIdParam) {
      setPackageId(parseInt(packageIdParam, 10));
    }

    // Mark that we've processed the initial parameters
    setInitialParamsProcessed(true);

    if (!providerIdParam || !packageIdParam) {
      // Only show a specific error about missing provider/package IDs
      // This is different from the date/time selection error
      setError('Missing provider or package information. Please try again.');
      setLoading(false);
      return;
    }

    // Fetch real data from API
    const fetchData = async () => {
      try {
        console.log(`Fetching provider (ID: ${providerIdParam}) and package (ID: ${packageIdParam}) data for checkout`);

        // Debug section removed - no longer needed

        // Fetch provider data
        const providerResponse = await fetch(`/api/service-providers/${providerIdParam}`);
        if (!providerResponse.ok) {
          console.error(`Failed to fetch provider: ${providerResponse.status} ${providerResponse.statusText}`);

          // Try special case for test providers
          if (providerIdParam === '1001' || providerIdParam === '1002' || providerIdParam === '1003') {
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

            const testProvider = testProviders[providerIdParam as keyof typeof testProviders];
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

              let testPackage = testPackages[packageIdParam as keyof typeof testPackages];
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

              // Don't set default date and time - require user to select them
              setSelectedDate('');
              setSelectedTimeSlot(null);

              // Set pet information if coming from cart
              if (fromCart === 'true' && petIdParam && petNameParam) {
                setPetName(decodeURIComponent(petNameParam));

                // Fetch additional pet details if available
                try {
                  const petResponse = await fetch(`/api/pets/${petIdParam}`);
                  if (petResponse.ok) {
                    const petData = await petResponse.json();
                    if (petData.pet) {
                      const pet = petData.pet;
                      setPetType(pet.species || '');
                      setPetBreed(pet.breed || '');
                      setPetGender(pet.gender || '');
                      setPetAge(pet.age || '');
                      setPetWeight(pet.weight?.toString() || '');
                      setPetSpecialNotes(pet.special_notes || '');
                    }
                  }
                } catch (petError) {
                  console.error('Error fetching pet details:', petError);
                }
              }

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
        const packageResponse = await fetch(`/api/packages/${packageIdParam}`);
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

        // Don't set default date and time - require user to select them
        setSelectedDate('');
        setSelectedTimeSlot(null);

        // Set pet information if coming from cart
        if (fromCart === 'true' && petIdParam && petNameParam) {
          setPetName(decodeURIComponent(petNameParam));

          // Fetch additional pet details if available
          try {
            const petResponse = await fetch(`/api/pets/${petIdParam}`);
            if (petResponse.ok) {
              const petData = await petResponse.json();
              if (petData.pet) {
                const pet = petData.pet;
                setPetType(pet.species || '');
                setPetBreed(pet.breed || '');
                setPetGender(pet.gender || '');
                setPetAge(pet.age || '');
                setPetWeight(pet.weight?.toString() || '');
                setPetSpecialNotes(pet.special_notes || '');
              }
            }
          } catch (petError) {
            console.error('Error fetching pet details:', petError);
          }
        }
      } catch (err) {
        console.error('Failed to load booking information:', err);
        setError('Failed to load booking information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, initialParamsProcessed]);

  // Calculate delivery fee based on provider's distance when option changes
  useEffect(() => {
    if (deliveryOption === 'delivery' && bookingData?.provider?.distance) {
      // Extract distance value from provider.distance (format: "X.X km away")
      const distanceStr = bookingData.provider.distance.split(' ')[0];
      const distance = parseFloat(distanceStr) || 0;

      // Update delivery distance state
      setDeliveryDistance(distance);

      // Use default rate of 50 pesos per km if not specified in package
      const ratePerKm = bookingData?.package?.deliveryFeePerKm || 50;

      // Calculate fee
      const fee = Math.round(distance * ratePerKm);
      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryOption, bookingData]);

  // Ensure we have user address for delivery
  useEffect(() => {
    if (userData && deliveryOption === 'delivery') {
      // Check if the user has an address in their profile
      if (!userData.address && !userData.city) {
        console.warn('[Checkout] User does not have a complete address in their profile');
      }
    }
  }, [userData, deliveryOption]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark the form as submitted to show all validation errors
    setValidationErrors(prev => ({ ...prev, formSubmitted: true }));

    // Validate all required fields using our validation functions
    const isPetNameValid = validateField('petName', petName, 'Pet name');
    const isPetTypeValid = validateField('petType', petType, 'Pet type');
    const isDateValid = validateDateSelection();
    const isTimeSlotValid = validateTimeSlotSelection();
    const isDeliveryAddressValid = validateDeliveryAddress();

    // Check if all validations passed
    if (!isPetNameValid || !isPetTypeValid || !isDateValid || !isTimeSlotValid || !isDeliveryAddressValid) {
      // Scroll to the first error field
      const firstErrorField = document.querySelector('.error-field');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Clear any previous errors if validation passes
    setError(null);

    console.log("[Checkout] Proceeding with booking:", {
      provider: providerId,
      package: packageId,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      petName,
      petType
    });

    if (!userData) {
      const message = 'You must be logged in to complete a booking';
      setError(message);
      showToast(message, 'error');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Upload pet image if available
      let petImageUrl = null;
      if (petImageFile) {
        try {
          const formData = new FormData();
          formData.append('image', petImageFile);
          formData.append('userId', userData.id.toString());
          formData.append('petName', petName); // Add pet name for better filename

          console.log('Uploading pet image...');
          const uploadResponse = await fetch('/api/upload/pet-image', {
            method: 'POST',
            body: formData
          });

          try {
            const responseText = await uploadResponse.text();
            let uploadData;

            try {
              uploadData = JSON.parse(responseText);
            } catch (parseError) {
              console.error('Failed to parse upload response as JSON:', responseText);
              throw new Error('Invalid response from image upload server');
            }

            if (uploadResponse.ok) {
              // The API returns imagePath, not imageUrl
              petImageUrl = uploadData.imagePath;
              console.log('Pet image uploaded successfully:', petImageUrl);
            } else {
              console.error('Failed to upload pet image:', uploadData.error || 'Unknown error');
            }
          } catch (responseError) {
            console.error('Error processing upload response:', responseError);
            // Continue with booking even if image upload fails
          }
        } catch (uploadError) {
          console.error('Error during image upload:', uploadError);
          // Continue with the booking process even if image upload fails
        }
      }

      // First, save the pet information
      let petId = null;
      if (userData.id && petName && petType) {
        try {
          // Map the data to match the API's expected field names
          const petData = {
            name: petName,
            species: petType,
            breed: petBreed || undefined,
            gender: petGender || undefined,
            age: petAge || undefined,
            weight: petWeight ? parseFloat(petWeight) : undefined,
            specialNotes: petSpecialNotes || undefined, // Changed from special_notes to specialNotes
            imagePath: petImageUrl // Changed from image_url to imagePath
          };

          console.log('Saving pet data:', petData);

          const petResponse = await fetch('/api/pets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(petData)
          });

          try {
            const responseText = await petResponse.text();
            let petResult;

            try {
              petResult = JSON.parse(responseText);
            } catch (parseError) {
              console.error('Failed to parse pet response as JSON:', responseText);
              throw new Error('Invalid response from pet saving server');
            }

            if (petResponse.ok) {
              console.log('Pet information saved successfully:', petResult);

              // Check for petId in different possible response formats
              if (petResult.pet && petResult.pet.id) {
                petId = petResult.pet.id;
              } else if (petResult.petId) {
                petId = petResult.petId;
              } else if (petResult.id) {
                petId = petResult.id;
              }

              console.log('Pet ID extracted:', petId);
            } else {
              console.error('Failed to save pet information:', petResult.error || 'Unknown error');
              // Don't fail the booking if pet saving fails, just log the error
            }
          } catch (responseError) {
            console.error('Error processing pet save response:', responseError);
            // Continue with booking even if pet saving fails
          }
        } catch (petError) {
          console.error('Error saving pet information:', petError);
          // Don't fail the booking if pet saving fails, just log the error
        }
      }

      // Prepare booking data
      const bookingData = {
        userId: userData.id,
        providerId: providerId || 0,
        packageId: packageId || 0,
        bookingDate: selectedDate,
        bookingTime: selectedTimeSlot?.start,
        petId: petId, // Include the pet ID if we successfully saved the pet
        petName,
        petType,
        petBreed: petBreed || undefined,
        petImageUrl, // This will be the image path from the upload
        causeOfDeath: causeOfDeath || undefined,
        specialRequests: petSpecialNotes || undefined, // Use petSpecialNotes instead of specialRequests
        paymentMethod,
        deliveryOption,
        // Use user's existing address from profile for delivery
        deliveryAddress: deliveryOption === 'delivery'
          ? (userData.address || userData.city || '')
          : undefined,
        deliveryDistance: deliveryOption === 'delivery' ? deliveryDistance : 0,
        deliveryFee: deliveryOption === 'delivery' ? deliveryFee : 0,
        price: calculateTotalPrice()
      };

      console.log('Submitting booking:', bookingData);

      // Submit the booking
      const bookingResponse = await fetch('/api/cremation/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      let responseData;
      try {
        // Try to parse the response as JSON
        const responseText = await bookingResponse.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          // If JSON parsing fails, handle the error
          console.error('Failed to parse response as JSON:', responseText);
          throw new Error('Invalid response from server. Please try again later.');
        }

        // Check if the response was not OK
        if (!bookingResponse.ok) {
          throw new Error(responseData.error || 'Failed to create booking');
        }
      } catch (responseError) {
        console.error('Error processing booking response:', responseError);
        throw responseError;
      }
      console.log('Booking created successfully:', responseData);

      // Clear cart if booking was from cart
      if (searchParams.get('fromCart') === 'true') {
        console.log('Clearing cart...');
        // Clear the cart using the clearCart function from CartContext
        try {
          removeItem(items[0]?.id); // Remove the processed item
          // If we want to clear the entire cart, we would use clearCart() instead
          console.log('Cart cleared successfully');
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
          // Don't fail the checkout if cart clearing fails
        }
      }

      setCheckoutComplete(true);

      // Store the booking ID for reference in the success message
      const bookingId = responseData.bookingId;

      // Show success toast
      showToast('Booking completed successfully!', 'success');

      // Redirect to the bookings page after a short delay
      setTimeout(() => {
        router.push('/user/furparent_dashboard/bookings?success=true&bookingId=' + bookingId);
      }, 3000);

    } catch (error) {
      console.error('Error processing booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your booking.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!bookingData?.package?.price) return 0;

    const basePrice = Number(bookingData.package.price);
    const delivery = deliveryOption === 'delivery' ? Number(deliveryFee) : 0;

    return basePrice + delivery;
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

                <form className="p-6" onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* Pet Information Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <UserIcon className="h-5 w-5 inline mr-2 text-[var(--primary-green)]" />
                        Pet Information
                      </h3>

                      <div className="space-y-4">
                        <div className={validationErrors.petName && validationErrors.formSubmitted ? 'error-field' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name of Your Pet <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={petName}
                              onChange={handlePetNameChange}
                              onBlur={handlePetNameBlur}
                              className={`w-full p-3 border ${
                                validationErrors.petName && validationErrors.formSubmitted
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-300'
                              } rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]`}
                              placeholder="Enter your pet's name"
                              required
                              aria-invalid={validationErrors.petName && validationErrors.formSubmitted ? 'true' : 'false'}
                              aria-describedby={validationErrors.petName && validationErrors.formSubmitted ? 'pet-name-error' : undefined}
                            />
                            {validationErrors.petName && validationErrors.formSubmitted && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          {validationErrors.petName && validationErrors.formSubmitted && (
                            <p className="mt-2 text-sm text-red-600 flex items-center" id="pet-name-error">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                              {validationErrors.petName}
                            </p>
                          )}
                        </div>

                        <div className={validationErrors.petType && validationErrors.formSubmitted ? 'error-field' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type of Pet <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={petType}
                              onChange={handlePetTypeChange}
                              onBlur={handlePetTypeBlur}
                              className={`w-full p-3 border ${
                                validationErrors.petType && validationErrors.formSubmitted
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-300'
                              } rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]`}
                              required
                              aria-invalid={validationErrors.petType && validationErrors.formSubmitted ? 'true' : 'false'}
                              aria-describedby={validationErrors.petType && validationErrors.formSubmitted ? 'pet-type-error' : undefined}
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
                            {validationErrors.petType && validationErrors.formSubmitted && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          {validationErrors.petType && validationErrors.formSubmitted && (
                            <p className="mt-2 text-sm text-red-600 flex items-center" id="pet-type-error">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                              {validationErrors.petType}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Breed
                          </label>
                          <input
                            type="text"
                            value={petBreed}
                            onChange={(e) => setPetBreed(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                            placeholder="Enter your pet's breed"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Gender
                            </label>
                            <select
                              value={petGender}
                              onChange={(e) => setPetGender(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Unknown">Unknown</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Age
                            </label>
                            <input
                              type="text"
                              value={petAge}
                              onChange={(e) => setPetAge(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                              placeholder="e.g. 5 years, 8 months"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={petWeight}
                            onChange={(e) => setPetWeight(e.target.value)}
                            min="0"
                            step="0.1"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                            placeholder="Enter weight in kilograms"
                          />
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
                            Special Notes
                          </label>
                          <textarea
                            value={petSpecialNotes}
                            onChange={(e) => setPetSpecialNotes(e.target.value)}
                            rows={2}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                            placeholder="Any special details about your pet..."
                          ></textarea>
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
                      </div>
                    </div>

                    {/* Date and Time Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <CalendarIcon className="h-5 w-5 inline mr-2 text-[var(--primary-green)]" />
                        Schedule
                      </h3>

                      <div className={
                        (validationErrors.selectedDate || validationErrors.selectedTimeSlot) && validationErrors.formSubmitted
                          ? 'border-2 border-red-300 rounded-lg p-1 error-field'
                          : ''
                      }>
                        <TimeSlotSelector
                          providerId={providerId || 0}
                          onDateTimeSelected={handleDateTimeSelected}
                          selectedDate={selectedDate}
                          selectedTimeSlot={selectedTimeSlot}
                          packageId={packageId || 0}
                        />
                      </div>

                      {/* Validation error messages for date/time selection */}
                      {(validationErrors.selectedDate || validationErrors.selectedTimeSlot) && validationErrors.formSubmitted && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <div className="flex">
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                            <div>
                              {validationErrors.selectedDate && (
                                <p className="text-sm text-red-600 font-medium">{validationErrors.selectedDate}</p>
                              )}
                              {validationErrors.selectedTimeSlot && (
                                <p className="text-sm text-red-600 font-medium">{validationErrors.selectedTimeSlot}</p>
                              )}
                              <p className="text-sm text-red-500 mt-1">
                                Please select both a date and time slot from the calendar above.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Method Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <CreditCardIcon className="h-5 w-5 inline mr-2 text-[var(--primary-green)]" />
                        Payment Method
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center p-4 border rounded-md bg-blue-50 border-blue-200">
                          <div className="h-6 w-6 flex-shrink-0 relative">
                            <img
                              src="/images/check-icon.svg"
                              alt="GCash"
                              className="h-6 w-6 object-contain"
                              style={{ filter: 'invert(33%) sepia(93%) saturate(1352%) hue-rotate(184deg) brightness(97%) contrast(96%)' }}
                            />
                          </div>
                          <div className="ml-3">
                            <span className="font-medium text-gray-800">GCash</span>
                            <p className="text-sm text-gray-600 mt-1">
                              Pay securely using your GCash account. You will receive payment instructions after booking.
                            </p>
                          </div>
                          <CheckIcon className="h-5 w-5 ml-auto text-green-500" />
                        </div>

                        {/* Hidden input to maintain the payment method state */}
                        <input
                          type="hidden"
                          name="payment-method"
                          value="gcash"
                        />
                      </div>
                    </div>

                    {/* Delivery Options Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <TruckIcon className="h-5 w-5 inline mr-2 text-[var(--primary-green)]" />
                        Delivery Options
                      </h3>

                      <div className="space-y-3">
                        <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="delivery-option"
                            value="pickup"
                            checked={deliveryOption === 'pickup'}
                            onChange={() => handleDeliveryOptionChange('pickup')}
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
                            onChange={() => handleDeliveryOptionChange('delivery')}
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
                          <div className={`ml-7 mt-2 p-4 ${
                            validationErrors.deliveryAddress && validationErrors.formSubmitted
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-gray-50'
                          } rounded-md ${
                            validationErrors.deliveryAddress && validationErrors.formSubmitted ? 'error-field' : ''
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Delivery Distance
                              </label>
                              <span className="text-sm font-semibold text-[var(--primary-green)]">
                                {bookingData?.provider?.distance?.split(' ')[0] || '0'} km
                              </span>
                            </div>

                            {userData?.address ? (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700">Delivery Address:</p>
                                <p className="text-sm text-gray-600 mt-1">{userData.address}</p>
                                <p className="text-sm text-gray-600">{userData.city}, {userData.region}</p>
                              </div>
                            ) : (
                              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex">
                                  <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm text-red-700 font-medium">
                                      Your profile doesn't have a delivery address.
                                    </p>
                                    {validationErrors.deliveryAddress && validationErrors.formSubmitted && (
                                      <p className="text-sm text-red-600 mt-1">{validationErrors.deliveryAddress}</p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => router.push('/user/furparent_dashboard/profile')}
                                  className="mt-3 px-3 py-1 bg-[var(--primary-green)] text-white text-sm rounded-md"
                                >
                                  Update Profile
                                </button>
                              </div>
                            )}

                            <p className="text-sm text-gray-500">
                              Delivery fee: ₱{deliveryFee}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtle validation indicator */}
                  {(error || Object.keys(validationErrors).filter(key => key !== 'formSubmitted').length > 0) && validationErrors.formSubmitted && (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-gray-600">
                        Please complete all required fields marked with <span className="text-red-500">*</span> before proceeding.
                      </p>
                    </div>
                  )}

                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`w-full py-3 px-4 ${
                        Object.keys(validationErrors).filter(key => key !== 'formSubmitted').length > 0 && validationErrors.formSubmitted
                          ? 'bg-gray-400 hover:bg-gray-500'
                          : 'bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)]'
                      } text-white font-medium rounded-md transition-colors disabled:opacity-70 flex items-center justify-center`}
                      onClick={(e) => {
                        // If there are validation errors and the form has been submitted,
                        // show a toast reminding the user to fix the errors
                        if (Object.keys(validationErrors).filter(key => key !== 'formSubmitted').length > 0 && validationErrors.formSubmitted) {
                          e.preventDefault(); // Prevent default to avoid double validation
                          showToast('Please fix the highlighted fields before proceeding', 'warning');

                          // Scroll to the first error field
                          const firstErrorField = document.querySelector('.error-field');
                          if (firstErrorField) {
                            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <div className="spinner-sm mr-2"></div>
                          Processing...
                        </>
                      ) : Object.keys(validationErrors).filter(key => key !== 'formSubmitted').length > 0 && validationErrors.formSubmitted ? (
                        <>
                          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                          Fix Required Fields
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                          Complete Booking
                        </>
                      )}
                    </button>

                    {/* Help text */}
                    <p className="text-sm text-gray-500 text-center mt-3">
                      By completing this booking, you agree to our terms and conditions.
                    </p>
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
                        ₱{(Number(bookingData.package.price) + (deliveryOption === 'delivery' ? Number(deliveryFee) : 0)).toLocaleString()}
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
                <div className="bg-green-50 p-4 rounded-md mb-4 w-full text-left">
                  <h3 className="font-medium text-green-800 mb-2">Booking Details:</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li><span className="font-medium">Pet:</span> {petName} ({petType})</li>
                    <li><span className="font-medium">Service:</span> {bookingData?.package?.name}</li>
                    <li><span className="font-medium">Provider:</span> {bookingData?.provider?.name}</li>
                    <li><span className="font-medium">Date:</span> {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Not specified'}</li>
                    <li><span className="font-medium">Time:</span> {selectedTimeSlot?.start ? selectedTimeSlot.start : 'Not specified'}</li>
                    <li><span className="font-medium">Total:</span> ₱{calculateTotalPrice().toLocaleString()}</li>
                  </ul>
                </div>
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
