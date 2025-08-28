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
      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
        {image ? (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-green-200 shadow-sm">
              <Image
                src={image}
                alt={desc}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={() => {
                  // Error handling will be done by Next.js Image component
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium line-clamp-2">{desc}</p>
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
      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
        {image ? (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-amber-200 shadow-sm">
              <Image
                src={image}
                alt={name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={() => {
                  // Error handling will be done by Next.js Image component
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <div className="w-6 h-6 bg-amber-400 rounded"></div>
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium line-clamp-1">{name}</p>
        </div>
        <div className="flex-shrink-0">
          <span className="text-lg font-bold text-amber-700">+₱{price.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 group">
      {/* Header with image and status */}
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
          <PackageImageDisplay images={pkg.images || []} alt={pkg.name} />
        </div>
        {/* Status badge overlay */}
        <div className="absolute top-4 right-4">
          <div className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${
            pkg.isActive
              ? 'bg-green-500 text-white'
              : 'bg-gray-500 text-white'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              pkg.isActive ? 'bg-green-200' : 'bg-gray-200'
            }`}></div>
            {pkg.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
        {/* Price overlay */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm">
            <p className="text-2xl font-bold text-gray-900">₱{formatPrice(pkg.price)}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title and Meta */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{pkg.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">{pkg.category}</span>
            <span className="text-gray-400">•</span>
            <span>{pkg.cremationType}</span>
            <span className="text-gray-400">•</span>
            <span>{pkg.processingTime}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-6 leading-relaxed line-clamp-3">{pkg.description}</p>

        {/* Inclusions */}
        {inclusions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900">What&apos;s included</h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {inclusions.length} item{inclusions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {inclusions.slice(0, 3).map((inclusion, idx) => (
                <InclusionItem key={idx} inclusion={inclusion} />
              ))}
            </div>
            {inclusions.length > 3 && (
              <div className="mt-4 text-center">
                <span className="text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                  +{inclusions.length - 3} more items
                </span>
              </div>
            )}
          </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900">Available add-ons</h4>
              <span className="text-xs text-gray-500 bg-amber-100 px-3 py-1 rounded-full">
                {addOns.length} add-on{addOns.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {addOns.slice(0, 2).map((addon, idx) => (
                <AddOnItem key={idx} addon={addon} />
              ))}
            </div>
            {addOns.length > 2 && (
              <div className="mt-4 text-center">
                <span className="text-xs text-gray-500 bg-amber-100 px-4 py-2 rounded-full">
                  +{addOns.length - 2} more add-ons
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleEdit}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>

          <button
            onClick={handleToggleActive}
            disabled={toggleLoading === pkg.id}
            className={`w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium border border-transparent rounded-lg focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-sm ${
              pkg.isActive
                ? 'text-orange-700 bg-orange-100 hover:bg-orange-200 focus:ring-orange-500'
                : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {toggleLoading === pkg.id ? (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
            ) : pkg.isActive ? (
              <EyeSlashIcon className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 mr-2" />
            )}
            {pkg.isActive ? 'Deactivate' : 'Activate'}
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
