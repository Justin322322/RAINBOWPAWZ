'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CurrencyDollarIcon, TagIcon } from '@heroicons/react/24/outline';

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
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg">
          <TagIcon className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Package Information</h2>
          <p className="text-sm text-gray-500">Basic details and pricing configuration</p>
        </div>
      </div>

      {/* Package Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-900">
          Package Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={onInputChange}
          className={`block w-full px-4 py-3 border rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm ${
            errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Premium Pet Cremation Service"
        />
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span className="text-red-500">⚠</span>
            {errors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-900">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={onInputChange}
          className={`block w-full px-4 py-3 border rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm ${
            errors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
          }`}
          placeholder="Provide a detailed description of your cremation package, including what makes it special..."
        />
        {errors.description && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span className="text-red-500">⚠</span>
            {errors.description}
          </p>
        )}
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg">
            <CurrencyDollarIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Pricing Configuration</h3>
            <p className="text-sm text-gray-600">Choose how you want to price your package</p>
          </div>
        </div>

        {/* Pricing Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            variant={formData.pricingMode === 'fixed' ? 'primary' : 'outline'}
            size="md"
            fullWidth
            onClick={() => onPricingModeChange('fixed')}
            className={`justify-start h-auto p-4 ${
              formData.pricingMode === 'fixed'
                ? 'ring-2 ring-emerald-500 ring-offset-2'
                : 'hover:ring-1 hover:ring-gray-300'
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">Fixed Price</div>
              <div className="text-xs opacity-80 mt-1">One price for all pets</div>
            </div>
          </Button>

          <Button
            variant={formData.pricingMode === 'by_size' ? 'primary' : 'outline'}
            size="md"
            fullWidth
            onClick={() => onPricingModeChange('by_size')}
            className={`justify-start h-auto p-4 ${
              formData.pricingMode === 'by_size'
                ? 'ring-2 ring-emerald-500 ring-offset-2'
                : 'hover:ring-1 hover:ring-gray-300'
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">Size-Based Pricing</div>
              <div className="text-xs opacity-80 mt-1">Different prices by pet size</div>
            </div>
          </Button>
        </div>

        {/* Fixed Price Input */}
        {formData.pricingMode === 'fixed' && (
          <div className="space-y-2">
            <label htmlFor="price" className="block text-sm font-medium text-gray-900">
              Package Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">₱</span>
              </div>
              <input
                id="price"
                name="price"
                type="number"
                value={formData.price || ''}
                onChange={onInputChange}
                min="0"
                step="0.01"
                className={`block w-full pl-8 pr-4 py-3 border rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm ${
                  errors.price ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span className="text-red-500">⚠</span>
                {errors.price}
              </p>
            )}
          </div>
        )}

        {/* Size-Based Pricing */}
        {formData.pricingMode === 'by_size' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Size-Based Pricing Tiers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.sizePricing.map((sp, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" size="sm">{sp.sizeCategory}</Badge>
                      <span className="text-xs text-gray-500">
                        {sp.weightRangeMin}kg - {sp.weightRangeMax ? `${sp.weightRangeMax}kg` : '+'}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">₱</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sp.price === 0 ? '' : sp.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onSizePricingChange(idx, 'price', val);
                        }}
                        className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overage Fee */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">i</span>
                </div>
                <h5 className="text-sm font-medium text-blue-900">Overage Fee</h5>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Applied per kg if a pet exceeds the selected weight category
              </p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">₱</span>
                </div>
                <input
                  id="overageFeePerKg"
                  name="overageFeePerKg"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={formData.overageFeePerKg === 0 ? '' : formData.overageFeePerKg}
                  onChange={onInputChange}
                  placeholder="50.00"
                  className="block w-full pl-7 pr-3 py-2 border border-blue-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
