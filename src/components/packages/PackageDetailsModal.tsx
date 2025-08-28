'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { PackageData } from '@/types/packages';
import { Modal } from '@/components/ui';
import { PackageImage } from './PackageImage';
import { formatPrice } from '@/utils/numberUtils';
import { Badge } from '@/components/ui/Badge';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  SparklesIcon
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
  // All hooks must be called before any early returns
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllInclusions, setShowAllInclusions] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const displayedInclusions = useMemo(() => {
    if (!pkg?.inclusions) return [] as any[];
    return showAllInclusions ? pkg.inclusions : pkg.inclusions.slice(0, 4);
  }, [pkg?.inclusions, showAllInclusions]);

  // Early return after all hooks have been called
  if (!pkg) return null;

  const hasImages = pkg.images && pkg.images.length > 0;

  const remainingInclusions = (pkg.inclusions?.length || 0) - displayedInclusions.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={pkg.name}
    >
      <div className="space-y-8">
        {/* Package Image */}
        <div className="rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
          {hasImages ? (
            <PackageImage
              images={pkg.images}
              alt={pkg.name}
              size="large"
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center text-gray-400 bg-white">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">No image available</span>
              </div>
            </div>
          )}
        </div>

        {/* Package Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-full">
                  <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-600">₱{formatPrice(pkg.price)}</p>
                  <p className="text-sm text-gray-500">Package Price</p>
                </div>
              </div>
            </div>
            <Badge
              variant={pkg.isActive ? 'success' : 'danger'}
              size="sm"
            >
              {pkg.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Package Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium text-gray-900">{pkg.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                <p className="text-sm font-medium text-gray-900">{pkg.cremationType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Processing</p>
                <p className="text-sm font-medium text-gray-900">{pkg.processingTime}</p>
              </div>
            </div>
          </div>

          {/* Pet Types */}
          {pkg.supportedPetTypes && pkg.supportedPetTypes.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Suitable for</p>
              <div className="flex flex-wrap gap-2">
                {pkg.supportedPetTypes.map((pet, idx) => (
                  <Badge key={idx} variant="outline" size="sm">
                    {pet}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
          <p className={`text-gray-700 leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {pkg.description}
          </p>
          {pkg.description && pkg.description.length > 120 && (
            <button
              type="button"
              className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              onClick={() => setShowFullDescription(v => !v)}
            >
              {showFullDescription ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* What's Included */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Included</h3>
            <div className="space-y-3">
              {displayedInclusions.map((inclusion: any, idx) => {
                const desc = typeof inclusion === 'string' ? inclusion : inclusion.description;
                const image = typeof inclusion === 'string' ? undefined : inclusion.image;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckIcon className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    {image && (
                      <Image
                        src={image}
                        alt="inclusion"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                        unoptimized
                      />
                    )}
                    <span className="text-gray-700 leading-relaxed">{desc}</span>
                  </div>
                );
              })}
            </div>
            {remainingInclusions > 0 && (
              <button
                type="button"
                className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                onClick={() => setShowAllInclusions(true)}
              >
                Show {remainingInclusions} more items
              </button>
            )}
          </div>
        )}

        {/* Available Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Add-ons</h3>
            <div className="space-y-3">
              {pkg.addOns.map((addon: any, idx) => {
                const name = typeof addon === 'string' ? addon : addon.name;
                const price = typeof addon === 'string' ? undefined : addon.price;
                const image = typeof addon === 'string' ? undefined : addon.image;
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-3">
                      {image && (
                        <Image
                          src={image}
                          alt="addon"
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded object-cover border border-amber-200 flex-shrink-0"
                          unoptimized
                        />
                      )}
                      <span className="text-gray-900 font-medium">{name}</span>
                    </div>
                    {price && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100">
                        +₱{formatPrice(price)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {pkg.conditions && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
            <p className={`text-gray-700 text-sm leading-relaxed ${showConditions ? '' : 'line-clamp-3'}`}>
              {pkg.conditions}
            </p>
            {pkg.conditions.length > 120 && (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                onClick={() => setShowConditions(v => !v)}
              >
                {showConditions ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
