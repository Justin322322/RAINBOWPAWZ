'use client';

import React, { useCallback } from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/utils/numberUtils';

interface PackageCardsProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDetails?: (id: number) => void;
  toggleLoading: number | null;
}

// Memoized individual card component to prevent unnecessary re-renders
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

  // Get image array if available
  const hasImages = pkg.images && pkg.images.length > 0;

  return (
    <div
      className={`border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow ${
        pkg.isActive ? 'border-gray-100' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="h-40 w-full relative bg-gray-100 overflow-hidden">
        {hasImages ? (
          <PackageImage
            images={pkg.images}
            alt={pkg.name}
            size="large"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">No image available</span>
          </div>
        )}

        {!pkg.isActive && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Inactive
          </div>
        )}

        {pkg.isActive && (
          <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Active
          </div>
        )}
      </div>

      <div className="p-5 xs:p-4 sm:p-4">
        <div className="flex justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-800">{pkg.name}</h3>
          <span className="text-lg font-semibold text-gray-800">₱{formatPrice(pkg.price)}</span>
        </div>

        {/* Category and Cremation Type */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {pkg.category}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {pkg.cremationType}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            {pkg.processingTime}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>

        {/* Inclusions */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Inclusions</h4>
            <ul className="text-xs text-gray-600 pl-4 list-disc line-clamp-2">
              {pkg.inclusions.slice(0, 2).map((inclusion, idx) => (
                <li key={idx}>{inclusion}</li>
              ))}
              {pkg.inclusions.length > 2 && (
                <li className="text-gray-500">+{pkg.inclusions.length - 2} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Add-ons</h4>
            <ul className="text-xs text-gray-600 pl-4 list-disc line-clamp-2">
              {pkg.addOns.slice(0, 2).map((addon, idx) => (
                <li key={idx}>
                  {typeof addon === 'string'
                    ? addon
                    : addon.name + (addon.price ? ` (+₱${formatPrice(addon.price)})` : '')}
                </li>
              ))}
              {pkg.addOns.length > 2 && (
                <li className="text-gray-500">+{pkg.addOns.length - 2} more</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          {/* Action buttons with labels */}
          <div className="flex flex-wrap gap-2">
            {onDetails && (
              <button
                onClick={handleDetails}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
              >
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                Details
              </button>
            )}

            <button
              onClick={handleEdit}
              className="flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>

          {/* Status toggle button */}
          <button
            onClick={handleToggleActive}
            disabled={toggleLoading === pkg.id}
            className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pkg.isActive
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            {toggleLoading === pkg.id ? (
              <div className="h-4 w-4 border-2 border-t-transparent border-current animate-spin rounded-full mr-2"></div>
            ) : pkg.isActive ? (
              <EyeSlashIcon className="h-4 w-4 mr-1" />
            ) : (
              <EyeIcon className="h-4 w-4 mr-1" />
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
    <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6">
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
