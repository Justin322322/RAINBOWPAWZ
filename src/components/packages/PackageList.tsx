'use client';

import React from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';


interface PackageListProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive?: (id: number, isActive: boolean) => void;
  onDetails?: (id: number) => void;
  toggleLoading?: number | null;
}

export const PackageList: React.FC<PackageListProps> = ({
  packages,
  onEdit,
  onDelete,
  onToggleActive,
  onDetails,
  toggleLoading
}) => {
  // Helper function to get category badge styling
  const getCategoryBadge = (category: string) => {
    switch(category.toLowerCase()) {
      case 'private':
        return 'bg-green-100 text-green-800';
      case 'communal':
        return 'bg-blue-100 text-blue-800';
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'memorial':
        return 'bg-amber-100 text-amber-800';
      case 'service':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 rounded-t-2xl">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Package
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Processing Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.map((pkg) => (
              <tr key={pkg.id} className={`hover:bg-gray-50 ${!pkg.isActive ? 'bg-gray-50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 relative rounded-md overflow-hidden">
                      <PackageImage
                        images={pkg.images}
                        alt={pkg.name}
                        size="small"
                        className="h-12 w-12 object-cover"
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{pkg.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-2xl ${
                    getCategoryBadge(pkg.category)
                  }`}>
                    {pkg.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pkg.processingTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ₱{pkg.price.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {pkg.isActive ? (
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-2xl bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-2xl bg-gray-100 text-gray-800">
                      <EyeSlashIcon className="h-4 w-4 mr-1" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-2">
                    {onDetails && (
                      <button
                        onClick={() => onDetails(pkg.id)}
                        className="inline-flex items-center px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-colors"
                      >
                        Details
                      </button>
                    )}

                    <button
                      onClick={() => onEdit(pkg.id)}
                      className="inline-flex items-center px-3 py-1 text-xs text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-2xl transition-colors"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>

                    <button
                      onClick={() => onDelete(pkg.id)}
                      className="inline-flex items-center px-3 py-1 text-xs text-red-600 hover:text-red-900 hover:bg-red-50 rounded-2xl transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>

                    {onToggleActive && (
                      <button
                        onClick={() => onToggleActive(pkg.id, pkg.isActive)}
                        disabled={toggleLoading === pkg.id}
                        className={`inline-flex items-center px-3 py-1 text-xs rounded-2xl transition-colors ${
                          pkg.isActive
                            ? 'text-amber-600 hover:text-amber-900 hover:bg-amber-50'
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                      >
                        {toggleLoading === pkg.id ? (
                          <div className="animate-spin h-4 w-4 mr-1 border-2 border-current border-t-transparent rounded-full"></div>
                        ) : pkg.isActive ? (
                          <EyeSlashIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                        )}
                        {pkg.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
