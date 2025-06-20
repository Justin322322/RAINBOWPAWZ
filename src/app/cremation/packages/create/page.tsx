'use client';

import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast, ToastType } from '@/context/ToastContext';
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,

  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { ImageUploader } from '@/components/packages/ImageUploader';

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
}

// MultiEntryField: Handles inclusions and add-ons lists
interface MultiEntryFieldProps {
  label: string;
  items: string[];
  newItem: string;
  onNewItemChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  error?: string;
  placeholder?: string;
}
const MultiEntryField: React.FC<MultiEntryFieldProps> = ({ label, items, newItem, onNewItemChange, onAdd, onRemove, error, placeholder }) => (
  <div className="mb-8">
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-lg font-medium text-gray-800">{label}</h2>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>

    <div className="flex mb-2">
      <input
        type="text"
        value={newItem}
        onChange={e => onNewItemChange(e.target.value)}
        placeholder={placeholder}
        className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={!newItem.trim()}
        className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-r-md hover:bg-[var(--primary-green-hover)] disabled:opacity-50"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>

    <div className="space-y-2">
      {items.length > 0 ? (
        items.map((txt, idx) => (
          <div key={idx} className="flex items-center bg-gray-50 px-3 py-2 rounded-md">
            <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <span className="flex-grow text-sm break-words">{txt}</span>
            <button onClick={() => onRemove(idx)} className="text-gray-400 hover:text-red-500 ml-2">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500 italic">No {label.toLowerCase()} yet</p>
      )}
    </div>
  </div>
);



// Hook: usePackageForm
function usePackageForm(router: AppRouterInstance, showToast: {
  (message: string, type: ToastType, duration?: number): void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '', description: '', category: 'Private', cremationType: 'Standard', processingTime: '1-2 days', price: 0, deliveryFeePerKm: 0,
    inclusions: [], addOns: [], conditions: '', images: [], packageId: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newInclusion, setNewInclusion] = useState('');
  const [newAddOn, setNewAddOn] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add state for individual image loading
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => { const err = { ...prev }; delete err[name]; return err; });
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  }, [errors]);

  const handleAddInclusion = useCallback(() => {
    if (newInclusion.trim()) {
      setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion.trim()] }));
      setNewInclusion('');
    }
  }, [newInclusion]);

  const handleRemoveInclusion = useCallback((idx: number) => {
    setFormData(prev => ({ ...prev, inclusions: prev.inclusions.filter((_, i) => i !== idx) }));
  }, []);

  const handleAddAddOn = useCallback(() => {
    if (newAddOn.trim()) {
      const price = newAddOnPrice ? parseFloat(newAddOnPrice) : null;

      setFormData(prev => ({
        ...prev,
        addOns: [...prev.addOns, {
          name: newAddOn.trim(),
          price: price
        }]
      }));

      // Reset input fields
      setNewAddOn('');
      setNewAddOnPrice('');
    }
  }, [newAddOn, newAddOnPrice]);

  const handleRemoveAddOn = useCallback((idx: number) => {
    setFormData(prev => ({ ...prev, addOns: prev.addOns.filter((_, i) => i !== idx) }));
  }, []);

  const handleImageUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Create unique identifiers for each uploading file
    const uploadIds = files.map(file => `${file.name}_${Date.now()}_${Math.random()}`);
    
    // Add uploading states
    setUploadingImages(prev => {
      const newSet = new Set(prev);
      uploadIds.forEach(id => newSet.add(id));
      return newSet;
    });

    const uploadPromises = files.map(async (file, index) => {
      const uploadId = uploadIds[index];
      const payload = new FormData();
      payload.append('file', file);

      // If editing an existing package, add the package ID to ensure proper storage
      if (formData.packageId) {
        payload.append('packageId', formData.packageId.toString());
      }

      try {
        const res = await fetch('/api/upload/package-image', { 
          method: 'POST', 
          body: payload,
          credentials: 'include'
        });
        
        if (!res.ok) {
          const err = await res.json();
          console.error('Image upload failed:', err);
          
          // Provide specific error messages based on the response
          let errorMessage = `Failed to upload ${file.name}`;
          if (err.error) {
            if (err.error.includes('Unauthorized')) {
              errorMessage = 'Authentication required. Please log in again.';
            } else if (err.error.includes('business accounts')) {
              errorMessage = 'Only business accounts can upload package images.';
            } else if (err.error.includes('Service provider not found')) {
              errorMessage = 'Service provider profile not found. Please complete your business profile first.';
            } else {
              errorMessage = `Failed to upload ${file.name}: ${err.error}`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await res.json();
        console.log('Image upload successful:', data);
        return data.filePath as string;
              } catch (err) {
          console.error('Image upload error:', err);
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

    const paths = (await Promise.all(uploadPromises)).filter(p => p) as string[];
    if (paths.length) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...paths] }));
      // Images uploaded successfully (no toast notification needed)
    }
    // Failed uploads are handled in console.error above
      }, [formData.packageId]);

  const handleRemoveImage = useCallback((idx: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }, []);

  const validateForm = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Package name is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (formData.price <= 0) errs.price = 'Price must be > 0';
    if (!formData.inclusions.length) errs.inclusions = 'At least one inclusion required';
    if (!formData.conditions.trim()) errs.conditions = 'Conditions required';
    setErrors(errs);
    return !Object.keys(errs).length;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      console.log('Submitting package data:', formData);
      
      const res = await fetch('/api/packages', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error('Package creation failed:', err);
        
        // Provide specific error messages based on the response
        let errorMessage = 'Failed to create package';
        if (err.error) {
          if (err.error.includes('Unauthorized')) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (err.error.includes('business accounts')) {
            errorMessage = 'Only business accounts can create packages.';
          } else if (err.error.includes('Service provider not found')) {
            errorMessage = 'Service provider profile not found. Please complete your business profile first.';
          } else {
            errorMessage = err.error;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log('Package created successfully:', result);
      showToast('Package created successfully!', 'success' as ToastType);
      router.push('/cremation/packages');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create package';
      console.error('Package creation error:', err);
      setErrors({ submit: msg });
      showToast(msg, 'error' as ToastType);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router, showToast, validateForm]);

  return {
    formData, errors, newInclusion, setNewInclusion,
    newAddOn, setNewAddOn, newAddOnPrice, setNewAddOnPrice,
    isSubmitting, fileInputRef, uploadingImages,
    handleInputChange, handleAddInclusion, handleRemoveInclusion,
    handleAddAddOn, handleRemoveAddOn, handleImageUpload,
    handleRemoveImage, handleSubmit
  };
}

