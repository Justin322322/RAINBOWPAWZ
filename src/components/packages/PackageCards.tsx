'use client';

import React, { useEffect } from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PackageCardsProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  toggleLoading: number | null;
}

export const PackageCards: React.FC<PackageCardsProps> = ({
  packages,
  onEdit,
  onDelete,
  onToggleActive,
  toggleLoading
}) => {
  // Add debug logging to check packages data
  useEffect(() => {
    console.log('Packages data received:', packages);
    packages.forEach(pkg => {
      console.log(`Package ${pkg.id} (${pkg.name}) has ${pkg.images?.length || 0} images:`, pkg.images);
    });
  }, [packages]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => {
        // Get image array if available
        const hasImages = pkg.images && pkg.images.length > 0;
        
        return (
          <div 
            key={pkg.id} 
            className={`border rounded-lg overflow-hidden transition-all duration-300 ${
              pkg.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'
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
            </div>
          
            <div className="p-4">
              <div className="flex justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-800">{pkg.name}</h3>
                <span className="text-lg font-semibold text-gray-800">₱{pkg.price.toLocaleString()}</span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(pkg.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Edit Package"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => onDelete(pkg.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Package"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <button
                  onClick={() => onToggleActive(pkg.id, pkg.isActive)}
                  disabled={toggleLoading === pkg.id}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                    pkg.isActive 
                      ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  title={pkg.isActive ? "Deactivate Package" : "Activate Package"}
                >
                  {toggleLoading === pkg.id ? (
                    <div className="h-4 w-4 border-2 border-t-transparent border-green-700 animate-spin rounded-full mr-2"></div>
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
      })}
    </div>
  );
};
