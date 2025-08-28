'use client';

import React, { useCallback } from 'react';
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

    return (
      <div className="flex items-center text-sm text-gray-600">
        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
        <span className="line-clamp-1">{desc}</span>
      </div>
    );
  };

  // Component for add-on item with image
  const AddOnItem = ({ addon }: { addon: any }) => {
    const name = typeof addon === 'string' ? addon : addon.name;
    const price = typeof addon === 'string' ? 0 : addon.price;
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 line-clamp-1">{name}</span>
        <span className="text-gray-900 font-medium ml-2">+₱{price.toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200">
      {/* Header with image and status */}
      <div className="relative">
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <PackageImageDisplay images={pkg.images || []} alt={pkg.name} />
        </div>
        {/* Status badge overlay */}
        <div className="absolute top-3 right-3">
          <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
            pkg.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            {pkg.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>


      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title and Price */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
          <p className="text-3xl font-bold text-gray-900">₱{formatPrice(pkg.price)}</p>
        </div>

        {/* Package details */}
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <span className="font-medium">{pkg.category}</span>
            <span className="mx-2 text-gray-300">•</span>
            <span>{pkg.cremationType}</span>
            <span className="mx-2 text-gray-300">•</span>
            <span>{pkg.processingTime}</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{pkg.description}</p>
        </div>

                {/* Inclusions Preview */}
        {inclusions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What&apos;s included</h4>
            <div className="space-y-1">
              {inclusions.slice(0, 3).map((inclusion, idx) => (
                <InclusionItem key={idx} inclusion={inclusion} />
              ))}
              {inclusions.length > 3 && (
                <div className="text-xs text-gray-500 pl-6">
                  +{inclusions.length - 3} more items
                </div>
              )}
            </div>
          </div>
        )}

                {/* Add-ons Preview */}
        {addOns.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Available add-ons</h4>
            <div className="space-y-1">
              {addOns.slice(0, 2).map((addon, idx) => (
                <AddOnItem key={idx} addon={addon} />
              ))}
              {addOns.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{addOns.length - 2} more add-ons
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleEdit}
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>

          <button
            onClick={handleToggleActive}
            disabled={toggleLoading === pkg.id}
            className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md transition-colors ${
              pkg.isActive
                ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                : 'text-white bg-green-600 hover:bg-green-700'
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
