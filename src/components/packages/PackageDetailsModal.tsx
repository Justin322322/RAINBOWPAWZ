'use client';

import React, { useMemo, useState } from 'react';
import { PackageData } from '@/types/packages';
import { Modal } from '@/components/ui';
import { PackageImage } from './PackageImage';
import { formatPrice } from '@/utils/numberUtils';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon,
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
    if (!pkg?.inclusions) return [] as string[];
    return showAllInclusions ? pkg.inclusions : pkg.inclusions.slice(0, 4);
  }, [pkg?.inclusions, showAllInclusions]);

  // Early return after all hooks have been called
  if (!pkg) return null;

  const hasImages = pkg.images && pkg.images.length > 0;

  const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-600 h-5 w-5 inline-flex items-center justify-center">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
  );

  const cardBase =
    'rounded-lg border bg-white shadow-sm';
  const infoCard = `${cardBase} px-4 py-4`; // compact, consistent paddings

  const remainingInclusions = (pkg.inclusions?.length || 0) - displayedInclusions.length;

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
          {pkg.isActive && (
            <span className="text-xs text-green-100/90">Available for booking</span>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
            {hasImages ? (
              <PackageImage
                images={pkg.images}
                alt={pkg.name}
                size="large"
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">No image available</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className={`${infoCard} border-emerald-200/70 bg-emerald-50`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="h-9 w-9 rounded-full bg-white text-emerald-600 ring-1 ring-emerald-200 flex items-center justify-center mr-3">
                    <CurrencyDollarIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-emerald-900/80">Price</p>
                    {pkg.pricingMode === 'by_size' ? (
                      <div>
                        <p className="text-lg font-bold text-blue-600">Weight-Based Pricing</p>
                        <p className="text-xs text-blue-600">See tiers below</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-emerald-900">₱{formatPrice(pkg.price)}</p>
                    )}
                  </div>
                </div>
                <Badge variant="info" size="sm" icon={<ClockIcon className="h-4 w-4" />}>{pkg.processingTime}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="info" size="sm" icon={<TagIcon className="h-4 w-4" />}>{pkg.category}</Badge>
                <Badge variant="primary" size="sm" icon={<SparklesIcon className="h-4 w-4" />}>{pkg.cremationType}</Badge>
              </div>
              {pkg.supportedPetTypes && pkg.supportedPetTypes.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-emerald-900/80 mb-1">Suitable for</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(pkg.supportedPetTypes || []).slice(0, 6).map((pet, idx) => (
                      <Badge key={idx} size="xs">{pet}</Badge>
                    ))}
                    {(pkg.supportedPetTypes?.length || 0) > 6 && (
                      <Badge size="xs" variant="outline">+{(pkg.supportedPetTypes!.length - 6)} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader icon={<DocumentTextIcon className="h-5 w-5" />} title="Description" />
            <p className={"text-gray-700 leading-relaxed " + (showFullDescription ? '' : 'line-clamp-3')}>{pkg.description}</p>
            {pkg.description && pkg.description.length > 120 && (
              <button
                type="button"
                className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
                onClick={() => setShowFullDescription(v => !v)}
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Weight-based pricing details */}
          {pkg.pricingMode === 'by_size' && pkg.sizePricing && Array.isArray(pkg.sizePricing) && pkg.sizePricing.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <SectionHeader icon={<CurrencyDollarIcon className="h-5 w-5 text-blue-600" />} title="Weight-Based Pricing" />
              <div className="space-y-3">
                {pkg.sizePricing.map((tier: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <span className="text-blue-600 text-sm mr-2">📏</span>
                      <span className="text-gray-700">
                        {(() => {
                          // Generate proper tier name based on weight ranges
                          const min = tier.weightRangeMin !== undefined ? tier.weightRangeMin : 0;
                          const max = tier.weightRangeMax !== undefined ? tier.weightRangeMax : null;
                          
                          let tierName = '';
                          
                          // Determine tier name based on weight ranges
                          if (min === 0 && max === 10) {
                            tierName = 'Small';
                          } else if (min === 11 && max === 25) {
                            tierName = 'Medium';
                          } else if (min === 26 && max === 40) {
                            tierName = 'Large';
                          } else if (min === 41 && max === null) {
                            tierName = 'Extra Large';
                          } else {
                            // Fallback for custom ranges
                            if (min <= 10) tierName = 'Small';
                            else if (min <= 25) tierName = 'Medium';
                            else if (min <= 40) tierName = 'Large';
                            else tierName = 'Extra Large';
                          }
                          
                          // Generate weight range string
                          const weightRange = max !== null ? `${min}-${max}kg` : `${min}+kg`;
                          
                          return `${tierName} (${weightRange})`;
                        })()}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded">
                      ₱{formatPrice(Number(tier.price))}
                    </span>
                  </div>
                ))}
                {Number(pkg.overageFeePerKg || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center">
                      <span className="text-orange-600 text-sm mr-2">⚖️</span>
                      <span className="text-gray-700">Overage fee per kg (if pet exceeds selected tier)</span>
                    </div>
                    <span className="text-sm font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded">
                      ₱{formatPrice(Number(pkg.overageFeePerKg))}/kg
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>How it works:</strong> Select the weight tier that matches your pet's weight. 
                  If your pet exceeds the maximum weight for the selected tier, additional overage fees may apply.
                </p>
              </div>
            </div>
          )}

          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <SectionHeader icon={<CheckCircleIcon className="h-5 w-5 text-green-600" />} title="What's Included" />
              <ul className="space-y-2">
                {displayedInclusions.map((inclusion, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{inclusion}</span>
                  </li>
                ))}
              </ul>
              {remainingInclusions > 0 && (
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-green-700 hover:underline"
                  onClick={() => setShowAllInclusions(true)}
                >
                  +{remainingInclusions} more
                </button>
              )}
            </div>
          )}

          {pkg.addOns && pkg.addOns.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <SectionHeader icon={<SparklesIcon className="h-5 w-5 text-amber-600" />} title="Available Add-ons" />
              <div className="space-y-2">
                {pkg.addOns.map((addon, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center">
                      <span className="text-amber-600 text-sm mr-2">+</span>
                      <span className="text-gray-700">
                        {typeof addon === 'string' ? addon : addon.name}
                      </span>
                    </div>
                    {typeof addon !== 'string' && addon.price && (
                      <span className="text-sm font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        +₱{formatPrice(addon.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pkg.conditions && (
            <div>
              <SectionHeader icon={<DocumentTextIcon className="h-5 w-5" />} title="Terms & Conditions" />
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className={"text-gray-700 text-sm leading-relaxed " + (showConditions ? '' : 'line-clamp-2')}>{pkg.conditions}</p>
                {pkg.conditions.length > 120 && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
                    onClick={() => setShowConditions(v => !v)}
                  >
                    {showConditions ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
