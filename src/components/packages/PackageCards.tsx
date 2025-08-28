'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/utils/numberUtils';

interface PackageCardsProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  toggleLoading: number | null;
}

// Clean Image Display Component
const PackageImageDisplay = React.memo<{ images: string[]; alt: string }>(({ images, alt }) => {
  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
        <div className="w-12 h-12 bg-gray-200 rounded-lg mb-2"></div>
        <span className="text-xs text-gray-500">No image</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden">
      <PackageImage
        images={images}
        alt={alt}
        size="large"
        className="w-full h-full object-cover"
      />
    </div>
  );
});

PackageImageDisplay.displayName = 'PackageImageDisplay';





// Vercel-inspired package card component
const PackageCard = React.memo<{
  pkg: PackageData;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  toggleLoading: number | null;
}>(({ pkg, onEdit, onDelete, onToggleActive, toggleLoading }) => {
  // Memoized handlers to prevent re-renders
  const handleEdit = useCallback(() => onEdit(pkg.id), [onEdit, pkg.id]);
  const handleDelete = useCallback(() => onDelete(pkg.id), [onDelete, pkg.id]);
  const handleToggleActive = useCallback(() => onToggleActive(pkg.id, pkg.isActive), [onToggleActive, pkg.id, pkg.isActive]);

  // Get inclusions and add-ons for display
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const addOns = Array.isArray(pkg.addOns) ? pkg.addOns : [];

  // Component for inclusion item with image
  const InclusionItem = ({ inclusion }: { inclusion: any }) => {
    const desc = typeof inclusion === 'string' ? inclusion : inclusion.description;
    const image = typeof inclusion === 'object' && inclusion.image;

    return (
      <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-200 border border-slate-200/50">
        {image ? (
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border-2 border-slate-200 shadow-sm">
              <Image
                src={image}
                alt={desc}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                onError={() => {
                  // Error handling will be done by Next.js Image component
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-slate-200">
              <svg className="w-7 h-7 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 font-medium leading-relaxed">{desc}</p>
          <div className="mt-1 w-8 h-0.5 bg-slate-300 rounded-full"></div>
        </div>
      </div>
    );
  };

  // Component for add-on item with image
  const AddOnItem = ({ addon }: { addon: any }) => {
    const name = typeof addon === 'string' ? addon : addon.name;
    const price = typeof addon === 'string' ? 0 : addon.price;
    const image = typeof addon === 'object' && addon.image;

    return (
      <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-all duration-200 border border-stone-200/50">
        {image ? (
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border-2 border-stone-200 shadow-sm">
              <Image
                src={image}
                alt={name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                onError={() => {
                  // Error handling will be done by Next.js Image component
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center border-2 border-stone-200">
              <svg className="w-7 h-7 text-stone-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-800 font-medium leading-relaxed">{name}</p>
          <div className="mt-1 w-8 h-0.5 bg-stone-300 rounded-full"></div>
        </div>
        <div className="flex-shrink-0">
          <div className="bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
            <span className="text-sm font-semibold text-stone-700">+₱{price.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
      {/* Header with image and status */}
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
        <PackageImageDisplay images={pkg.images || []} alt={pkg.name} />
        </div>
        {/* Status badge overlay */}
        <div className="absolute top-4 right-4">
          <div className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full shadow-sm border ${
            pkg.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              pkg.isActive ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></div>
            {pkg.isActive ? 'Available' : 'Unavailable'}
          </div>
        </div>
        {/* Price overlay */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xl font-serif font-semibold text-slate-800">₱{formatPrice(pkg.price)}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title and Meta */}
        <div className="mb-5">
          <h3 className="text-xl font-serif font-bold text-slate-900 mb-3 leading-tight">{pkg.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">{pkg.category}</span>
            <span className="text-slate-400">•</span>
            <span>{pkg.cremationType}</span>
            <span className="text-slate-400">•</span>
            <span>{pkg.processingTime}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-700 mb-8 leading-relaxed line-clamp-3 font-medium">{pkg.description}</p>

        {/* Inclusions */}
        {inclusions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-slate-400 rounded-full"></div>
                <h4 className="text-base font-serif font-semibold text-slate-800">Memorial Services Included</h4>
              </div>
              <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {inclusions.length} service{inclusions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-4">
              {inclusions.slice(0, 3).map((inclusion, idx) => (
                <InclusionItem key={idx} inclusion={inclusion} />
              ))}
            </div>
            {inclusions.length > 3 && (
              <div className="mt-5 text-center">
                <span className="text-xs text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer">
                  +{inclusions.length - 3} additional services
                </span>
              </div>
            )}
        </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-stone-400 rounded-full"></div>
                <h4 className="text-base font-serif font-semibold text-stone-800">Personalized Memorial Options</h4>
            </div>
              <span className="text-xs text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                {addOns.length} option{addOns.length !== 1 ? 's' : ''}
              </span>
          </div>
            <div className="space-y-4">
              {addOns.slice(0, 2).map((addon, idx) => (
                <AddOnItem key={idx} addon={addon} />
              ))}
            </div>
            {addOns.length > 2 && (
              <div className="mt-5 text-center">
                <span className="text-xs text-stone-600 bg-stone-100 px-4 py-2 rounded-full border border-stone-200 hover:bg-stone-200 transition-colors cursor-pointer">
                  +{addOns.length - 2} additional options
                </span>
          </div>
            )}
        </div>
        )}

        {/* Action buttons */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleEdit}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>

          <button
            onClick={handleToggleActive}
            disabled={toggleLoading === pkg.id}
            className={`w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium border rounded-lg focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
              pkg.isActive
                ? 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 focus:ring-slate-500'
                : 'text-white bg-slate-600 border-slate-600 hover:bg-slate-700 focus:ring-slate-500'
            }`}
          >
            {toggleLoading === pkg.id ? (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
            ) : pkg.isActive ? (
              <EyeSlashIcon className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 mr-2" />
            )}
            {pkg.isActive ? 'Make Unavailable' : 'Make Available'}
          </button>
        </div>
      </div>
    </div>
  );
});

PackageCard.displayName = 'PackageCard';

// Main component that maps through packages
export const PackageCards: React.FC<PackageCardsProps> = ({
  packages,
  onEdit,
  onDelete,
  onToggleActive,
  toggleLoading
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          toggleLoading={toggleLoading}
        />
      ))}
    </div>
  );
};
