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
    <div className="mb-8">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Package Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
            min="0"
            step="any"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            placeholder="e.g., 15"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Supported Pet Types</label>
        {errors.supportedPetTypes && (
          <p className="text-sm text-red-600 mb-2">{errors.supportedPetTypes}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other'].map((petType) => (
            <label key={petType} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.supportedPetTypes.includes(petType)}
                onChange={() => onPetTypeToggle(petType)}
                className="rounded border-gray-300 text-[var(--primary-green)] focus:ring-[var(--primary-green)] h-4 w-4"
              />
              <span className="ml-2 text-sm text-gray-700">{petType}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
