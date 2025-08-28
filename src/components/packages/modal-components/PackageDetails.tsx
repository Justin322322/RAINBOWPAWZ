'use client';

import React from 'react';

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
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Package Configuration</h2>
        <p className="text-gray-600">Service details and pet type support</p>
      </div>

      {/* Service Classification */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Classification</h3>
          <p className="text-gray-600">Define your package category and service type</p>
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
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Configuration</h3>
          <p className="text-gray-600">Set delivery fees for your service area</p>
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
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pet Type Support</h3>
          <p className="text-gray-600">Select which pet types this package supports</p>
        </div>

        {errors.supportedPetTypes && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {errors.supportedPetTypes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other'].map((petType) => (
            <button
              key={petType}
              type="button"
              onClick={() => onPetTypeToggle(petType)}
              className={`p-3 text-sm font-medium rounded-lg border transition-all ${
                formData.supportedPetTypes.includes(petType)
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-sm'
              }`}
            >
              {petType}
            </button>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
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
