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
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
        <div className="w-12 h-12 bg-gray-200 rounded-lg mb-2" />
        <span className="text-xs text-gray-500">No image</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden">
      <PackageImage images={images} alt={alt} size="large" className="w-full h-full object-cover" />
    </div>
  );
});

PackageImageDisplay.displayName = 'PackageImageDisplay';

// Redesigned package card component (inspired by HTML mockup)
const PackageCard: React.FC<{
  pkg: PackageData;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  toggleLoading: number | null;
}> = React.memo(({ pkg, onEdit, onDelete, onToggleActive, toggleLoading }) => {
  const handleEdit = useCallback(() => onEdit(pkg.id), [onEdit, pkg.id]);
  const handleDelete = useCallback(() => onDelete(pkg.id), [onDelete, pkg.id]);
  // Toggle to the opposite of current active state when calling handler
  const handleToggleActive = useCallback(() => onToggleActive(pkg.id, !pkg.isActive), [onToggleActive, pkg.id, pkg.isActive]);

  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const addOns = Array.isArray(pkg.addOns) ? pkg.addOns : [];

  const InclusionItem: React.FC<{ inclusion: any }> = ({ inclusion }) => {
    const desc = typeof inclusion === 'string' ? inclusion : inclusion?.description ?? '';
    return (
      <div className="flex items-center text-sm text-gray-700">
        <span className="flex items-center justify-center w-5 h-5 rounded bg-green-50 text-green-700 border border-green-200 mr-2">✓</span>
        <span className="line-clamp-1">{desc}</span>
      </div>
    );
  };

  const AddOnItem: React.FC<{ addon: any }> = ({ addon }) => {
    const name = typeof addon === 'string' ? addon : addon?.name ?? '';
    const price = typeof addon === 'string' ? 0 : Number(addon?.price ?? 0);
    return (
      <div className="flex items-center justify-between text-sm border border-gray-200 rounded-lg px-3 py-2">
        <span className="text-gray-700 line-clamp-1">{name}</span>
        <span className="text-gray-900 font-semibold">+₱{price.toLocaleString()}</span>
      </div>
    );
  };

  return (
    <article className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all">
      {/* Image + status */}
      <div className="relative aspect-video">
        <PackageImageDisplay images={pkg.images || []} alt={pkg.name} />

        <div className="absolute top-3 right-3">
          <div
            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm border ${
              pkg.isActive
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mr-1 ${pkg.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {pkg.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & price */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">{pkg.name}</h3>
        <p className="text-2xl font-extrabold text-gray-900 mb-3">₱{formatPrice(pkg.price)}</p>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{pkg.category}</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{pkg.cremationType}</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{pkg.processingTime}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-5 line-clamp-2">{pkg.description}</p>

        {/* Inclusions */}
        {inclusions.length > 0 && (
          <div className="border-t border-dashed border-gray-200 pt-4 mb-5">
            <h4 className="text-xs font-semibold uppercase text-gray-700 mb-2">What&apos;s included</h4>
            <div className="space-y-2">
              {inclusions.slice(0, 3).map((inclusion, idx) => (
                <InclusionItem key={idx} inclusion={inclusion} />
              ))}
              {inclusions.length > 3 && <div className="text-xs text-gray-500 pl-6">+{inclusions.length - 3} more items</div>}
            </div>
          </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="border-t border-dashed border-gray-200 pt-4 mb-6">
            <h4 className="text-xs font-semibold uppercase text-gray-700 mb-2">Available add-ons</h4>
            <div className="space-y-2">
              {addOns.slice(0, 2).map((addon, idx) => (
                <AddOnItem key={idx} addon={addon} />
              ))}
              {addOns.length > 2 && <div className="text-xs text-gray-500">+{addOns.length - 2} more add-ons</div>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleEdit}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>

        <button
          onClick={handleToggleActive}
          disabled={toggleLoading === pkg.id}
          className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
            pkg.isActive ? 'text-orange-700 bg-orange-100 hover:bg-orange-200' : 'text-white bg-green-600 hover:bg-green-700'
          }`}
        >
          {toggleLoading === pkg.id ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : pkg.isActive ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          <span>{pkg.isActive ? 'Deactivate' : 'Activate'}</span>
        </button>
      </div>
    </article>
  );
});

PackageCard.displayName = 'PackageCard';

export const PackageCards: React.FC<PackageCardsProps> = ({ packages, onEdit, onDelete, onToggleActive, toggleLoading }) => {
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