// Main Page Component
const CreatePackagePage: React.FC<{ userData?: any }> = ({ userData }) => {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    formData, errors, newInclusion, setNewInclusion,
    newAddOn, setNewAddOn, newAddOnPrice, setNewAddOnPrice,
    isSubmitting, fileInputRef, uploadingImages,
    handleInputChange, handleAddInclusion, handleRemoveInclusion,
    handleAddAddOn, handleRemoveAddOn, handleImageUpload,
    handleRemoveImage, handleSubmit
  } = usePackageForm(router, showToast);

  return (
    <CremationDashboardLayout activePage="packages" userData={userData}>
      {/* Header */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-3 p-2 rounded-full hover:bg-gray-100" aria-label="Go back">
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Create New Package</h1>
            <p className="text-sm text-gray-600 mt-1">Add a new service package to your offerings</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 max-w-4xl mx-auto">
          <ImageUploader 
            images={formData.images} 
            uploadingImages={uploadingImages}
            fileInputRef={fileInputRef} 
            onUpload={handleImageUpload} 
            onRemove={handleRemoveImage} 
          />

          {/* Basic Info */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Package Name*</label>
                <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`} placeholder="e.g., Basic Cremation" />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (₱)*</label>
                <input id="price" name="price" type="number" value={formData.price || ''} onChange={handleInputChange} min="0" step="any"
                  className={`block w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`} placeholder="e.g., 3500" />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`} placeholder="Describe your package in detail" />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Package Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select id="category" name="category" value={formData.category} onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm">
                  <option value="Private">Private</option>
                  <option value="Communal">Communal</option>
                </select>
              </div>

              <div>
                <label htmlFor="cremationType" className="block text-sm font-medium text-gray-700 mb-1">Cremation Type</label>
                <select id="cremationType" name="cremationType" value={formData.cremationType} onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm">
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="Deluxe">Deluxe</option>
                </select>
              </div>

              <div>
                <label htmlFor="processingTime" className="block text-sm font-medium text-gray-700 mb-1">Processing Time</label>
                <select id="processingTime" name="processingTime" value={formData.processingTime} onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm">
                  <option value="Same day">Same day</option>
                  <option value="1-2 days">1-2 days</option>
                  <option value="2-3 days">2-3 days</option>
                  <option value="3-5 days">3-5 days</option>
                </select>
              </div>
            </div>
          </div>

          <MultiEntryField
            label="Inclusions*"
            items={formData.inclusions}
            newItem={newInclusion}
            onNewItemChange={setNewInclusion}
            onAdd={handleAddInclusion}
            onRemove={handleRemoveInclusion}
            error={errors.inclusions}
            placeholder="e.g., Standard clay urn"
          />

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
            <label htmlFor="conditions" className="block text-sm font-medium text-gray-700 mb-1">Conditions and Restrictions*</label>
            <textarea id="conditions" name="conditions" rows={3} value={formData.conditions} onChange={handleInputChange}
              className={`block w-full px-3 py-2 border ${errors.conditions ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`} placeholder="e.g., For pets up to 50 lbs. Additional fees may apply for larger pets." />
            {errors.conditions && <p className="mt-1 text-sm text-red-600">{errors.conditions}</p>}
          </div>

          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </CremationDashboardLayout>
  );
};

export default withBusinessVerification(CreatePackagePage);
