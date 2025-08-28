'use client';

import React, { useCallback } from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EyeSlashIcon, CheckCircleIcon, PencilIcon, TrashIcon, EyeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/utils/numberUtils';

interface PackageCardsProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDetails?: (id: number) => void;
  toggleLoading: number | null;
}

// Clean Image Display Component
const PackageImageDisplay = React.memo<{ images: string[]; alt: string }>(({ images, alt }) => {
  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-gray-500">No image</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 overflow-hidden">
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

// Inclusion/Add-on Preview Component
const ItemPreview = React.memo<{
  items: any[];
  type: 'inclusion' | 'addon';
  maxItems?: number;
}>(({ items, type, maxItems = 3 }) => {
  const displayItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {displayItems.map((item: any, index) => {
        const name = typeof item === 'string' ? item : (type === 'inclusion' ? item.description : item.name);
        const image = typeof item === 'string' ? undefined : item.image;

        return (
          <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
            {image && (
              <PackageImage
                images={[image]}
                alt={name}
                size="small"
                className="w-6 h-6 rounded object-cover border border-gray-200 flex-shrink-0"
              />
            )}
            <span className="truncate">{name}</span>
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 font-medium">
          +{remainingCount} more {type}{remainingCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
});

ItemPreview.displayName = 'ItemPreview';



// Clean and simple package card component
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



  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-video">
        <PackageImageDisplay images={pkg.images || []} alt={pkg.name} />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{pkg.name}</h3>
            <p className="text-2xl font-bold text-emerald-600">₱{formatPrice(pkg.price)}</p>
          </div>
          <Badge
            variant={pkg.isActive ? 'success' : 'danger'}
            size="sm"
            icon={pkg.isActive ? <CheckCircleIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
          >
            {pkg.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" size="sm">{pkg.category}</Badge>
          <Badge variant="outline" size="sm">{pkg.cremationType}</Badge>
          <Badge variant="outline" size="sm">{pkg.processingTime}</Badge>
        </div>

        {/* Inclusions Preview */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">What&apos;s Included</span>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <ItemPreview items={pkg.inclusions} type="inclusion" maxItems={2} />
            </div>
          </div>
        )}

        {/* Add-ons Preview */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-900">Available Add-ons</span>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
              <ItemPreview items={pkg.addOns} type="addon" maxItems={2} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {onDetails && (
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={handleDetails}
              className="border-gray-300 hover:border-gray-400"
            >
              View Full Details
            </Button>
          )}

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              leftIcon={<PencilIcon className="h-4 w-4" />}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              leftIcon={<TrashIcon className="h-4 w-4" />}
              className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
            >
              Delete
            </Button>
          </div>

          {/* Status Action */}
          <Button
            variant={pkg.isActive ? 'secondary' : 'primary'}
            size="sm"
            fullWidth
            onClick={handleToggleActive}
            leftIcon={pkg.isActive ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            isLoading={toggleLoading === pkg.id}
            className={pkg.isActive ? 'border-gray-300' : ''}
          >
            {pkg.isActive ? 'Deactivate Package' : 'Activate Package'}
          </Button>
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
