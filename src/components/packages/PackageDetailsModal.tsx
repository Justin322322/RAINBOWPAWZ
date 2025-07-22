'use client';

import React from 'react';
import { PackageData } from '@/types/packages';
import { Modal } from '@/components/ui';
import { PackageImage } from './PackageImage';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: PackageData | null;
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  isOpen,
  onClose,
  package: pkg
}) => {
  if (!pkg) return null;

  const hasImages = pkg.images && pkg.images.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">{pkg.name}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              pkg.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {pkg.isActive ? (
                <>
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <XCircleIcon className="h-3 w-3 mr-1" />
                  Inactive
                </>
              )}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Images and Basic Info */}
            <div className="space-y-6">
              {/* Package Images */}
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                {hasImages ? (
                  <PackageImage
                    images={pkg.images}
                    alt={pkg.name}
                    size="large"
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">No image available</span>
                  </div>
                )}
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">Price</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900 mt-1">₱{pkg.price.toLocaleString()}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-900">Processing</span>
                  </div>
                  <p className="text-lg font-semibold text-purple-900 mt-1">{pkg.processingTime}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{pkg.description}</p>
              </div>

              {/* Categories and Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Details</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <TagIcon className="h-4 w-4 mr-1" />
                    {pkg.category}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {pkg.cremationType}
                  </span>
                </div>
              </div>

              {/* Inclusions */}
              {pkg.inclusions && pkg.inclusions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">What's Included</h3>
                  <ul className="space-y-2">
                    {pkg.inclusions.map((inclusion, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{inclusion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Add-ons */}
              {pkg.addOns && pkg.addOns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Add-ons</h3>
                  <ul className="space-y-2">
                    {pkg.addOns.map((addon, idx) => (
                      <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                          {typeof addon === 'string' ? addon : addon.name}
                        </span>
                        {typeof addon !== 'string' && addon.price && (
                          <span className="text-sm font-medium text-gray-900">
                            +₱{addon.price.toLocaleString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conditions */}
              {pkg.conditions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{pkg.conditions}</p>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
