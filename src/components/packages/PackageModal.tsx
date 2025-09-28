'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import useDebounce from '@/hooks/useDebounce';
import { XMarkIcon, ExclamationTriangleIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ImageUploader } from '@/components/packages/ImageUploader';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface AddOn {
  name: string;
  price: number;
}

interface PackageFormData {
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  pricingMode: 'fixed' | 'by_size';
  overageFeePerKg: number;
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
  sizePricing: Array<{ sizeCategory: string; weightRangeMin: number; weightRangeMax: number | null; price: number }>;
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
    pricingMode: 'fixed',
    overageFeePerKg: 0,
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
    ,
    sizePricing: [
      { sizeCategory: 'Small (0–10 kg)', weightRangeMin: 0, weightRangeMax: 10, price: 0 },
      { sizeCategory: 'Medium (11–25 kg)', weightRangeMin: 11, weightRangeMax: 25, price: 0 },
      { sizeCategory: 'Large (26–40 kg)', weightRangeMin: 26, weightRangeMax: 40, price: 0 },
      { sizeCategory: 'Extra Large (41+ kg)', weightRangeMin: 41, weightRangeMax: null, price: 0 }
    ]
  });

  // UI state
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [_formProgress, setFormProgress] = useState(0);
  const [_forceRender, setForceRender] = useState(0);

  // Form field states
  const [newInclusion, setNewInclusion] = useState('');
  const [newAddOn, setNewAddOn] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState<string>('');
  // Add-on suggestions
  const [addOnSuggestions, setAddOnSuggestions] = useState<Array<{ name: string; price: number }>>([]);
  const [isLoadingAddOnSuggestions, setIsLoadingAddOnSuggestions] = useState(false);
  const [isAddOnInputFocused, setIsAddOnInputFocused] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  
  // Animation states for smooth removal (simplified for now)
  // const [removingInclusions, setRemovingInclusions] = useState<Set<number>>(new Set());
  // const [removingAddOns, setRemovingAddOns] = useState<Set<number>>(new Set());

  // Enhanced features states
  const [_newCustomCategory, setNewCustomCategory] = useState('');
  const [_newCustomCremationType, setNewCustomCremationType] = useState('');
  const [_newCustomProcessingTime, setNewCustomProcessingTime] = useState('');

  // Load package data for edit mode
  // This useEffect will be moved after loadPackageData is defined

  // Apply initial data if provided
  useEffect(() => {
    if (initialData && isOpen) {
      console.log('🔥 Applying initialData:', initialData);
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData, isOpen]);

  // Monitor formData changes for debugging
  useEffect(() => {
    console.log('🔥 FormData changed - inclusions:', formData.inclusions);
    console.log('🔥 FormData changed - addOns:', formData.addOns);
  }, [formData.inclusions, formData.addOns]);

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
      pricingMode: 'fixed',
      overageFeePerKg: 0,
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
      supportedPetTypes: ['Dogs', 'Cats', 'Birds', 'Rabbits'],
      sizePricing: [
        { sizeCategory: 'Small (0–10 kg)', weightRangeMin: 0, weightRangeMax: 10, price: 0 },
        { sizeCategory: 'Medium (11–25 kg)', weightRangeMin: 11, weightRangeMax: 25, price: 0 },
        { sizeCategory: 'Large (26–40 kg)', weightRangeMin: 26, weightRangeMax: 40, price: 0 },
        { sizeCategory: 'Extra Large (41+ kg)', weightRangeMin: 41, weightRangeMax: null, price: 0 }
      ]
    });
    setErrors({});
    setNewInclusion('');
    setNewAddOn('');
    setNewAddOnPrice('');
    setNewCustomCategory('');
    setNewCustomCremationType('');
    setNewCustomProcessingTime('');
    // setRemovingInclusions(new Set());
    // setRemovingAddOns(new Set());
  };

  const loadPackageData = useCallback(async () => {
    if (!packageId) return;
    
    console.log('🔥 loadPackageData called for packageId:', packageId);
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
      
      // Debug logging to understand image paths
      console.log('Package images from API:', pkg.images);

      // Process images to ensure they work correctly in edit mode
      // The API already processes images with getImagePath(), but we need to ensure
      // they're in the correct format for the ImageUploader component
      const processedImages = (pkg.images || []).map((imagePath: string) => {
        console.log('Processing image path:', imagePath);

        // If the image is already an API path, use it as-is
        if (imagePath.startsWith('/api/image/')) {
          console.log('Image is already API path:', imagePath);
          return imagePath;
        }
        // If it's an uploads path, convert to API path
        if (imagePath.startsWith('/uploads/')) {
          const uploadPath = imagePath.substring('/uploads/'.length);
          const apiPath = `/api/image/${uploadPath}`;
          console.log('Converting uploads path to API path:', imagePath, '->', apiPath);
          return apiPath;
        }
        // For any other format, return as-is and let the component handle it
        console.log('Using image path as-is:', imagePath);
        return imagePath;
      });

      console.log('Processed images for form:', processedImages);

      console.log('🔥 Setting form data with inclusions:', pkg.inclusions);
      console.log('🔥 Setting form data with addOns:', pkg.addOns);
      
      setFormData({
        name: pkg.name || '',
        description: pkg.description || '',
        category: pkg.category || 'Private',
        cremationType: pkg.cremationType || 'Standard',
        processingTime: pkg.processingTime || '1-2 days',
        price: pkg.price || 0,
        pricingMode: pkg.pricingMode || (pkg.sizePricing && pkg.sizePricing.length > 0 ? 'by_size' : 'fixed'),
        overageFeePerKg: pkg.overageFeePerKg || 0,
        deliveryFeePerKm: pkg.deliveryFeePerKm || 0,
        inclusions: pkg.inclusions || [],
        addOns: pkg.addOns || [],
        conditions: pkg.conditions || '',
        images: processedImages,
        packageId: pkg.id,
        pricePerKg: pkg.pricePerKg || 0,
        usesCustomOptions: pkg.usesCustomOptions || false,
        customCategories: pkg.customCategories || [],
        customCremationTypes: pkg.customCremationTypes || [],
        customProcessingTimes: pkg.customProcessingTimes || [],
        supportedPetTypes: pkg.supportedPetTypes || ['Dogs', 'Cats', 'Birds', 'Rabbits'],
        sizePricing: (pkg.sizePricing && pkg.sizePricing.length > 0)
          ? pkg.sizePricing
          : [
              { sizeCategory: 'Small (0–10 kg)', weightRangeMin: 0, weightRangeMax: 10, price: 0 },
              { sizeCategory: 'Medium (11–25 kg)', weightRangeMin: 11, weightRangeMax: 25, price: 0 },
              { sizeCategory: 'Large (26–40 kg)', weightRangeMin: 26, weightRangeMax: 40, price: 0 },
              { sizeCategory: 'Extra Large (41+ kg)', weightRangeMin: 41, weightRangeMax: null, price: 0 }
            ]
      });
      
      // Reset animation states when loading edit data
      // setRemovingInclusions(new Set());
      // setRemovingAddOns(new Set());
    } catch (error) {
      console.error('Failed to load package:', error);
      showToast('Failed to load package data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [packageId, showToast]);

  // Track form initialization to prevent unstable dependency loops
  const formInitialized = useRef(false);
  const dataLoaded = useRef<number | null>(null);

  // Add useEffect after loadPackageData is defined
  useEffect(() => {
    console.log('🔥 Main useEffect triggered - mode:', mode, 'packageId:', packageId, 'isOpen:', isOpen);
    console.log('🔥 dataLoaded.current:', dataLoaded.current);
    
    if (mode === 'edit' && packageId && isOpen && dataLoaded.current !== packageId) {
      console.log('🔥 Calling loadPackageData');
      loadPackageData();
      dataLoaded.current = packageId;
      formInitialized.current = true;
    } else if (mode === 'create' && isOpen && !formInitialized.current) {
      // Only reset form if it hasn't been initialized yet
      console.log('🔥 Resetting form for create mode');
      resetForm();
      formInitialized.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, packageId, isOpen]);

  // Reset form when modal closes (for next time it opens)
  useEffect(() => {
    if (!isOpen) {
      // Add a small delay to ensure smooth closing animation
      const timeoutId = setTimeout(() => {
        if (mode === 'create') {
          resetForm();
        }
        formInitialized.current = false; // Reset initialization flag for both modes
        dataLoaded.current = null; // Reset data loaded flag
        // Clear any temporary states
        setNewInclusion('');
        setNewAddOn('');
        setNewAddOnPrice('');
        setErrors({});
        // setRemovingInclusions(new Set());
        // setRemovingAddOns(new Set());
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    return undefined; // Ensure all code paths return a value
  }, [isOpen, mode]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => { const err = { ...prev }; delete err[name]; return err; });
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'deliveryFeePerKm' || name === 'pricePerKg' || name === 'overageFeePerKg'
        ? parseFloat(value) || 0 
        : value
    }));
  }, [errors]);

  // Fetch add-on suggestions (debounced)
  const debouncedAddOnQuery = useDebounce(newAddOn, 250);
  useEffect(() => {
    let cancelled = false;
    const fetchSuggestions = async () => {
      const queryText = debouncedAddOnQuery?.trim() || '';
      if (!isAddOnInputFocused && queryText.length === 0) {
        if (!cancelled) setAddOnSuggestions([]);
        return;
      }
      try {
        setIsLoadingAddOnSuggestions(true);
        let url = '/api/packages/suggestions';
        if (queryText.length > 0) {
          const params = new URLSearchParams({ q: queryText, limit: '8' });
          url += `?${params.toString()}`;
        } else {
          const params = new URLSearchParams({ limit: '8' });
          url += `?${params.toString()}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load suggestions');
        const data = await res.json();
        if (!cancelled) setAddOnSuggestions(Array.isArray(data.addOns) ? data.addOns : []);
      } catch {
        if (!cancelled) setAddOnSuggestions([]);
      } finally {
        if (!cancelled) setIsLoadingAddOnSuggestions(false);
      }
    };
    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedAddOnQuery, isAddOnInputFocused]);

  // Handler functions
  const handleAddInclusion = useCallback(() => {
    if (!newInclusion.trim()) {
      showToast('Please enter an inclusion before adding', 'error');
      return;
    }
    
    // Check for duplicate inclusions
    if (formData.inclusions.some(inclusion => inclusion.toLowerCase() === newInclusion.trim().toLowerCase())) {
      showToast('This inclusion already exists', 'error');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      inclusions: [...prev.inclusions, newInclusion.trim()]
    }));
    setNewInclusion('');
    // Clear inclusion validation error if it exists
    if (errors.inclusions) {
      setErrors(prev => ({
        ...prev,
        inclusions: undefined
      }));
    }
    showToast('Inclusion added successfully', 'success');
  }, [newInclusion, formData.inclusions, showToast, errors.inclusions]);

  const handleRemoveInclusion = useCallback((index: number) => {
    console.log('🔥 Removing inclusion at index:', index);
    setFormData(prev => {
      console.log('🔥 Current inclusions before removal:', prev.inclusions);
      const newInclusions = prev.inclusions.filter((_, i) => i !== index);
      console.log('🔥 New inclusions after removal:', newInclusions);
      return {
        ...prev,
        inclusions: newInclusions
      };
    });
    setForceRender(prev => prev + 1); // Force re-render
    showToast('Inclusion removed', 'success');
  }, [showToast]);

  const handleAddAddOn = useCallback(() => {
    if (!newAddOn.trim()) {
      showToast('Please enter an add-on name before adding', 'error');
      return;
    }
    if (!newAddOnPrice || newAddOnPrice.trim() === '') {
      showToast('Price is required for all add-ons', 'error');
      return;
    }
    const price = parseFloat(newAddOnPrice);
    if (isNaN(price) || price <= 0) {
      showToast('Please enter a valid price greater than 0', 'error');
      return;
    }
    
    // Check for duplicate add-on names
    if (formData.addOns.some(addon => addon.name.toLowerCase() === newAddOn.trim().toLowerCase())) {
      showToast('An add-on with this name already exists', 'error');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      addOns: [...prev.addOns, { name: newAddOn.trim(), price }]
    }));
    setNewAddOn('');
    setNewAddOnPrice('');
    showToast('Add-on added successfully', 'success');
  }, [newAddOn, newAddOnPrice, formData.addOns, showToast]);

  const handleRemoveAddOn = useCallback((index: number) => {
    console.log('🔥 Removing add-on at index:', index);
    setFormData(prev => {
      console.log('🔥 Current add-ons before removal:', prev.addOns);
      const newAddOns = prev.addOns.filter((_, i) => i !== index);
      console.log('🔥 New add-ons after removal:', newAddOns);
      return {
        ...prev,
        addOns: newAddOns
      };
    });
    setForceRender(prev => prev + 1); // Force re-render
    showToast('Add-on removed', 'success');
  }, [showToast]);

  const _handleTogglePetType = useCallback((petType: string) => {
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

      // Add image to form data immediately for real-time feedback
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

      // Reset file input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [errors.images, formData.images.length, showToast]);

  const handleRemoveImage = useCallback((index: number) => {
    console.log('Removing image at index:', index);

    setFormData(prev => {
      console.log('Current images before removal:', prev.images);
      const newImages = prev.images.filter((_, i) => i !== index);
      console.log('New images after removal:', newImages);
      return {
        ...prev,
        images: newImages
      };
    });

    showToast('Image removed successfully', 'success');
  }, [showToast]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string | undefined> = {};
    const fieldOrder = ['name', 'description', 'price', 'inclusions', 'conditions', 'supportedPetTypes'];

    // Core validation rules (same for both create and edit modes)
    if (!formData.name.trim()) newErrors.name = 'Package name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.pricingMode === 'fixed') {
      if (formData.price <= 0) newErrors.price = 'Price must be greater than zero';
    } else {
      const anyValid = formData.sizePricing.some((sp) => sp.price > 0);
      if (!anyValid) newErrors.price = 'Provide at least one size price';
    }
    if (formData.inclusions.length === 0) newErrors.inclusions = 'At least one inclusion is required';
    if (!formData.conditions.trim()) newErrors.conditions = 'Conditions are required';
    if (formData.supportedPetTypes.length === 0) newErrors.supportedPetTypes = 'Please select at least one pet type';

    // Optional field validation
    if (formData.pricePerKg < 0) newErrors.pricePerKg = 'Price per kg cannot be negative';
    if (formData.deliveryFeePerKm < 0) newErrors.deliveryFeePerKm = 'Delivery fee cannot be negative';

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
      const actionText = mode === 'create' ? 'create' : 'update';
      if (errorMessages.length === 1) {
        showToast(errorMessages[0], 'error');
      } else {
        showToast(`Please fix ${errorMessages.length} validation errors to ${actionText} the package`, 'error');
      }
    }

    return Object.keys(newErrors).length === 0;
  }, [formData, mode, showToast, scrollToErrorField]);

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

      // Show success state
      setIsSuccess(true);
      
      // Show success toast
      const successMessage = mode === 'create' 
        ? 'Package created successfully!' 
        : 'Package updated successfully!';
      showToast(successMessage, 'success');

      // Wait for success animation before closing
      setTimeout(() => {
        onClose();
        onSuccess();
        // Reset success state after closing
        setTimeout(() => {
          setIsSuccess(false);
        }, 300);
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${mode} package`;
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, mode, packageId, validateForm, showToast, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header section */}
        <div className="bg-[var(--primary-green)] text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-medium text-white">
              {mode === 'create' ? 'Create New Package' : 'Edit Package'}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 transition-colors duration-200 flex-shrink-0 ml-2"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden max-h-[calc(90vh-120px)] overflow-y-auto">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
              </div>
            ) : isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-12 px-6"
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <CheckIcon className="h-10 w-10 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {mode === 'create' ? 'Package Created Successfully!' : 'Package Updated Successfully!'}
                </h3>
                <p className="text-gray-600 text-center mb-6">
                  {mode === 'create'
                    ? 'Your new package has been created and is now available for booking.'
                    : 'Your package changes have been saved and are now live.'
                  }
                </p>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-6">
                  <motion.div
                    className="bg-green-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2 }}
                  />
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onSuccess();
                    setIsSuccess(false);
                  }}
                  className="px-6 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors duration-200 font-medium"
                >
                  Continue
                </button>
              </motion.div>
            ) : (
            <form onSubmit={handleSubmit} className="p-6 max-w-4xl mx-auto">
                {/* Package Images */}
                <ImageUploader
                  key={`images-${formData.images.length}-${formData.images.join(',')}`}
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
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
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

                    {/* Fixed Price Field - Only show when pricing mode is 'fixed' */}
                    {formData.pricingMode === 'fixed' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
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
                        {/* Removed Price Per Kg input as pricing is now tier-based with overage fee */}
                      </div>
                    )}

                    {/* Pricing Options */}
                    <div className="mt-6 border rounded-lg p-5">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Pricing Options</h3>
                      <div className="flex flex-col gap-3 mb-5">
                        <label className="inline-flex items-start gap-2">
                          <input
                            type="radio"
                            name="pricingMode"
                            value="fixed"
                            checked={formData.pricingMode === 'fixed'}
                            onChange={() => setFormData((prev) => ({ ...prev, pricingMode: 'fixed' }))}
                            className="text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <span className="text-[15px] leading-6 text-gray-800">Fixed Price – <span className="font-medium">One price for all pets</span> regardless of size.</span>
                        </label>
                        <label className="inline-flex items-start gap-2">
                          <input
                            type="radio"
                            name="pricingMode"
                            value="by_size"
                            checked={formData.pricingMode === 'by_size'}
                            onChange={() => setFormData((prev) => ({ ...prev, pricingMode: 'by_size' }))}
                            className="text-[var(--primary-green)] focus:ring-[var(--primary-green)]"
                          />
                          <span className="text-[15px] leading-6 text-gray-800">Pricing by Pet Size – <span className="font-medium">customize by weight category and price</span>.</span>
                        </label>
                      </div>

                      {formData.pricingMode === 'by_size' && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-700">Size Tier Prices</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {formData.sizePricing.map((sp, idx) => (
                              <div key={idx} className="border rounded-md p-4">
                                <div className="text-sm font-medium text-gray-800 mb-2">{sp.sizeCategory}</div>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={sp.price === 0 ? '' : sp.price}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setFormData((prev) => {
                                      const next = [...prev.sizePricing];
                                      next[idx] = { ...next[idx], price: val };
                                      return { ...prev, sizePricing: next };
                                    });
                                  }}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] text-sm"
                                  placeholder="₱ Price (per tier)"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="pt-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Overage Fee</h4>
                            <p className="text-xs text-gray-500 mb-2">Applied per kg if a pet exceeds the selected weight category.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="overageFeePerKg" className="block text-sm font-medium text-gray-700 mb-1">Additional fee if pet exceeds selected weight category (per kg)</label>
                                <div className="flex items-center border border-gray-300 rounded-md shadow-sm px-3 py-2 focus-within:ring-1 focus-within:ring-[var(--primary-green)] focus-within:border-[var(--primary-green)]">
                                  <span className="text-gray-500 mr-1">₱</span>
                                  <input
                                    id="overageFeePerKg"
                                    name="overageFeePerKg"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={formData.overageFeePerKg || ''}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 50"
                                    className="w-full focus:outline-none sm:text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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
                      {['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Guinea Pigs', 'Fish', 'Reptiles', 'Other'].map((petType) => (
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
                    <h2 className="text-lg font-medium text-gray-800">Inclusions</h2>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInclusion();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddInclusion}
                      disabled={!newInclusion.trim()}
                      className="px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add inclusion"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-2 mt-3">
                    {formData.inclusions.map((inclusion, index) => (
                      <div key={`inclusion-${inclusion.replace(/\s+/g, '-').toLowerCase()}-${index}`} className="flex items-center bg-gray-50 px-3 py-2 rounded-md">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="flex-grow text-sm break-words">{inclusion}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInclusion(index)}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2 p-1 rounded transition-colors hover:bg-red-50"
                          title="Remove inclusion"
                          aria-label={`Remove inclusion: ${inclusion}`}
                        >
                          <XMarkIcon className="h-4 w-4" />
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
                      <div className="relative">
                        <input
                          type="text"
                          value={newAddOn}
                          onChange={(e) => setNewAddOn(e.target.value)}
                          onFocus={() => {
                            setIsAddOnInputFocused(true);
                          }}
                          onBlur={() => setTimeout(() => setIsAddOnInputFocused(false), 150)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                          placeholder="e.g., Personalized nameplate"
                          autoComplete="off"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAddOn();
                            }
                          }}
                        />
                        {isAddOnInputFocused && (addOnSuggestions.length > 0 || isLoadingAddOnSuggestions) && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {isLoadingAddOnSuggestions ? (
                              <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                            ) : (
                              addOnSuggestions.map((s, i) => (
                                <button
                                  type="button"
                                  key={`${s.name}-${i}`}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setNewAddOn(s.name);
                                    setNewAddOnPrice(s.price ? String(s.price) : '');
                                    setAddOnSuggestions([]);
                                  }}
                                >
                                  <span className="truncate pr-2">{s.name}</span>
                                  <span className="text-gray-500">₱{Number(s.price || 0).toLocaleString()}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-32">
                      <div className="flex items-center border border-gray-300 rounded-md shadow-sm px-3 py-2 focus-within:ring-1 focus-within:ring-[var(--primary-green)] focus-within:border-[var(--primary-green)]">
                        <span className="text-gray-500 mr-1">₱</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={newAddOnPrice}
                          onChange={(e) => setNewAddOnPrice(e.target.value)}
                          placeholder="Price*"
                          className="w-full focus:outline-none sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAddOn();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAddOn}
                      disabled={!newAddOn.trim() || !newAddOnPrice.trim()}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add add-on"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">* Price is required for all add-ons</p>
                  <div className="space-y-2 mt-3">
                    {formData.addOns.map((addOn, index) => (
                      <div key={`addon-${addOn.name.replace(/\s+/g, '-').toLowerCase()}-${addOn.price}-${index}`} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                        <span className="text-sm break-words">{addOn.name}</span>
                        <div className="flex items-center">
                          <span className="text-[var(--primary-green)] font-medium mr-3">
                            +₱{addOn.price.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAddOn(index)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1 rounded transition-colors hover:bg-red-50"
                            title="Remove add-on"
                            aria-label={`Remove add-on: ${addOn.name}`}
                          >
                            <XMarkIcon className="h-4 w-4" />
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
                    Conditions and Restrictions
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
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Package' : 'Save Changes')}
                  </button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PackageModal;

