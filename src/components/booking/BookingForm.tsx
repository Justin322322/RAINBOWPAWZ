'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import AddOnSelector, { AddOn } from '@/components/booking/AddOnSelector';
import { Button, Input, Textarea, SelectInput } from '@/components/ui';
import { getUserId } from '@/utils/auth';

interface BookingFormProps {
  providerId: number;
  packageId?: number;
  userId?: number; // Make optional since we'll get it from auth
  userData?: any; // Add userData prop for user information
  onBookingComplete?: (bookingId: number) => void;
}

export default function BookingForm({
  providerId,
  packageId,
  userId,
  onBookingComplete
}: BookingFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Get userId from auth if not provided as prop
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form fields
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [totalPrice, setTotalPrice] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [packageName, setPackageName] = useState('');
  const [_packageDesc, setPackageDesc] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [addOnsTotalPrice, setAddOnsTotalPrice] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [petImage, setPetImage] = useState<File | null>(null);
  const [petImageUrl, setPetImageUrl] = useState<string | null>(null);
  const [petImageUploading, setPetImageUploading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [formStep, setFormStep] = useState(1);
  const [formValid, setFormValid] = useState(false);

  // Wrap functions in useCallback to prevent unnecessary re-renders
  const fetchPackageDetails = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/packages/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch package details');
      }
      const data = await response.json();
      setSelectedPackage(data);
      setPackageName(data.name);
      setPackageDesc(data.description);
      setBasePrice(data.price || 0);
    } catch {
      showToast('Error loading package details. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchAvailablePackages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/packages/available-images?providerId=${providerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available packages');
      }
      const data = await response.json();
      setPackages(data.packages || []);
      // Select first package by default if available
      if (data.packages?.length > 0) {
        setSelectedPackage(data.packages[0]);
        setPackageName(data.packages[0].name);
        setPackageDesc(data.packages[0].description);
        setBasePrice(data.packages[0].price || 0);
      }
    } catch {
      showToast('Error loading packages. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [providerId, showToast]);

  const validateForm = useCallback(() => {
    const isValid =
      petName.trim() !== '' &&
      petType.trim() !== '' &&
      selectedPackage !== null &&
      (deliveryOption !== 'delivery' || (deliveryOption === 'delivery' && deliveryAddress.trim() !== ''));

    setFormValid(isValid);
  }, [petName, petType, selectedPackage, deliveryOption, deliveryAddress]);

  const calculateTotalPrice = useCallback(() => {
    let total = basePrice;

    // Add delivery fee if delivery is selected
    if (deliveryOption === 'delivery') {
      total += deliveryFee;
    }

    // Add the total price of selected add-ons
    total += addOnsTotalPrice;

    setTotalPrice(total);
  }, [basePrice, deliveryOption, deliveryFee, addOnsTotalPrice]);

  // Initialize userId from prop or auth
  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId.toString());
    } else {
      const authUserId = getUserId();
      if (authUserId) {
        setCurrentUserId(authUserId);
      } else {
        // With secure JWT authentication, getUserId might return null on client-side
        // In this case, the API endpoints will handle user identification via cookies
        // We can still proceed without explicitly setting the user ID
      }
    }
  }, [userId]);

  // Fetch package details if packageId is provided
  useEffect(() => {
    if (packageId) {
      fetchPackageDetails(packageId);
    } else {
      fetchAvailablePackages();
    }
  }, [packageId, fetchPackageDetails, fetchAvailablePackages]);

  // Update form validation state
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  // Update total price whenever relevant fields change
  useEffect(() => {
    calculateTotalPrice();
  }, [calculateTotalPrice]);



  const handlePetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file', 'error');
      return;
    }

    setPetImage(file);
    const imageUrl = URL.createObjectURL(file);
    setPetImageUrl(imageUrl);
  };

  const uploadPetImage = async () => {
    if (!petImage) return null;

    if (!currentUserId) {
      throw new Error('User not authenticated. Please log in and try again.');
    }

    try {
      setPetImageUploading(true);
      const formData = new FormData();
      formData.append('image', petImage);
      formData.append('userId', currentUserId);

      const response = await fetch('/api/upload/pet-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload pet image');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch {
      throw new Error('Error uploading pet image');
    } finally {
      setPetImageUploading(false);
    }
  };



  const estimateDeliveryFee = async () => {
    if (!deliveryAddress || deliveryOption !== 'delivery') {
      setDeliveryFee(0);
      setDeliveryDistance(0);
      return;
    }

    try {
      // In a real application, you would call a geocoding/distance API here
      // For now, we'll simulate with a basic calculation
      const distance = Math.floor(Math.random() * 20) + 1; // 1-20 km
      const fee = Math.max(50, distance * 15); // Base fee of 50 or 15/km, whichever is higher

      setDeliveryDistance(distance);
      setDeliveryFee(fee);
    } catch {
      setDeliveryFee(100); // Default fee in case of error
    }
  };

  const handleNext = () => {
    if (formStep < 3) {
      setFormStep(formStep + 1);
    }
  };

  const handleBack = () => {
    if (formStep > 1) {
      setFormStep(formStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValid) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!currentUserId) {
      showToast('User not authenticated. Please log in and try again.', 'error');
      return;
    }

    try {
      setLoading(true);

      // Upload pet image if available
      let uploadedImageUrl = null;
      if (petImage) {
        uploadedImageUrl = await uploadPetImage();
      }

      // Create booking
      const bookingData = {
        userId: parseInt(currentUserId, 10),
        providerId,
        packageId: selectedPackage?.id,
        specialRequests,
        petName,
        petType,
        petBreed,
        petImageUrl: uploadedImageUrl,
        causeOfDeath,
        paymentMethod,
        deliveryOption,
        deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : null,
        deliveryDistance: deliveryOption === 'delivery' ? deliveryDistance : 0,
        deliveryFee: deliveryOption === 'delivery' ? deliveryFee : 0,
        price: totalPrice,
        selectedAddOns: selectedAddOns.map(addon => ({
          name: addon.name,
          price: addon.price
        }))
      };

      const response = await fetch('/api/cremation/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const data = await response.json();
      showToast('Booking created successfully!', 'success');

      // Notify parent if callback provided
      if (onBookingComplete) {
        onBookingComplete(data.bookingId);
      } else {
        // Otherwise redirect to bookings page
        router.push('/user/furparent_dashboard/bookings');
      }
    } catch (error) {
      showToast('Error creating booking: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setPackageName(pkg.name);
    setPackageDesc(pkg.description);
    setBasePrice(pkg.price || 0);
  };

  const renderFormStep = () => {
    switch (formStep) {
      case 1:
        return (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Pet Information</h2>
            <div className="space-y-6">
              <div>
                <Input
                  id="petName"
                  label="Pet Name"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Enter your pet's name"
                  required
                  size="lg"
                />
              </div>

              <div>
                <SelectInput
                  id="petType"
                  label="Pet Type"
                  value={petType}
                  onChange={(value) => setPetType(value)}
                  options={[
                    { value: "", label: "Select Pet Type" },
                    { value: "Dog", label: "Dog" },
                    { value: "Cat", label: "Cat" },
                    { value: "Bird", label: "Bird" },
                    { value: "Fish", label: "Fish" },
                    { value: "Rabbit", label: "Rabbit" },
                    { value: "Hamster", label: "Hamster" },
                    { value: "Guinea Pig", label: "Guinea Pig" },
                    { value: "Other", label: "Other" }
                  ]}
                  required
                />
              </div>

              <div>
                <Input
                  id="petBreed"
                  label="Pet Breed (Optional)"
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  placeholder="Enter breed (if applicable)"
                  size="lg"
                />
              </div>

              <div>
                <Input
                  id="causeOfDeath"
                  label="Cause of Death (Optional)"
                  value={causeOfDeath}
                  onChange={(e) => setCauseOfDeath(e.target.value)}
                  placeholder="Cause of death (if known)"
                  size="lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Image (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  {petImageUrl ? (
                    <div className="relative w-full">
                      <div className="flex justify-center">
                        <div className="relative h-48 w-48">
                          <Image
                            src={petImageUrl}
                            alt="Pet preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                          <Button
                            onClick={() => {
                              setPetImage(null);
                              setPetImageUrl(null);
                            }}
                            variant="danger"
                            size="xs"
                            className="absolute -top-2 -right-2 rounded-full p-1"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label htmlFor="pet-image" className="relative cursor-pointer bg-white rounded-md font-medium text-[var(--primary-green)] hover:text-[var(--primary-green-hover)]">
                          <span>Upload an image</span>
                          <Input
                            id="pet-image"
                            name="pet-image"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handlePetImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Service & Delivery Options</h2>
            <div className="space-y-6">
              {/* Service Package Selection (if not already provided) */}
              {!packageId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select a Service Package <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => selectPackage(pkg)}
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          selectedPackage?.id === pkg.id
                            ? 'border-[var(--primary-green)] bg-[var(--primary-green-light)]'
                            : 'border-gray-200 hover:border-[var(--primary-green-light)]'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{pkg.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                            <p className="text-lg font-medium text-[var(--primary-green)] mt-2">
                              ₱{pkg.price.toLocaleString()}
                            </p>
                          </div>
                          {selectedPackage?.id === pkg.id && (
                            <CheckCircleIcon className="h-6 w-6 text-[var(--primary-green)]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Options <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setDeliveryOption('pickup')}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      deliveryOption === 'pickup'
                        ? 'border-[var(--primary-green)] bg-[var(--primary-green-light)]'
                        : 'border-gray-200 hover:border-[var(--primary-green-light)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">Pickup</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          You&apos;ll bring your pet to the cremation center
                        </p>
                        <p className="text-sm font-medium text-[var(--primary-green)] mt-2">
                          Free
                        </p>
                      </div>
                      {deliveryOption === 'pickup' && (
                        <CheckCircleIcon className="h-6 w-6 text-[var(--primary-green)]" />
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryOption('delivery')}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      deliveryOption === 'delivery'
                        ? 'border-[var(--primary-green)] bg-[var(--primary-green-light)]'
                        : 'border-gray-200 hover:border-[var(--primary-green-light)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">Delivery</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          We&apos;ll pick up your pet from your location
                        </p>
                        {deliveryFee > 0 && (
                          <p className="text-sm font-medium text-[var(--primary-green)] mt-2">
                            ₱{deliveryFee.toLocaleString()} ({deliveryDistance} km)
                          </p>
                        )}
                      </div>
                      {deliveryOption === 'delivery' && (
                        <CheckCircleIcon className="h-6 w-6 text-[var(--primary-green)]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address (if delivery is selected) */}
              {deliveryOption === 'delivery' && (
                <div>
                  <Textarea
                    id="deliveryAddress"
                    label="Delivery Address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    onBlur={estimateDeliveryFee}
                    placeholder="Enter your full address"
                    rows={3}
                    required
                  />
                  {deliveryDistance > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Estimated distance: {deliveryDistance} km (₱{deliveryFee.toLocaleString()} delivery fee)
                    </p>
                  )}
                </div>
              )}

              {/* Add-ons */}
              {selectedPackage && (
                <div className="mb-4">
                  <AddOnSelector
                    packageId={selectedPackage.id}
                    selectedAddOns={selectedAddOns}
                    onAddOnsChange={setSelectedAddOns}
                    onTotalPriceChange={setAddOnsTotalPrice}
                  />
                </div>
              )}

              {/* Special Requests */}
              <div>
                <Textarea
                  id="specialRequests"
                  label="Special Requests (Optional)"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special instructions or requests..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Payment & Review</h2>
            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setPaymentMethod('cash')}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      paymentMethod === 'cash'
                        ? 'border-[var(--primary-green)] bg-[var(--primary-green-light)]'
                        : 'border-gray-200 hover:border-[var(--primary-green-light)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">Cash</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Pay with cash upon arrival
                        </p>
                      </div>
                      {paymentMethod === 'cash' && (
                        <CheckCircleIcon className="h-6 w-6 text-[var(--primary-green)]" />
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('gcash')}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      paymentMethod === 'gcash'
                        ? 'border-[var(--primary-green)] bg-[var(--primary-green-light)]'
                        : 'border-gray-200 hover:border-[var(--primary-green-light)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">GCash</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Pay using GCash
                        </p>
                      </div>
                      {paymentMethod === 'gcash' && (
                        <CheckCircleIcon className="h-6 w-6 text-[var(--primary-green)]" />
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-[var(--primary-green)] bg-[var(--primary-green-light)]'
                        : 'border-gray-200 hover:border-[var(--primary-green-light)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">Bank Transfer</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Pay via bank transfer
                        </p>
                      </div>
                      {paymentMethod === 'bank_transfer' && (
                        <CheckCircleIcon className="h-6 w-6 text-[var(--primary-green)]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Package</dt>
                    <dd className="text-sm font-medium text-gray-900">{packageName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Base Price</dt>
                    <dd className="text-sm font-medium text-gray-900">₱{basePrice.toLocaleString()}</dd>
                  </div>

                  {/* Selected Add-ons */}
                  {selectedAddOns.length > 0 && (
                    <>
                      <div className="mt-2 mb-1">
                        <dt className="text-sm text-gray-600">Selected Add-ons:</dt>
                      </div>
                      {selectedAddOns.map((addon, index) => (
                        <div key={index} className="flex justify-between pl-4">
                          <dt className="text-sm text-gray-600">{addon.name}</dt>
                          <dd className="text-sm font-medium text-gray-900">₱{addon.price.toLocaleString()}</dd>
                        </div>
                      ))}
                      <div className="flex justify-between mt-1">
                        <dt className="text-sm text-gray-600">Add-ons Subtotal</dt>
                        <dd className="text-sm font-medium text-gray-900">₱{addOnsTotalPrice.toLocaleString()}</dd>
                      </div>
                    </>
                  )}

                  {deliveryOption === 'delivery' && deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Delivery Fee ({deliveryDistance} km)</dt>
                      <dd className="text-sm font-medium text-gray-900">₱{deliveryFee.toLocaleString()}</dd>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <dt className="text-base font-medium text-gray-900">Total</dt>
                    <dd className="text-base font-medium text-[var(--primary-green)]">₱{totalPrice.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Form content */}
      <form onSubmit={handleSubmit}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
          </div>
        ) : (
          <>
            {renderFormStep()}

            {/* Form navigation */}
            <div className="mt-8 flex justify-between">
              <Button
                type="button"
                onClick={handleBack}
                variant="secondary"
                size="lg"
                className={formStep === 1 ? 'invisible' : ''}
              >
                Back
              </Button>

              {formStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  variant="primary"
                  size="lg"
                  disabled={formStep === 1 && (!petName || !petType) || (formStep === 2 && !selectedPackage)}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!formValid || loading || petImageUploading}
                  isLoading={loading || petImageUploading}
                  leftIcon={loading || petImageUploading ? <ArrowPathIcon className="h-5 w-5" /> : undefined}
                >
                  {loading || petImageUploading ? 'Processing...' : 'Confirm Booking'}
                </Button>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}