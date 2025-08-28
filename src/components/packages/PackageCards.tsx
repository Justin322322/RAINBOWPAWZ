'use client';

import React, { useCallback, useState } from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/utils/numberUtils';

interface PackageCardsProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDetails?: (id: number) => void;
  toggleLoading: number | null;
}

// Professional Image Carousel Component
const ImageCarousel = React.memo<{ images: string[]; alt: string }>(({ images, alt }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl flex flex-col items-center justify-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">No images available</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-56 bg-gray-100 rounded-t-xl overflow-hidden group">
      <PackageImage
        images={[images[currentIndex]]}
        alt={alt}
        size="large"
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Image Count Badge */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
});

ImageCarousel.displayName = 'ImageCarousel';

// Inclusion Image Carousel Component
const InclusionImageCarousel = React.memo<{ inclusions: any[] }>(({ inclusions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get all inclusions with images
  const inclusionsWithImages = inclusions.filter((inc: any) =>
    typeof inc !== 'string' && inc.image
  );

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % inclusionsWithImages.length);
  }, [inclusionsWithImages.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + inclusionsWithImages.length) % inclusionsWithImages.length);
  }, [inclusionsWithImages.length]);

  if (inclusionsWithImages.length === 0) return null;

  const currentInclusion = inclusionsWithImages[currentIndex];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
          Package Includes
        </h4>
        {inclusionsWithImages.length > 1 && (
          <div className="text-xs text-gray-500">
            {currentIndex + 1} of {inclusionsWithImages.length}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          {/* Image Section */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
              <PackageImage
                images={[currentInclusion.image]}
                alt={currentInclusion.description}
                size="small"
                className="w-full h-full object-cover"
              />
            </div>

            {inclusionsWithImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
                >
                  <ChevronLeftIcon className="h-3 w-3 text-gray-600" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
                >
                  <ChevronRightIcon className="h-3 w-3 text-gray-600" />
                </button>
              </>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {currentInclusion.description}
            </p>
            <div className="flex gap-1">
              {inclusionsWithImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

InclusionImageCarousel.displayName = 'InclusionImageCarousel';

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

  // Get counts for display
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
      className={`bg-white border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${
        pkg.isActive
          ? 'border-gray-200 hover:border-gray-300'
          : 'border-red-200 bg-red-50/50 hover:border-red-300'
      }`}
    >
      {/* Professional Image Carousel */}
      <ImageCarousel images={pkg.images || []} alt={pkg.name} />

      {/* Status Badge */}
      <div className="px-6 -mt-6 relative z-10">
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
          pkg.isActive
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {pkg.isActive ? '✓ Active' : '✗ Inactive'}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header with price badge */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 leading-tight flex-1 pr-4">{pkg.name}</h3>
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg">
            <span className="text-lg font-bold">₱{formatPrice(pkg.price)}</span>
          </div>
        </div>

        {/* Professional Tags */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
            📂 {pkg.category}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm">
            🔥 {pkg.cremationType}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
            ⏱️ {pkg.processingTime}
          </span>
        </div>

        {/* Enhanced Description */}
        <div className="mb-5">
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{pkg.description}</p>
        </div>

        {/* Inclusion Image Carousel */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <InclusionImageCarousel inclusions={pkg.inclusions} />
        )}

        {/* Enhanced Inclusions List */}
        {pkg.inclusions && pkg.inclusions.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                All Inclusions ({inclusionCount})
              </h4>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <InclusionList />
            </div>
          </div>
        )}

        {/* Enhanced Add-ons */}
        {pkg.addOns && pkg.addOns.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center">
                <span className="text-amber-500 mr-2">✨</span>
                Available Add-ons ({addOnCount})
              </h4>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
              <AddOnList />
            </div>
          </div>
        )}

        {/* Professional Action Buttons */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {onDetails && (
              <button
                onClick={handleDetails}
                className="flex items-center justify-center px-5 py-3 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl border border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                View Full Details
              </button>
            )}

            <button
              onClick={handleEdit}
              className="flex items-center justify-center px-5 py-3 text-sm font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl border border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Package
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center px-5 py-3 text-sm font-semibold text-red-700 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 rounded-xl border border-red-300 transition-all duration-200 shadow-sm hover:shadow-md flex-1"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete
            </button>

            <button
              onClick={handleToggleActive}
              disabled={toggleLoading === pkg.id}
              className={`flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md flex-1 ${
                pkg.isActive
                  ? 'text-red-700 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-red-300'
                  : 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 border-green-300'
              }`}
            >
              {toggleLoading === pkg.id ? (
                <div className="h-5 w-5 border-2 border-t-transparent border-current animate-spin rounded-full mr-2"></div>
              ) : pkg.isActive ? (
                <EyeSlashIcon className="h-5 w-5 mr-2" />
              ) : (
                <EyeIcon className="h-5 w-5 mr-2" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8">
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
