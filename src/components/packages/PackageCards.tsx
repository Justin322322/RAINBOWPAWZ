'use client';

import React, { useCallback } from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
  const inclusionCount = Array.isArray(pkg.inclusions) ? pkg.inclusions.length : 0;
  const addOnCount = Array.isArray(pkg.addOns) ? pkg.addOns.length : 0;

  // Simple inclusion display component
  const InclusionList = () => {
    if (!pkg.inclusions || pkg.inclusions.length === 0) return null;

    const displayItems = pkg.inclusions.slice(0, 3); // Show only first 3 items
    const remainingCount = inclusionCount - 3;

    return (
      <div className="space-y-2">
        {displayItems.map((inc, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
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
  };

  // Simple add-on display component
  const AddOnList = () => {
    if (!pkg.addOns || pkg.addOns.length === 0) return null;

    const displayItems = pkg.addOns.slice(0, 2); // Show only first 2 items
    const remainingCount = addOnCount - 2;

    return (
      <div className="space-y-1">
        {displayItems.map((addon, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 truncate">
              {typeof addon === 'string' ? addon : addon.name}
            </span>
            {typeof addon !== 'string' && addon.price && (
              <span className="text-gray-800 font-medium ml-2">
                +₱{formatPrice(addon.price)}
              </span>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-gray-500 font-medium">
            +{remainingCount} more add-on{remainingCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
        pkg.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
      }`}
    >
      {/* Header with image and status */}
      <div className="relative">
        <div className="h-48 w-full bg-gray-100 overflow-hidden">
          {hasImages ? (
            <PackageImage
              images={pkg.images}
              alt={pkg.name}
              size="large"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">No image</span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            pkg.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {pkg.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Header with name and price */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 leading-tight pr-2">{pkg.name}</h3>
          <span className="text-xl font-bold text-gray-900 flex-shrink-0">₱{formatPrice(pkg.price)}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {pkg.category}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            {pkg.cremationType}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {pkg.processingTime}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">{pkg.description}</p>

        {/* Inclusions */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1.5" />
              What&apos;s included
            </h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <InclusionList />
            </div>
          </div>
        )}

        {/* Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Add-ons</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <AddOnList />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            {onDetails && (
              <button
                onClick={handleDetails}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors"
              >
                <InformationCircleIcon className="h-4 w-4 mr-2" />
                View Details
              </button>
            )}

            <button
              onClick={handleEdit}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors flex-1"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>

            <button
              onClick={handleToggleActive}
              disabled={toggleLoading === pkg.id}
              className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex-1 ${
                pkg.isActive
                  ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                  : 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200'
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
