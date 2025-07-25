'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ImageUploader } from '@/components/packages/ImageUploader';
import { useToast } from '@/context/ToastContext';

// Types
interface AddOn {
  name: string;
  price: number | null;
}

interface PackageFormData {
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
  packageId?: number;
  // Enhanced features
  pricePerKg: number;
  usesCustomOptions: boolean;
  customCategories: string[];
  customCremationTypes: string[];
  customProcessingTimes: string[];
  supportedPetTypes: string[];
}

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  packageId?: number;
  initialData?: Partial<PackageFormData>;
}

const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  packageId,
  initialData
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<PackageFormData>({
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
    images: [],
    packageId: packageId,
    // Enhanced features
    pricePerKg: 0,
    usesCustomOptions: false,
    customCategories: [],
    customCremationTypes: [],
    customProcessingTimes: [],
    supportedPetTypes: ['Dogs', 'Cats', 'Birds', 'Rabbits']
  });

  // UI state
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formProgress, setFormProgress] = useState(0);

  // Form field states
  const [newInclusion, setNewInclusion] = useState('');
  const [newAddOn, setNewAddOn] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState<string>('');
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());

  // Enhanced features states
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newCustomCremationType, setNewCustomCremationType] = useState('');
  const [newCustomProcessingTime, setNewCustomProcessingTime] = useState('');

  // Load package data for edit mode
  useEffect(() => {
    if (mode === 'edit' && packageId && isOpen) {
      loadPackageData();
    } else if (mode === 'create' && isOpen) {
      resetForm();
    }
  }, [mode, packageId, isOpen]);

  // Apply initial data if provided
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData, isOpen]);

  // Calculate form progress
  useEffect(() => {
    const requiredFields = [
      formData.name.trim(),
      formData.description.trim(),
      formData.price > 0,
      formData.inclusions.length > 0,
      formData.conditions.trim(),
      formData.supportedPetTypes.length > 0
    ];

    const completedFields = requiredFields.filter(Boolean).length;
    const progress = (completedFields / requiredFields.length) * 100;
    setFormProgress(progress);
  }, [formData]);

  // Memory cleanup for image previews - revoke blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up any blob URLs when component unmounts or images change
      formData.images.forEach(image => {
        if (image.startsWith('blob:')) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [formData.images]);

  // Smooth scroll to error field utility
  const scrollToErrorField = useCallback((fieldName: string) => {
    const element = document.getElementById(fieldName);
    if (!element) return;

    // Get the modal content container
    const modalContent = element.closest('.overflow-y-auto');
    if (!modalContent) return;

    const elementRect = element.getBoundingClientRect();
    const modalRect = modalContent.getBoundingClientRect();
    const scrollTop = modalContent.scrollTop;

    // Calculate position relative to modal content
    const targetPosition = scrollTop + elementRect.top - modalRect.top - 100; // 100px offset from top

    // Smooth scroll animation
    const startPosition = modalContent.scrollTop;
    const distance = targetPosition - startPosition;
    const duration = Math.min(Math.abs(distance) / 2, 800);
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      modalContent.scrollTop = startPosition + distance * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        // Focus the element after scroll completes
        setTimeout(() => {
          element.focus();
          // Add visual highlight
          element.style.transition = 'box-shadow 0.3s ease';
          element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';
          setTimeout(() => {
            element.style.boxShadow = '';
            element.style.transition = '';
          }, 2000);
        }, 100);
      }
    };

    requestAnimationFrame(animateScroll);
  }, []);

  const resetForm = () => {
    setFormData({
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
      images: [],
      packageId: undefined,
      pricePerKg: 0,
      usesCustomOptions: false,
      customCategories: [],
      customCremationTypes: [],
      customProcessingTimes: [],
      supportedPetTypes: ['Dogs', 'Cats', 'Birds', 'Rabbits']
    });
    setErrors({});
    setNewInclusion('');
    setNewAddOn('');
    setNewAddOnPrice('');
    setNewCustomCategory('');
    setNewCustomCremationType('');
    setNewCustomProcessingTime('');
  };

  const loadPackageData = async () => {
    if (!packageId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load package data');
      }
      
      const data = await response.json();
      const pkg = data.package;
      
      setFormData({
        name: pkg.name || '',
        description: pkg.description || '',
        category: pkg.category || 'Private',
        cremationType: pkg.cremationType || 'Standard',
        processingTime: pkg.processingTime || '1-2 days',
        price: pkg.price || 0,
        deliveryFeePerKm: pkg.deliveryFeePerKm || 0,
        inclusions: pkg.inclusions || [],
        addOns: pkg.addOns || [],
        conditions: pkg.conditions || '',
        images: pkg.images || [],
        packageId: pkg.id,
        pricePerKg: pkg.pricePerKg || 0,
        usesCustomOptions: pkg.usesCustomOptions || false,
        customCategories: pkg.customCategories || [],
        customCremationTypes: pkg.customCremationTypes || [],
        customProcessingTimes: pkg.customProcessingTimes || [],
        supportedPetTypes: pkg.supportedPetTypes || ['Dogs', 'Cats', 'Birds', 'Rabbits']
      });
    } catch (error) {
      console.error('Failed to load package:', error);
      showToast('Failed to load package data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => { const err = { ...prev }; delete err[name]; return err; });
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'deliveryFeePerKm' ? parseFloat(value) || 0 : value
    }));
  }, [errors]);

  // Handler functions
  const handleAddInclusion = useCallback(() => {
    if (!newInclusion.trim()) {
      showToast('Please enter an inclusion before adding', 'error');
      return;
    }
    setFormData(prev => ({
      ...prev,
      inclusions: [...prev.inclusions, newInclusion.trim()]
    }));
    setNewInclusion('');
    showToast('Inclusion added successfully', 'success');
  }, [newInclusion, showToast]);

  const handleRemoveInclusion = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }));
    showToast('Inclusion removed', 'success');
  }, [showToast]);

  const handleAddAddOn = useCallback(() => {
    if (!newAddOn.trim()) {
      showToast('Please enter an add-on name before adding', 'error');
      return;
    }
    const price = newAddOnPrice ? parseFloat(newAddOnPrice) : null;
    if (newAddOnPrice && (isNaN(price!) || price! < 0)) {
      showToast('Please enter a valid price for the add-on', 'error');
      return;
    }
    setFormData(prev => ({
      ...prev,
      addOns: [...prev.addOns, { name: newAddOn.trim(), price }]
    }));
    setNewAddOn('');
    setNewAddOnPrice('');
    showToast('Add-on added successfully', 'success');
  }, [newAddOn, newAddOnPrice, showToast]);

  const handleRemoveAddOn = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.filter((_, i) => i !== index)
    }));
    showToast('Add-on removed', 'success');
  }, [showToast]);

  const handleTogglePetType = useCallback((petType: string) => {
    setFormData(prev => {
      if (prev.supportedPetTypes.includes(petType)) {
        return {
          ...prev,
          supportedPetTypes: prev.supportedPetTypes.filter(type => type !== petType)
        };
      } else {
        return {
          ...prev,
          supportedPetTypes: [...prev.supportedPetTypes, petType]
        };
      }
    });
  }, []);

  // Image upload handlers
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please select a valid image file';
      setErrors(prev => ({ ...prev, images: errorMsg }));
      showToast(errorMsg, 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      const errorMsg = 'Image size must be less than 5MB';
      setErrors(prev => ({ ...prev, images: errorMsg }));
      showToast(errorMsg, 'error');
      return;
    }

    if (formData.images.length >= 10) {
      const errorMsg = 'Maximum 10 images allowed per package';
      setErrors(prev => ({ ...prev, images: errorMsg }));
      showToast(errorMsg, 'error');
      return;
    }

    const imageId = Date.now().toString();
    setUploadingImages(prev => new Set([...prev, imageId]));

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload/package-image', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, result.filePath]
      }));

      // Clear any image errors
      if (errors.images) {
        setErrors(prev => ({
          ...prev,
          images: undefined
        }));
      }

      showToast('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Image upload failed:', error);
      const errorMsg = 'Failed to upload image. Please try again.';
      setErrors(prev => ({ ...prev, images: errorMsg }));
      showToast(errorMsg, 'error');
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  }, [errors.images, formData.images.length, showToast]);

  const handleRemoveImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    showToast('Image removed successfully', 'success');
  }, [showToast]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string | undefined> = {};
    const fieldOrder = ['name', 'description', 'price', 'inclusions', 'conditions', 'supportedPetTypes'];

    if (!formData.name.trim()) newErrors.name = 'Package name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than zero';
    if (formData.inclusions.length === 0) newErrors.inclusions = 'At least one inclusion is required';
    if (!formData.conditions.trim()) newErrors.conditions = 'Conditions are required';
    if (formData.supportedPetTypes.length === 0) newErrors.supportedPetTypes = 'Please select at least one pet type';

    setErrors(newErrors);

    // Handle validation errors with scroll-to-error
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).filter((msg): msg is string => msg !== undefined);
      const firstErrorField = fieldOrder.find(field => newErrors[field]);

      // Scroll to first error field
      if (firstErrorField) {
        setTimeout(() => scrollToErrorField(firstErrorField), 100);
      }

      // Show appropriate toast message
      if (errorMessages.length === 1) {
        showToast(errorMessages[0], 'error');
      } else {
        showToast(`Please fix ${errorMessages.length} validation errors to continue`, 'error');
      }
    }

    return Object.keys(newErrors).length === 0;
  }, [formData, showToast, scrollToErrorField]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = mode === 'create' ? '/api/packages' : `/api/packages/${packageId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Failed to ${mode} package`;
        showToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      showToast(
        mode === 'create' ? 'Package created successfully!' : 'Package updated successfully!',
        'success'
      );

      handleSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${mode} package`;
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, mode, packageId, validateForm, showToast]);

  // Success animation handler
  const handleSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onSuccess();
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header section */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center">
            <button onClick={onClose} className="mr-3 p-2 rounded-full hover:bg-gray-100" aria-label="Go back">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                {mode === 'create' ? 'Create New Package' : 'Edit Package'}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {mode === 'create' ? 'Add a new service package to your offerings' : 'Update your service package details'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden max-h-[calc(90vh-120px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
            </div>
          ) : (
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
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Package Name*</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                        placeholder="e.g., Basic Cremation"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (₱)*</label>
                        <input
                          id="price"
                          name="price"
                          type="number"
                          value={formData.price || ''}
                          onChange={handleInputChange}
                          min="0"
                          step="any"
                          className={`block w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                          placeholder="e.g., 3500"
                        />
                        {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                      </div>
                      <div>
                        <label htmlFor="pricePerKg" className="block text-sm font-medium text-gray-700 mb-1">Price Per Kg (₱)</label>
                        <input
                          id="pricePerKg"
                          name="pricePerKg"
                          type="number"
                          value={formData.pricePerKg || ''}
                          onChange={handleInputChange}
                          min="0"
                          step="any"
                          className={`block w-full px-3 py-2 border ${errors.pricePerKg ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                          placeholder="e.g., 100"
                        />
                        {errors.pricePerKg && <p className="mt-1 text-sm text-red-600">{errors.pricePerKg}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
                        placeholder="Describe your package in detail"
                      />
                      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>
                  </div>
                </div>

                {/* Package Details */}
                <div className="mb-8">
                  <h2 className="text-lg font-medium text-gray-800 mb-4">Package Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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
                      <label htmlFor="cremationType" className="block text-sm font-medium text-gray-700 mb-1">Cremation Type</label>
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
                      <label htmlFor="processingTime" className="block text-sm font-medium text-gray-700 mb-1">Processing Time</label>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label htmlFor="deliveryFeePerKm" className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee per km (₱)</label>
                      <input
                        id="deliveryFeePerKm"
                        name="deliveryFeePerKm"
                        type="number"
                        value={formData.deliveryFeePerKm || ''}
                        onChange={handleInputChange}
                        min="0"
                        step="any"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                        placeholder="e.g., 15"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supported Pet Types</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other'].map((petType) => (
                        <label key={petType} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.supportedPetTypes.includes(petType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  supportedPetTypes: [...prev.supportedPetTypes, petType]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  supportedPetTypes: prev.supportedPetTypes.filter(type => type !== petType)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-[var(--primary-green)] focus:ring-[var(--primary-green)] h-4 w-4"
                          />
                          <span className="ml-2 text-sm text-gray-700">{petType}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Inclusions */}
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-800">Inclusions*</h2>
                    {errors.inclusions && (
                      <p className="text-sm text-red-600 flex items-center mt-1 sm:mt-0">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
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
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Package' : 'Save Changes')}
                  </button>
                </div>
              </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default PackageModal;
