'use client';

import React from 'react';
import { PackageData } from '@/types/packages';
import { PackageImage } from './PackageImage';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PackageListProps {
  packages: PackageData[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export const PackageList: React.FC<PackageListProps> = ({
  packages,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PackageImage 
                      src={pkg.images?.[0]} 
                      alt={pkg.name} 
                      size="small"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{pkg.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pkg.category === 'Private' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {pkg.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pkg.processingTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₱{pkg.price.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(pkg.id)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                    aria-label={`Edit ${pkg.name}`}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(pkg.id)}
                    className="text-red-600 hover:text-red-900"
                    aria-label={`Delete ${pkg.name}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
