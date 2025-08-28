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
  toggleLoading?: number | null;
}

export const PackageList: React.FC<PackageListProps> = ({
  packages,
  onEdit,
  onDelete,
  onToggleActive,
  toggleLoading
}) => {
  // Helper function to get category badge styling
  const getCategoryBadge = (category: string) => {
    switch(category.toLowerCase()) {
      case 'private':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'communal':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'premium':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'memorial':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'service':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Package
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Memorial Services
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {packages.map((pkg) => {
              const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
              const addOns = Array.isArray(pkg.addOns) ? pkg.addOns : [];

              return (
                <tr key={pkg.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-16 relative rounded-lg overflow-hidden">
                        <PackageImage
                          images={pkg.images}
                          alt={pkg.name}
                          size="small"
                          className="h-16 w-16 object-cover"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{pkg.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{pkg.description}</div>
                        {inclusions.length > 0 && (
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                            {inclusions.length} inclusions
                          </div>
                        )}
                        {addOns.length > 0 && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                            {addOns.length} add-ons
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                          getCategoryBadge(pkg.category)
                        }`}>
                          {pkg.category}
                        </span>
                      </div>
                      <div className="text-gray-600">{pkg.cremationType}</div>
                      <div className="text-gray-600">{pkg.processingTime}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900">₱{pkg.price.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pkg.isActive ? (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800">
                        <EyeSlashIcon className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-3">
                      <button
                        onClick={() => onEdit(pkg.id)}
                        className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        Edit
                      </button>

                      <button
                        onClick={() => onDelete(pkg.id)}
                        className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
                      >
                        <TrashIcon className="h-3 w-3 mr-1" />
                        Delete
                      </button>

                      {onToggleActive && (
                        <button
                          onClick={() => onToggleActive(pkg.id, pkg.isActive)}
                          disabled={toggleLoading === pkg.id}
                          className={`inline-flex items-center px-3 py-2 text-xs font-medium border border-transparent rounded-md transition-colors ${
                            pkg.isActive
                              ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                              : 'text-white bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {toggleLoading === pkg.id ? (
                            <div className="animate-spin h-3 w-3 mr-1 border-2 border-current border-t-transparent rounded-full"></div>
                          ) : pkg.isActive ? (
                            <EyeSlashIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {pkg.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
