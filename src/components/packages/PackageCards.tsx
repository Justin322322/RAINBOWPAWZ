'use client';

import React, { useCallback } from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { Badge } from '@/components/ui/Badge';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon, CheckCircleIcon, TagIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/utils/numberUtils';

interface PackageCardsProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDetails?: (id: number) => void;
  toggleLoading: number | null;
}

// Clean Image Display Component (following existing design system)
const PackageImageDisplay = React.memo<{ images: string[]; alt: string }>(({ images, alt }) => {
  if (images.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">No image</span>
      </div>
    );
  }

  return (
    <div className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <PackageImage
        images={images}
        alt={alt}
        size="large"
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {images.length} images
        </div>
      )}
    </div>
  );
});

PackageImageDisplay.displayName = 'PackageImageDisplay';

// Simple Inclusion Display (following existing design system)
const InclusionDisplay = React.memo<{ inclusions: any[] }>(({ inclusions }) => {
  if (!inclusions || inclusions.length === 0) return null;

  const displayItems = inclusions.slice(0, 3);
  const remainingCount = inclusions.length - 3;

  return (
    <div className="space-y-2">
      {displayItems.map((inc: any, index) => (
        <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
          <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="truncate">
            {typeof inc === 'string' ? inc : inc.description}
          </span>
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 font-medium">
          +{remainingCount} more inclusion{remainingCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
});

InclusionDisplay.displayName = 'InclusionDisplay';

// Memoized individual card component following existing design system
const PackageCard = React.memo<{
  pkg: PackageData;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDetails?: (id: number) => void;
  toggleLoading: number | null;
}>(({ pkg, onEdit, onDelete, onToggleActive, onDetails, toggleLoading }) => {
  // Memoized handlers to prevent re-renders
  const handleEdit = useCallback(() => onEdit(pkg.id), [onEdit, pkg.id]);
  const handleDelete = useCallback(() => onDelete(pkg.id), [onDelete, pkg.id]);
  const handleToggleActive = useCallback(() => onToggleActive(pkg.id, pkg.isActive), [onToggleActive, pkg.id, pkg.isActive]);
  const handleDetails = useCallback(() => onDetails?.(pkg.id), [onDetails, pkg.id]);

  // Get counts for display
  const inclusionCount = Array.isArray(pkg.inclusions) ? pkg.inclusions.length : 0;
  const addOnCount = Array.isArray(pkg.addOns) ? pkg.addOns.length : 0;

  // Add-on display component
  const AddOnList = () => {
    if (!pkg.addOns || pkg.addOns.length === 0) return null;

    const displayItems = pkg.addOns.slice(0, 2);
    const remainingCount = addOnCount - 2;

    return (
      <div className="space-y-2">
        {displayItems.map((addon, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-amber-50 rounded-md border border-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-sm font-medium">+</span>
              <span className="text-sm text-gray-700 truncate">
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
        {remainingCount > 0 && (
          <div className="text-xs text-amber-600 font-medium">
            +{remainingCount} more add-on{remainingCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  const cardBase = 'rounded-lg border bg-white shadow-sm';

  return (
    <div className={`${cardBase} overflow-hidden hover:shadow-md transition-shadow`}>
      {/* Clean Image Display */}
      <PackageImageDisplay images={pkg.images || []} alt={pkg.name} />

      {/* Status Badge */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Badge
            variant={pkg.isActive ? 'success' : 'danger'}
            size="sm"
            icon={pkg.isActive ? <CheckCircleIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
          >
            {pkg.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">₱{formatPrice(pkg.price)}</p>
            <p className="text-xs text-gray-500">Price</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{pkg.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{pkg.description}</p>
        </div>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="info" size="sm" icon={<TagIcon className="h-4 w-4" />}>{pkg.category}</Badge>
          <Badge variant="primary" size="sm" icon={<SparklesIcon className="h-4 w-4" />}>{pkg.cremationType}</Badge>
          <Badge variant="warning" size="sm" icon={<ClockIcon className="h-4 w-4" />}>{pkg.processingTime}</Badge>
        </div>

        {/* Inclusions */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900">
                What&apos;s Included ({inclusionCount})
              </h4>
            </div>
            <InclusionDisplay inclusions={pkg.inclusions} />
          </div>
        )}

        {/* Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="h-5 w-5 text-amber-600" />
              <h4 className="text-sm font-semibold text-gray-900">
                Add-ons ({addOnCount})
              </h4>
            </div>
            <AddOnList />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {onDetails && (
            <button
              onClick={handleDetails}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
            >
              <InformationCircleIcon className="h-4 w-4 mr-2" />
              View Details
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-300 transition-colors flex-1"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-300 transition-colors flex-1"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>

          <button
            onClick={handleToggleActive}
            disabled={toggleLoading === pkg.id}
            className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              pkg.isActive
                ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-300'
                : 'text-green-700 bg-green-50 hover:bg-green-100 border-green-300'
            }`}
          >
            {toggleLoading === pkg.id ? (
              <div className="h-4 w-4 border-2 border-t-transparent border-current animate-spin rounded-full mr-2"></div>
            ) : pkg.isActive ? (
              <EyeSlashIcon className="h-4 w-4 mr-2" />
            ) : (
              <EyeIcon className="h-4 w-4 mr-2" />
            )}
            {pkg.isActive ? "Deactivate" : "Activate"}
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
  onDetails,
  toggleLoading
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onDetails={onDetails}
          toggleLoading={toggleLoading}
        />
      ))}
    </div>
  );
};
