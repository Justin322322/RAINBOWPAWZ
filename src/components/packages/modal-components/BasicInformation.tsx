'use client';

import React from 'react';

interface BasicInformationProps {
  formData: {
    name: string;
    description: string;
    price: number;
    pricingMode: 'fixed' | 'by_size';
    overageFeePerKg: number;
    sizePricing: Array<{ sizeCategory: string; weightRangeMin: number; weightRangeMax: number | null; price: number }>;
  };
  errors: Record<string, string | undefined>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPricingModeChange: (mode: 'fixed' | 'by_size') => void;
  onSizePricingChange: (index: number, field: 'price', value: number) => void;
}

export const BasicInformation: React.FC<BasicInformationProps> = ({
  formData,
  errors,
  onInputChange,
  onPricingModeChange,
  onSizePricingChange
}) => {
  return (
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
            onChange={onInputChange}
            className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
            placeholder="e.g., Basic Cremation"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
            <input
              id="price"
              name="price"
              type="number"
              value={formData.price || ''}
              onChange={onInputChange}
              min="0"
              step="any"
              className={`block w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
              placeholder="e.g., 3500"
            />
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>
        </div>

        {/* Pricing Options */}
        <div className="border rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Pricing Options</h3>
          <div className="flex flex-col gap-3 mb-5">
            <label className="inline-flex items-start gap-2">
              <input
                type="radio"
                name="pricingMode"
                value="fixed"
                checked={formData.pricingMode === 'fixed'}
                onChange={() => onPricingModeChange('fixed')}
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
                onChange={() => onPricingModeChange('by_size')}
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
                        onSizePricingChange(idx, 'price', val);
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
                        value={formData.overageFeePerKg === 0 ? '' : formData.overageFeePerKg}
                        onChange={onInputChange}
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
            onChange={onInputChange}
            className={`block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm`}
            placeholder="Describe your package in detail"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>
      </div>
    </div>
  );
};
