'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
  import {
    ArrowLeftIcon,
    PlusIcon,
    XMarkIcon,
    CheckIcon,
    ExclamationCircleIcon
  } from '@heroicons/react/24/outline';
import { ImageUploader } from '@/components/packages/ImageUploader';

interface AddOn {
  name: string;
  price: number | null;
}

interface PackageFormData {
  id: number;
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  deliveryFeePerKm: number;
  inclusions: string[];
  addOns: AddOn[];
  conditions: string;
  images: string[];
}

interface EditPackagePageProps {
  userData?: any;
}

function EditPackagePage({ userData }: EditPackagePageProps) {
  const router = useRouter();
  const params = useParams();
  const packageId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newInclusion, setNewInclusion] = useState('');
  const [newAddOn, setNewAddOn] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState<string>('');
  const [formData, setFormData] = useState<PackageFormData>({
    id: parseInt(packageId),
    name: '',
    description: '',
    category: 'Private',
    cremationType: 'Standard',
    processingTime: '1-2 days',
    price: 0,
    deliveryFeePerKm: 0,
    inclusions: [],
    addOns: [],
    conditions: '',
    images: []
  });

  // Add state for individual image loading
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());

  // No mock data needed anymore as we're using the API

  // Load package data on component mount
  useEffect(() => {
    const fetchPackageData = async () => {
      setIsLoading(true);
      try {
        // Fetch package data from API
        const response = await fetch(`/api/packages/${packageId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load package data');
        }

        const data = await response.json();
        console.log('Fetched package data:', JSON.stringify(data, null, 2));

        if (data.package) {
          // Process add-ons from the API response
          let processedAddOns = [];

          // Check if addOns is an array of strings (legacy format) or objects
          if (Array.isArray(data.package.addOns)) {
            processedAddOns = data.package.addOns.map((addon: any) => {
              // If it's a string (legacy format)
              if (typeof addon === 'string') {
                // Parse price from string if it exists
                const priceMatch = addon.match(/\(\+₱([\d,]+)\)/);
                let price = null;
                let name = addon;

                if (priceMatch) {
                  price = parseFloat(priceMatch[1].replace(/,/g, ''));
                  name = addon.replace(/\s*\(\+₱[\d,]+\)/, '').trim();
                }

                return { name, price };
              }
              // If it's already an object
              else if (typeof addon === 'object' && addon !== null) {
                return {
                  name: addon.name || '',
                  price: addon.price !== null && addon.price !== undefined ?
                    (typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price) :
                    null
                };
              }
              // Fallback for any other format
              return { name: String(addon), price: null };
            });
          }

          console.log('Processed add-ons:', processedAddOns);

          // Ensure all data is properly formatted
          const formattedData = {
            ...data.package,
            // Ensure price is a number
            price: typeof data.package.price === 'string' ?
              parseFloat(data.package.price) : data.package.price,
            // Ensure deliveryFeePerKm is a number
            deliveryFeePerKm: typeof data.package.deliveryFeePerKm === 'string' ?
              parseFloat(data.package.deliveryFeePerKm) : (data.package.deliveryFeePerKm || 0),
            // Use the processed add-ons
            addOns: processedAddOns
          };

          console.log('Formatted package data for form:', JSON.stringify(formattedData, null, 2));

          // Ensure deliveryFeePerKm is properly set
          if (formattedData.deliveryFeePerKm === undefined) {
            formattedData.deliveryFeePerKm = 0;
            console.log('Setting default deliveryFeePerKm to 0');
          } else {
            console.log('Using deliveryFeePerKm from API:', formattedData.deliveryFeePerKm);
          }

          setFormData(formattedData);
        } else {
          setErrors({ submit: 'Package not found' });
          showToast('Package not found', 'error');
        }
      } catch (error) {
        console.error('Error fetching package data:', error);
        setErrors({ submit: 'Failed to load package data' });
        showToast(error instanceof Error ? error.message : 'Failed to load package data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackageData();
  }, [packageId, showToast]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Handle numeric fields properly
    if (name === 'price' || name === 'deliveryFeePerKm') {
      const numValue = value === '' ? 0 : parseFloat(value);
      console.log(`Setting ${name} to:`, numValue);

      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle adding a new inclusion
  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        inclusions: [...prev.inclusions, newInclusion.trim()]
      }));
      setNewInclusion('');
    }
  };

  // Handle removing an inclusion
  const handleRemoveInclusion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }));
  };

  // Handle adding a new add-on
  const handleAddAddOn = () => {
    if (newAddOn.trim()) {
      // Parse the price, ensuring it's a valid number or null
      let price = null;
      if (newAddOnPrice && newAddOnPrice.trim() !== '') {
        const parsedPrice = parseFloat(newAddOnPrice);
        price = !isNaN(parsedPrice) ? parsedPrice : null;
      }

      console.log(`Adding new add-on: "${newAddOn.trim()}" with price: ${price}`);

      // Create the new add-on object
      const newAddOnObj = {
        name: newAddOn.trim(),
        price: price
      };

      console.log('New add-on object:', newAddOnObj);

      // Update the form data with the new add-on
      setFormData(prev => {
        const updatedAddOns = [...prev.addOns, newAddOnObj];
        console.log('Updated add-ons array:', updatedAddOns);
        return {
          ...prev,
          addOns: updatedAddOns
        };
      });

      // Reset input fields
      setNewAddOn('');
      setNewAddOnPrice('');
    }
  };

  // Handle removing an add-on
  const handleRemoveAddOn = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.filter((_, i) => i !== index)
    }));
  };

  // Handle image upload
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Create unique identifiers for each uploading file
      const uploadIds = files.map(file => `${file.name}_${Date.now()}_${Math.random()}`);
      
      // Add uploading states
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        uploadIds.forEach(id => newSet.add(id));
        return newSet;
      });

      // Upload each file to the server
      const uploadPromises = files.map(async (file, index) => {
        const uploadId = uploadIds[index];
        const formData = new FormData();
        formData.append('file', file);

        // Always include the package ID for proper storage in the correct folder
        if (packageId) {
          formData.append('packageId', packageId.toString());
        }

        try {
          const response = await fetch('/api/upload/package-image', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Image upload failed:', errorData);
            
            // Provide specific error messages based on the response
            let errorMessage = `Failed to upload ${file.name}`;
            if (errorData.error) {
              if (errorData.error.includes('Unauthorized')) {
                errorMessage = 'Authentication required. Please log in again.';
              } else if (errorData.error.includes('business accounts')) {
                errorMessage = 'Only business accounts can upload package images.';
              } else if (errorData.error.includes('Service provider not found')) {
                errorMessage = 'Service provider profile not found. Please complete your business profile first.';
              } else {
                errorMessage = `Failed to upload ${file.name}: ${errorData.error}`;
              }
            }
            
            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log('Image upload successful:', data);
          return data.filePath; // Return the file path from the server
        } catch (error) {
          console.error('Image upload error:', error);
          return null;
        } finally {
          // Remove loading state for this upload
          setUploadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(uploadId);
            return newSet;
          });
        }
      });

      // Wait for all uploads to complete
      const uploadedPaths = await Promise.all(uploadPromises);

      // Filter out any failed uploads
      const validPaths = uploadedPaths.filter(path => path !== null);

      // Update form data with the new image paths
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validPaths]
      }));

      // Successfully uploaded images (no toast notification needed)
    }
  };

  // Handle removing an image
  const handleRemoveImage = async (index: number) => {
    const imageToRemove = formData.images[index];
    
    console.log('=== REMOVE IMAGE DEBUG ===');
    console.log('Image index:', index);
    console.log('Image to remove:', imageToRemove);
    console.log('All images in form:', formData.images);
    console.log('Package ID:', packageId);
    
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log('Sending DELETE request to:', `/api/packages/${packageId}/images`);
      console.log('Request body:', JSON.stringify({ imagePath: imageToRemove }, null, 2));
      
      // Call API to delete image from database and file system
      const response = await fetch(`/api/packages/${packageId}/images`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imagePath: imageToRemove
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response data:', errorData);
        throw new Error(errorData.error || 'Failed to delete image');
      }

      // Remove from form state only after successful API call
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));

      // Image deleted successfully (no toast notification needed)
    } catch (error) {
      console.error('Error deleting image:', error);
      // Error handled in console, no toast notification needed
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Package name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than zero';
    }

    if (formData.inclusions.length === 0) {
      newErrors.inclusions = 'At least one inclusion is required';
    }

    if (!formData.conditions.trim()) {
      newErrors.conditions = 'Conditions are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Log the current form data for debugging
      console.log('Current form data before submission:', formData);
      console.log('Form data stringified:', JSON.stringify(formData, null, 2));

      // Create a fresh object with only the fields we need
      const dataToSend = {
        id: parseInt(packageId),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        cremationType: formData.cremationType,
        processingTime: formData.processingTime,
        price: Number(formData.price),
        deliveryFeePerKm: Number(formData.deliveryFeePerKm || 0),
        conditions: formData.conditions,

        // Format inclusions as an array of strings
        inclusions: formData.inclusions.map(inc => String(inc)),

        // Format add-ons properly
        addOns: formData.addOns.map(addon => ({
          name: String(addon.name),
          price: addon.price !== null && addon.price !== undefined ?
            Number(addon.price) : null
        })),

        // Ensure images are properly formatted
        images: formData.images.map(img => String(img))
      };

      console.log('Clean data to send:', JSON.stringify(dataToSend, null, 2));

      // Log the data being sent for debugging
      console.log('Submitting package update with data:', JSON.stringify(dataToSend, null, 2));
      console.log('deliveryFeePerKm value:', dataToSend.deliveryFeePerKm);

      // Log the request details
      console.log('Sending PATCH request to:', `/api/packages/${packageId}`);
      console.log('Request payload:', JSON.stringify(dataToSend, null, 2));

      // Update package via API
      try {
        const response = await fetch(`/api/packages/${packageId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure auth token is sent
          body: JSON.stringify(dataToSend),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        // Get the response data
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        // Try to parse as JSON
        let responseData;
        try {
          // Check if response is empty
          if (!responseText.trim()) {
            throw new Error('Empty response from server');
          }

          responseData = JSON.parse(responseText);
          console.log('Parsed response data:', responseData);
        } catch (parseError) {
          console.error('Error parsing response as JSON:', parseError);
          console.error('Response text was:', responseText);

          // If response is not JSON, check if it's an HTML error page
          if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
            throw new Error('Server returned an error page instead of JSON. Please check server logs.');
          }

          throw new Error(`Invalid response format from server: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        if (!response.ok) {
          console.error('API error response:', responseData);
          throw new Error(responseData.error || responseData.details || 'Failed to update package');
        }

        console.log('Package update response:', responseData);

        // Show success toast with more details if available
        if (responseData.success) {
          showToast(responseData.message || 'Package updated successfully!', 'success');

          // Redirect back to packages list after a short delay to ensure toast is visible
          setTimeout(() => {
            router.push('/cremation/packages');
          }, 1000);
        } else {
          // This shouldn't happen since we already checked !response.ok above,
          // but just in case the API returns success: false with a 200 status
          throw new Error(responseData.error || 'Failed to update package');
        }
      } catch (fetchError) {
        console.error('Error during fetch or processing:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error updating package:', error);
      setErrors({ submit: 'Failed to update package. Please try again.' });
      showToast(error instanceof Error ? error.message : 'Failed to update package', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <CremationDashboardLayout activePage="packages" userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
        </div>
      </CremationDashboardLayout>
    );
  }

  return (
    <CremationDashboardLayout activePage="packages" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-3 p-2 rounded-full hover:bg-gray-100"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Edit Package</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Update your service package details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 max-w-4xl mx-auto">
          {/* Package Images */}
          <ImageUploader
            images={formData.images}
            uploadingImages={uploadingImages}
            fileInputRef={fileInputRef}
            onUpload={handleImageUpload}
            onRemove={handleRemoveImage}
          />

          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Package Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                  placeholder="e.g., Basic Cremation"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₱)*
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="any"
                    className={`block w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                    placeholder="e.g., 3500"
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="deliveryFeePerKm" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Fee per km (₱)
                  </label>
                  <input
                    type="number"
                    id="deliveryFeePerKm"
                    name="deliveryFeePerKm"
                    value={formData.deliveryFeePerKm || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="any"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                  placeholder="Describe your package in detail"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Package Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                >
                  <option value="Private">Private</option>
                  <option value="Communal">Communal</option>
                </select>
              </div>
              <div>
                <label htmlFor="cremationType" className="block text-sm font-medium text-gray-700 mb-1">
                  Cremation Type
                </label>
                <select
                  id="cremationType"
                  name="cremationType"
                  value={formData.cremationType}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="Deluxe">Deluxe</option>
                </select>
              </div>
              <div>
                <label htmlFor="processingTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Processing Time
                </label>
                <select
                  id="processingTime"
                  name="processingTime"
                  value={formData.processingTime}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                >
                  <option value="Same day">Same day</option>
                  <option value="1-2 days">1-2 days</option>
                  <option value="2-3 days">2-3 days</option>
                  <option value="3-5 days">3-5 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inclusions */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">Inclusions*</h2>
              {errors.inclusions && (
                <p className="text-sm text-red-600 flex items-center mt-1 sm:mt-0">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  {errors.inclusions}
                </p>
              )}
            </div>
            <div className="flex mb-2">
              <input
                type="text"
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="e.g., Standard clay urn"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInclusion())}
              />
              <button
                type="button"
                onClick={handleAddInclusion}
                className="px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 mt-3">
              {formData.inclusions.map((inclusion, index) => (
                <div key={index} className="flex items-center bg-gray-50 px-3 py-2 rounded-md">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="flex-grow text-sm break-words">{inclusion}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInclusion(index)}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              {formData.inclusions.length === 0 && (
                <p className="text-sm text-gray-500 italic">No inclusions added yet</p>
              )}
            </div>
          </div>

          {/* Add-ons */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Add-ons (Optional)</h2>
            <div className="flex mb-2 gap-2">
              <div className="flex-grow">
                <input
                  type="text"
                  value={newAddOn}
                  onChange={(e) => setNewAddOn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                  placeholder="e.g., Personalized nameplate"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAddOn())}
                />
              </div>
              <div className="w-32">
                <div className="flex items-center border border-gray-300 rounded-md shadow-sm px-3 py-2">
                  <span className="text-gray-500 mr-1">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAddOnPrice}
                    onChange={(e) => setNewAddOnPrice(e.target.value)}
                    placeholder="Price"
                    className="w-full focus:outline-none sm:text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddAddOn}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 mt-3">
              {formData.addOns.map((addOn, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm break-words">{addOn.name}</span>
                  <div className="flex items-center">
                    {addOn.price !== null && (
                      <span className="text-[var(--primary-green)] font-medium mr-3">
                        +₱{addOn.price.toLocaleString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveAddOn(index)}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              {formData.addOns.length === 0 && (
                <p className="text-sm text-gray-500 italic">No add-ons added yet</p>
              )}
            </div>
          </div>

          {/* Conditions */}
          <div className="mb-8">
            <label htmlFor="conditions" className="block text-sm font-medium text-gray-700 mb-1">
              Conditions and Restrictions*
            </label>
            <textarea
              id="conditions"
              name="conditions"
              value={formData.conditions}
              onChange={handleInputChange}
              rows={3}
              className={`block w-full px-3 py-2 border ${errors.conditions ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
              placeholder="e.g., For pets up to 50 lbs. Additional fees may apply for larger pets."
            />
            {errors.conditions && (
              <p className="mt-1 text-sm text-red-600">{errors.conditions}</p>
            )}
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(EditPackagePage);
