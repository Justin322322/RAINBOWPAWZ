'use client';

import React from 'react';
import { PackageData } from '@/types/packages';
import { Modal } from '@/components/ui';
import { PackageImage } from './PackageImage';
import { formatPrice } from '@/utils/numberUtils';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon,
  SparklesIcon,
  InformationCircleIcon
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={pkg.name}
      headerContent={
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
            pkg.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {pkg.isActive ? (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                Active
              </>
            ) : (
              <>
                <XCircleIcon className="h-4 w-4 mr-1.5" />
                Inactive
              </>
            )}
          </span>
          {pkg.isActive && (
            <span className="text-xs text-green-600 font-medium">
              Available for booking
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Images and Quick Info */}
          <div className="space-y-6">
            {/* Package Images */}
            <div className="rounded-lg overflow-hidden bg-gray-50">
              {hasImages ? (
                <PackageImage
                  images={pkg.images}
                  alt={pkg.name}
                  size="large"
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">No image available</span>
                </div>
              )}
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">Price</span>
                </div>
                <p className="text-xl font-bold text-blue-900">₱{formatPrice(pkg.price)}</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center mb-2">
                  <ClockIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-900">Processing</span>
                </div>
                <p className="text-xl font-bold text-purple-900">{pkg.processingTime}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Description Section */}
            <div>
              <div className="flex items-center mb-3">
                <DocumentTextIcon className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Description</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{pkg.description}</p>
            </div>

            {/* Service Details Section */}
            <div>
              <div className="flex items-center mb-3">
                <InformationCircleIcon className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800">
                  <TagIcon className="h-4 w-4 mr-1" />
                  {pkg.category}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-800">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  {pkg.cremationType}
                </span>
              </div>
            </div>

            {/* What's Included Section */}
            {pkg.inclusions && pkg.inclusions.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">What's Included</h3>
                </div>
                <div className="space-y-2">
                  {pkg.inclusions.map((inclusion, idx) => (
                    <div key={idx} className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{inclusion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Add-ons Section */}
            {pkg.addOns && pkg.addOns.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center mb-3">
                  <SparklesIcon className="h-5 w-5 text-amber-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Available Add-ons</h3>
                </div>
                <div className="space-y-2">
                  {pkg.addOns.map((addon, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                      <div className="flex items-center">
                        <span className="text-amber-600 text-sm mr-2">+</span>
                        <span className="text-gray-700">
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
                </div>
              </div>
            )}

            {/* Terms & Conditions Section */}
            {pkg.conditions && (
              <div>
                <div className="flex items-center mb-3">
                  <DocumentTextIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-700 text-sm leading-relaxed">{pkg.conditions}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
