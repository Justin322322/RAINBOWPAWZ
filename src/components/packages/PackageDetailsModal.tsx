'use client';

import React from 'react';
import { PackageData } from '@/types/packages';
import { Modal } from '@/components/ui';
import { PackageImage } from './PackageImage';
import { formatPrice } from '@/utils/numberUtils';
import {
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Badge components for consistency with ServiceDetailsModal
const StatusBadge = React.memo(function StatusBadge({ isActive }: { isActive: boolean }) {
  const common = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full min-w-[90px] justify-center';
  if (isActive) {
    return <span className={`${common} bg-green-100 text-green-800`}>Active</span>;
  }
  return <span className={`${common} bg-red-100 text-red-800`}>Inactive</span>;
});

const CategoryBadge = React.memo(function CategoryBadge({ category }: { category: string }) {
  const common = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full';
  switch (category.toLowerCase()) {
    case 'private': return <span className={`${common} bg-blue-100 text-blue-800`}>Private</span>;
    case 'communal': return <span className={`${common} bg-amber-100 text-amber-800`}>Communal</span>;
    default: return <span className={`${common} bg-gray-100 text-gray-800`}>{category}</span>;
  }
});

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: PackageData | null;
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  isOpen,
  onClose,
  package: pkg
}) => {
  if (!pkg) return null;

  const hasImages = pkg.images && pkg.images.length > 0;

  // Format the package data for display
  const formattedName = pkg.name || 'Unnamed Package';
  const formattedDescription = pkg.description || 'No description available';
  const formattedConditions = pkg.conditions || 'No conditions specified';
  const formattedType = pkg.cremationType || 'Standard';
  const formattedTime = pkg.processingTime || '2-3 days';

  // Format price with currency
  const formattedPrice = pkg.pricingMode === 'by_size' 
    ? 'Weight-Based Pricing' 
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(pkg.price);

  // Ensure inclusions and addOns are arrays
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const addOns = Array.isArray(pkg.addOns) ? pkg.addOns : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Package Details"
      size="large"
      className="max-w-4xl mx-4 sm:mx-auto"
      contentClassName="max-h-[85vh] overflow-y-auto"
      customZIndex="z-[50000]"
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Content area */}
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{formattedName}</h1>
            <p className="text-gray-600">{pkg.category} Package</p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center space-x-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formattedPrice}</div>
              <div className="text-sm text-gray-600">Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formattedTime}</div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{pkg.supportedPetTypes?.length || 0}</div>
              <div className="text-sm text-gray-600">Pet Types</div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Image Section */}
          <div className="relative">
            {!hasImages ? (
              <div className="w-full h-48 sm:h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                <svg className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">No image available</span>
              </div>
            ) : (
              <div className="w-full h-48 sm:h-64 rounded-lg overflow-hidden">
                <PackageImage
                  images={pkg.images}
                  alt={formattedName}
                  size="large"
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div className="absolute top-3 right-3">
              <CategoryBadge category={pkg.category} />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Package Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Status:</span>
              <StatusBadge isActive={pkg.isActive} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Category:</span>
              <span className="text-sm text-gray-900">{pkg.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Type:</span>
              <span className="text-sm text-gray-900">{formattedType}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Processing Time:</span>
              <span className="text-sm text-gray-900">{formattedTime}</span>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Package Description</h3>
            <p className="text-gray-700 leading-relaxed">{formattedDescription}</p>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Weight-based pricing */}
          {pkg.pricingMode === 'by_size' && pkg.sizePricing && Array.isArray(pkg.sizePricing) && pkg.sizePricing.filter((t: any) => Number(t.price) > 0).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Weight-Based Pricing</h3>
              <div className="space-y-2">
                {pkg.sizePricing.filter((t: any) => Number(t.price) > 0).map((tier: any, index: number) => {
                  const min = tier.weightRangeMin !== undefined ? tier.weightRangeMin : 0;
                  const max = tier.weightRangeMax !== undefined ? tier.weightRangeMax : null;
                  const weightRange = max !== null ? `${min}-${max}kg` : `${min}+kg`;
                  
                  let tierName = 'Small';
                  if (min > 10 && min <= 25) tierName = 'Medium';
                  else if (min > 25 && min <= 40) tierName = 'Large';
                  else if (min > 40) tierName = 'Extra Large';
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-gray-700">{tierName} ({weightRange})</span>
                      <span className="text-lg font-bold text-gray-900">₱{formatPrice(Number(tier.price))}</span>
                    </div>
                  );
                })}
                {Number(pkg.overageFeePerKg || 0) > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-orange-200 bg-orange-50 -mx-4 px-4">
                    <span className="text-gray-700">Overage fee per kg</span>
                    <span className="text-lg font-bold text-orange-700">₱{formatPrice(Number(pkg.overageFeePerKg))}/kg</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* What's Included & Add-ons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* What&apos;s Included */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What&apos;s Included</h3>
              {inclusions.length > 0 ? (
                <ul className="space-y-2">
                  {inclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No inclusions specified</p>
              )}
            </div>

            {/* Add-ons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Add-ons</h3>
              {addOns.length > 0 ? (
                <ul className="space-y-2">
                  {addOns.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="h-2 w-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700">{typeof item === 'string' ? item : item.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No add-ons available</p>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200"></div>

          {/* Terms & Conditions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
            <p className="text-gray-700 leading-relaxed">{formattedConditions}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
