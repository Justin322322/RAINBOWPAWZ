'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
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
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.images;
          return newErrors;
        });
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
    const newErrors: Record<string, string> = {};
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
      const errorMessages = Object.values(newErrors);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      className="max-h-[90vh] flex flex-col"
    >
      <div className="relative flex flex-col h-full bg-white">
        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 bg-opacity-98 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-green-100 max-w-md mx-4">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 mb-6">
                <CheckCircleIcon className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {mode === 'create' ? '🎉 Package Created!' : '✅ Package Updated!'}
              </h3>
              <p className="text-gray-600 text-lg">
                {mode === 'create' ? 'Your new package has been added successfully and is now available to customers.' : 'Your package changes have been saved and are now live.'}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--primary-green)] to-green-600 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'create' ? 'Create New Package' : 'Edit Package'}
              </h2>
              <p className="text-green-100 text-sm mb-3">
                {mode === 'create' ? 'Add a new cremation package to your services' : 'Update your package details and pricing'}
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-green-100">Form Progress</span>
                  <span className="text-xs text-green-100 font-medium">{Math.round(formProgress)}%</span>
                </div>
                <div className="w-full bg-green-700 rounded-full h-1.5">
                  <div
                    className="bg-white rounded-full h-1.5 transition-all duration-500 ease-out"
                    style={{ width: `${formProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-green-100 hover:text-white transition-colors p-2 rounded-lg hover:bg-green-700/50 flex-shrink-0"
              disabled={isSubmitting}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary-green)] border-t-transparent mx-auto mb-4"></div>
                <span className="text-gray-700 text-lg font-medium">Loading package data...</span>
              </div>
            </div>
          ) : (
            <form id="package-form" onSubmit={handleSubmit} className="h-full flex flex-col">
              <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
                {/* Basic Information */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold text-sm">1</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                        <p className="text-gray-600 text-sm">Essential details about your cremation package</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                          Package Name*
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2.5 border-2 ${errors.name ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[var(--primary-green)] bg-white'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all duration-200 text-base font-medium`}
                          placeholder="e.g., Premium Pet Cremation"
                          required
                        />
                        {errors.name && (
                          <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            {errors.name}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label htmlFor="category" className="block text-sm font-bold text-gray-700 mb-2">
                          Category*
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2.5 border-2 ${errors.category ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[var(--primary-green)] bg-white'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all duration-200 text-base font-medium`}
                          required
                        >
                          <option value="">Select category</option>
                          <option value="Private">Private Cremation</option>
                          <option value="Communal">Communal Cremation</option>
                          <option value="Memorial">Memorial Service</option>
                        </select>
                        {errors.category && (
                          <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            {errors.category}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label htmlFor="price" className="block text-sm font-bold text-gray-700 mb-2">
                          Base Price (₱)*
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">₱</span>
                          <input
                            id="price"
                            name="price"
                            type="number"
                            value={formData.price || ''}
                            onChange={handleInputChange}
                            min="0"
                            step="any"
                            className={`block w-full pl-8 pr-3 py-2.5 border-2 ${errors.price ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[var(--primary-green)] bg-white'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all duration-200 text-base font-medium`}
                            placeholder="3,500"
                            required
                          />
                        </div>
                        {errors.price && (
                          <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            {errors.price}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label htmlFor="pricePerKg" className="block text-sm font-bold text-gray-700 mb-2">
                          Price Per Kg (₱)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">₱</span>
                          <input
                            id="pricePerKg"
                            name="pricePerKg"
                            type="number"
                            value={formData.pricePerKg || ''}
                            onChange={handleInputChange}
                            min="0"
                            step="any"
                            className={`block w-full pl-8 pr-3 py-2.5 border-2 ${errors.pricePerKg ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[var(--primary-green)] bg-white'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all duration-200 text-base font-medium`}
                            placeholder="100"
                          />
                        </div>
                        {errors.pricePerKg && (
                          <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            {errors.pricePerKg}
                          </div>
                        )}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
                          <p className="text-sm text-blue-700 font-medium">💡 Additional charge per kg of pet weight</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                        Description*
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2.5 border-2 ${errors.description ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[var(--primary-green)] bg-white'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all duration-200 resize-none text-base font-medium`}
                        placeholder="Describe your cremation package, what makes it special, and what families can expect..."
                        required
                      />
                      {errors.description && (
                        <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          {errors.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold text-sm">2</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Service Details</h3>
                        <p className="text-gray-600 text-sm">Specify the type and timing of your cremation service</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label htmlFor="cremationType" className="block text-sm font-semibold text-gray-700">
                          Cremation Type*
                        </label>
                        <select
                          id="cremationType"
                          name="cremationType"
                          value={formData.cremationType}
                          onChange={handleInputChange}
                          className={`block w-full px-4 py-3 border ${errors.cremationType ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-[var(--primary-green)]'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-colors bg-white text-lg`}
                          required
                        >
                          <option value="">Select type</option>
                          <option value="Standard">Standard</option>
                          <option value="Premium">Premium</option>
                          <option value="Luxury">Luxury</option>
                        </select>
                        {errors.cremationType && <p className="text-sm text-red-600 mt-1">{errors.cremationType}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="processingTime" className="block text-sm font-medium text-gray-700">
                          Processing Time*
                        </label>
                        <select
                          id="processingTime"
                          name="processingTime"
                          value={formData.processingTime}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2 border ${errors.processingTime ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-[var(--primary-green)]'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] transition-colors bg-white`}
                          required
                        >
                          <option value="">Select time</option>
                          <option value="1-2 days">1-2 days</option>
                          <option value="3-5 days">3-5 days</option>
                          <option value="1 week">1 week</option>
                          <option value="2 weeks">2 weeks</option>
                        </select>
                        {errors.processingTime && <p className="text-sm text-red-600 mt-1">{errors.processingTime}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="deliveryFeePerKm" className="block text-sm font-medium text-gray-700">
                          Delivery Fee per Km (₱)*
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                          <input
                            id="deliveryFeePerKm"
                            name="deliveryFeePerKm"
                            type="number"
                            value={formData.deliveryFeePerKm || ''}
                            onChange={handleInputChange}
                            min="0"
                            step="any"
                            className={`block w-full pl-8 pr-3 py-2 border ${errors.deliveryFeePerKm ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-[var(--primary-green)]'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] transition-colors`}
                            placeholder="25"
                            required
                          />
                        </div>
                        {errors.deliveryFeePerKm && <p className="text-sm text-red-600 mt-1">{errors.deliveryFeePerKm}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="supportedPetTypes" className="block text-sm font-medium text-gray-700">
                          Supported Pet Types*
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other'].map((petType) => (
                            <label key={petType} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
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
                                className="rounded border-gray-300 text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                              />
                              <span className="text-sm text-gray-700">{petType}</span>
                            </label>
                          ))}
                        </div>
                        {errors.supportedPetTypes && <p className="text-sm text-red-600 mt-1">{errors.supportedPetTypes}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Package Inclusions */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-green-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Package Inclusions*</h3>
                        <p className="text-gray-600 text-sm">What's included in this cremation package</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      {/* Add new inclusion */}
                      <div className="flex space-x-3">
                        <input
                          id="inclusions"
                          type="text"
                          value={newInclusion}
                          onChange={(e) => setNewInclusion(e.target.value)}
                          placeholder="e.g., Individual cremation, Wooden urn, Certificate of cremation"
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 focus:border-[var(--primary-green)] transition-all duration-200 text-lg"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddInclusion()}
                        />
                        <button
                          type="button"
                          onClick={handleAddInclusion}
                          className="px-6 py-3 bg-gradient-to-r from-[var(--primary-green)] to-green-600 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                        >
                          Add
                        </button>
                      </div>

                      {/* Inclusions list */}
                      {formData.inclusions.length > 0 && (
                        <div className="space-y-3">
                          {formData.inclusions.map((inclusion, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                              <span className="text-gray-700 font-medium">{inclusion}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveInclusion(index)}
                                className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-lg hover:bg-red-50"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {errors.inclusions && (
                        <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          {errors.inclusions}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add-Ons */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-bold text-sm">4</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Optional Add-Ons</h3>
                        <p className="text-gray-600 text-sm">Additional services customers can purchase</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="space-y-4">
                      {/* Add new add-on */}
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={newAddOn}
                          onChange={(e) => setNewAddOn(e.target.value)}
                          placeholder="e.g., Memorial photo frame"
                          className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 focus:border-[var(--primary-green)] bg-white transition-all duration-200 text-base font-medium"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-medium">₱</span>
                          <input
                            type="number"
                            value={newAddOnPrice}
                            onChange={(e) => setNewAddOnPrice(e.target.value)}
                            placeholder="Price"
                            min="0"
                            step="any"
                            className="w-28 pl-8 pr-3 py-2.5 border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 focus:border-[var(--primary-green)] bg-white transition-all duration-200 text-base font-medium"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddAddOn}
                          variant="primary"
                          size="md"
                        >
                          Add
                        </Button>
                      </div>

                      {/* Add-ons list */}
                      {formData.addOns.length > 0 && (
                        <div className="space-y-2">
                          {formData.addOns.map((addOn, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <span className="text-sm text-gray-700">
                                {addOn.name}
                                {addOn.price && <span className="text-gray-500 ml-2">(₱{addOn.price.toLocaleString()})</span>}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAddOn(index)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Package Images */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-rose-600 font-bold text-sm">5</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Package Images</h3>
                        <p className="text-gray-600 text-sm">Upload high-quality images to showcase your package</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="space-y-6">
                      {/* Upload Area */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          ref={fileInputRef}
                        />
                        <div className="space-y-4">
                          <div className="mx-auto h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                              disabled={uploadingImages.size > 0}
                            >
                              {uploadingImages.size > 0 ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                  </svg>
                                  Upload Images
                                </>
                              )}
                            </button>
                            <p className="text-sm text-gray-500 mt-2">PNG, JPG, GIF up to 5MB each • Max 10 images</p>
                          </div>
                        </div>
                      </div>

                      {errors.images && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-600">{errors.images}</p>
                        </div>
                      )}

                      {/* Image Gallery */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">
                            Uploaded Images ({formData.images.length})
                          </h4>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {formData.images.length} of 10 max
                          </span>
                        </div>

                        <div className="min-h-[200px] border border-gray-200 rounded-md p-4 bg-gray-50">
                          {formData.images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {formData.images.map((image, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200 hover:border-[var(--primary-green)] transition-colors">
                                    <img
                                      src={image.startsWith('http') ? image : `${image}?t=${Date.now()}`}
                                      alt={`Package image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Remove image"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm">No images uploaded yet</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-amber-600 font-bold text-sm">6</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Terms & Conditions*</h3>
                        <p className="text-gray-600 text-sm">Important conditions and restrictions for this package</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <textarea
                      id="conditions"
                      name="conditions"
                      rows={4}
                      value={formData.conditions}
                      onChange={handleInputChange}
                      className={`block w-full px-3 py-2.5 border-2 ${errors.conditions ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-[var(--primary-green)] bg-white'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all duration-200 resize-none text-base font-medium`}
                      placeholder="e.g., For pets up to 50 kg. Additional fees may apply for larger pets. Ashes will be ready for pickup within the specified processing time..."
                      required
                    />
                    {errors.conditions && (
                      <div className="flex items-center text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        {errors.conditions}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error display */}
                {errors.submit && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0" />
                      <p className="text-red-700 font-medium">{errors.submit}</p>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-gray-600 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium text-sm">
                    {mode === 'create' ? 'All required fields must be completed' : 'Review your changes before saving'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Progress: {Math.round(formProgress)}% complete
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  size="lg"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="package-form"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting || formProgress < 100}
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? (mode === 'create' ? 'Creating...' : 'Updating...')
                    : (mode === 'create' ? 'Create Package' : 'Update Package')
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PackageModal;
