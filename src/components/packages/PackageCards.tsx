'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
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
  const scrollRow = (rowId: string, direction: 1 | -1) => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById(rowId);
    if (!el) return;
    const amount = Math.max(200, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  // Get image array if available
  const hasImages = pkg.images && pkg.images.length > 0;
  const inclusionCount = Array.isArray(pkg.inclusions) ? pkg.inclusions.length : 0;
  const addOnCount = Array.isArray(pkg.addOns) ? pkg.addOns.length : 0;

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

      <div className="p-4">
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
            <h4 className="text-xs font-semibold text-gray-700 tracking-wide mb-2">Inclusions</h4>
            <div className="relative">
              {inclusionCount > 1 && (
              <button type="button" aria-label="Scroll inclusions left" onClick={() => scrollRow(`card-inc-${pkg.id}`, -1)} className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-white border shadow hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-700"><path fillRule="evenodd" d="M12.78 4.22a.75.75 0 010 1.06L8.56 9.5l4.22 4.22a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
              </button>
              )}
              <div id={`card-inc-${pkg.id}`} className={`flex gap-2 py-1 ${inclusionCount > 1 ? 'overflow-x-auto no-scrollbar snap-x snap-mandatory' : 'justify-center'}`}>
                {pkg.inclusions.slice(0, 8).map((inclusion: any, idx) => {
                  const desc = typeof inclusion === 'string' ? inclusion : inclusion.description;
                  const image = typeof inclusion === 'string' ? undefined : inclusion.image;
                  return (
                    <div key={idx} className="flex-shrink-0 snap-start w-40 flex items-center gap-2 bg-white rounded-md border p-2">
                      {image && (
                        <Image src={image} alt="inc" width={48} height={48} className="h-12 w-12 rounded object-cover border" unoptimized />
                      )}
                      <span className="text-xs text-gray-700 line-clamp-2">{desc}</span>
                    </div>
                  );
                })}
              </div>
              {inclusionCount > 1 && (
              <button type="button" aria-label="Scroll inclusions right" onClick={() => scrollRow(`card-inc-${pkg.id}`, 1)} className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-white border shadow hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-700 transform rotate-180"><path fillRule="evenodd" d="M12.78 4.22a.75.75 0 010 1.06L8.56 9.5l4.22 4.22a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
              </button>
              )}
            </div>
          </div>
        )}

        {/* Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-700 tracking-wide mb-2">Add-ons</h4>
            <div className="relative">
              {addOnCount > 1 && (
              <button type="button" aria-label="Scroll add-ons left" onClick={() => scrollRow(`card-addon-${pkg.id}`, -1)} className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-white border shadow hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-700"><path fillRule="evenodd" d="M12.78 4.22a.75.75 0 010 1.06L8.56 9.5l4.22 4.22a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
              </button>
              )}
              <div id={`card-addon-${pkg.id}`} className={`flex gap-2 py-1 ${addOnCount > 1 ? 'overflow-x-auto no-scrollbar snap-x snap-mandatory' : 'justify-center'}`}>
                {pkg.addOns.slice(0, 8).map((addon: any, idx) => {
                  const name = typeof addon === 'string' ? addon : addon.name;
                  const price = typeof addon === 'string' ? undefined : addon.price;
                  const image = typeof addon === 'string' ? undefined : addon.image;
                  return (
                    <div key={idx} className="flex-shrink-0 snap-start w-44 flex items-center gap-2 bg-white rounded-md border p-2">
                      {image && (
                        <Image src={image} alt="addon" width={48} height={48} className="h-12 w-12 rounded object-cover border" unoptimized />
                      )}
                      <span className="text-xs text-gray-700 line-clamp-2">
                        {name}{price ? ` (+₱${formatPrice(price)})` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              {addOnCount > 1 && (
              <button type="button" aria-label="Scroll add-ons right" onClick={() => scrollRow(`card-addon-${pkg.id}`, 1)} className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-white border shadow hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-700 transform rotate-180"><path fillRule="evenodd" d="M12.78 4.22a.75.75 0 010 1.06L8.56 9.5l4.22 4.22a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
              </button>
              )}
            </div>
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
