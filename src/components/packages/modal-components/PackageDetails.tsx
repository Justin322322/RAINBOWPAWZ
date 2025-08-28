'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { TruckIcon, TagIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';

interface PackageDetailsProps {
  formData: {
    category: string;
    cremationType: string;
    processingTime: string;
    deliveryFeePerKm: number;
    supportedPetTypes: string[];
  };
  errors: Record<string, string | undefined>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPetTypeToggle: (petType: string) => void;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({
  formData,
  errors,
  onInputChange,
  onPetTypeToggle
}) => {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
          <TagIcon className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Package Configuration</h2>
          <p className="text-sm text-gray-500">Service details and pet type support</p>
        </div>
      </div>

      {/* Service Classification */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
            <SparklesIcon className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Service Classification</h3>
            <p className="text-sm text-gray-600">Define your package category and service type</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-900">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={onInputChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
            >
              <option value="Private">Private</option>
              <option value="Communal">Communal</option>
            </select>
          </div>

          {/* Cremation Type Selection */}
          <div className="space-y-2">
            <label htmlFor="cremationType" className="block text-sm font-medium text-gray-900">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              id="cremationType"
              name="cremationType"
              value={formData.cremationType}
              onChange={onInputChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
            >
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="Deluxe">Deluxe</option>
            </select>
          </div>

          {/* Processing Time Selection */}
          <div className="space-y-2">
            <label htmlFor="processingTime" className="block text-sm font-medium text-gray-900">
              Processing Time <span className="text-red-500">*</span>
            </label>
            <select
              id="processingTime"
              name="processingTime"
              value={formData.processingTime}
              onChange={onInputChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
            >
              <option value="Same day">Same day</option>
              <option value="1-2 days">1-2 days</option>
              <option value="2-3 days">2-3 days</option>
              <option value="3-5 days">3-5 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Delivery Configuration */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
            <TruckIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delivery Configuration</h3>
            <p className="text-sm text-gray-600">Set delivery fees for your service area</p>
          </div>
        </div>

        <div className="max-w-md">
          <label htmlFor="deliveryFeePerKm" className="block text-sm font-medium text-gray-900 mb-2">
            Delivery Fee per Kilometer
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium">₱</span>
            </div>
            <input
              id="deliveryFeePerKm"
              name="deliveryFeePerKm"
              type="number"
              value={formData.deliveryFeePerKm || ''}
              onChange={onInputChange}
              min="0"
              step="0.01"
              className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Leave empty if delivery is included in the package price
          </p>
        </div>
      </div>

      {/* Pet Type Support */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
            <CheckIcon className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Pet Type Support</h3>
            <p className="text-sm text-gray-600">Select which pet types this package supports</p>
          </div>
        </div>

        {errors.supportedPetTypes && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span className="text-red-500">⚠</span>
              {errors.supportedPetTypes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other'].map((petType) => (
            <Button
              key={petType}
              variant={formData.supportedPetTypes.includes(petType) ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPetTypeToggle(petType)}
              className={`justify-start ${
                formData.supportedPetTypes.includes(petType)
                  ? 'ring-2 ring-emerald-500 ring-offset-1'
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
            >
              <CheckIcon className={`h-4 w-4 mr-2 ${
                formData.supportedPetTypes.includes(petType) ? 'text-white' : 'text-gray-400'
              }`} />
              {petType}
            </Button>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">i</span>
            </div>
            <span className="text-sm font-medium text-blue-900">Selection Required</span>
          </div>
          <p className="text-xs text-blue-700">
            At least one pet type must be selected for this package
          </p>
        </div>
      </div>
    </div>
  );
};
