'use client';

import React, { useState } from 'react';
import { PackageData } from '@/types/packages';
import { Modal } from '@/components/ui';
import { PackageImage } from './PackageImage';
import { formatPrice } from '@/utils/numberUtils';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TagIcon
} from '@heroicons/react/24/outline';

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
  const [showFullDescription, setShowFullDescription] = useState(false);

  if (!pkg) return null;

  const hasImages = pkg.images && pkg.images.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={pkg.name}
      headerContent={
        <div className="flex items-center gap-2">
          <Badge
            variant={pkg.isActive ? 'success' : 'danger'}
            size="sm"
            icon={pkg.isActive ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
          >
            {pkg.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Image */}
        <div className="aspect-video overflow-hidden rounded-lg">
          {hasImages ? (
            <PackageImage
              images={pkg.images}
              alt={pkg.name}
              size="large"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">No image available</span>
            </div>
          )}
        </div>

        {/* Price & Basic Info */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Price</p>
              {pkg.pricingMode === 'by_size' ? (
                <p className="text-3xl font-bold text-gray-900">Weight-Based Pricing</p>
              ) : (
                <p className="text-4xl font-bold text-gray-900">₱{formatPrice(pkg.price)}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <ClockIcon className="h-4 w-4" />
                {pkg.processingTime}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TagIcon className="h-4 w-4" />
                {pkg.category}
              </div>
            </div>
          </div>

          {pkg.supportedPetTypes && pkg.supportedPetTypes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-3">Suitable for</p>
              <div className="flex flex-wrap gap-2">
                {pkg.supportedPetTypes.slice(0, 6).map((pet, idx) => (
                  <span key={idx} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                    {pet}
                  </span>
                ))}
                {pkg.supportedPetTypes.length > 6 && (
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded-full">
                    +{pkg.supportedPetTypes.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-gray-700 leading-relaxed text-lg">
            {showFullDescription ? pkg.description : pkg.description?.substring(0, 200) + (pkg.description && pkg.description.length > 200 ? '...' : '')}
          </p>
          {pkg.description && pkg.description.length > 200 && (
            <button
              type="button"
              className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => setShowFullDescription(!showFullDescription)}
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Weight-based pricing */}
        {pkg.pricingMode === 'by_size' && pkg.sizePricing && Array.isArray(pkg.sizePricing) && pkg.sizePricing.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Weight-Based Pricing</h3>
            <div className="space-y-3">
              {pkg.sizePricing.map((tier: any, index: number) => {
                const min = tier.weightRangeMin !== undefined ? tier.weightRangeMin : 0;
                const max = tier.weightRangeMax !== undefined ? tier.weightRangeMax : null;
                const weightRange = max !== null ? `${min}-${max}kg` : `${min}+kg`;
                
                let tierName = 'Small';
                if (min > 10 && min <= 25) tierName = 'Medium';
                else if (min > 25 && min <= 40) tierName = 'Large';
                else if (min > 40) tierName = 'Extra Large';
                
                return (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <span className="text-gray-700 font-medium">{tierName} ({weightRange})</span>
                    <span className="text-xl font-bold text-gray-900">₱{formatPrice(Number(tier.price))}</span>
                  </div>
                );
              })}
              {Number(pkg.overageFeePerKg || 0) > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-orange-200 bg-orange-50 -mx-4 px-4">
                  <span className="text-gray-700">Overage fee per kg</span>
                  <span className="text-lg font-bold text-orange-700">₱{formatPrice(Number(pkg.overageFeePerKg))}/kg</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inclusions */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">What&apos;s Included</h3>
            <ul className="space-y-3">
              {pkg.inclusions.map((inclusion, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-lg">{inclusion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Available Add-ons</h3>
            <div className="space-y-3">
              {pkg.addOns.map((addon, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <span className="text-gray-700 text-lg">
                    {typeof addon === 'string' ? addon : addon.name}
                  </span>
                  {typeof addon !== 'string' && addon.price && (
                    <span className="text-lg font-medium text-gray-900">
                      +₱{formatPrice(addon.price)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {pkg.conditions && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
            <p className="text-gray-700 leading-relaxed text-lg">{pkg.conditions}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
