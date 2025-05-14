'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ViewColumnsIcon,
  TableCellsIcon,
  TagIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface PackageData {
  id: number;
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  inclusions: string[];
  addOns: string[];
  conditions: string;
  images: string[];
}

interface PackagesPageProps {
  userData?: any;
}

function PackagesPage({ userData }: PackagesPageProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const { showToast } = useToast();

  // No mock data needed anymore as we're using the API

  // Load packages on component mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setIsLoading(true);

        // Get the business ID from userData if available
        const providerId = userData?.business_id;

        if (!providerId) {
          showToast('Unable to determine business ID', 'error');
          setPackages([]);
          setIsLoading(false);
          return;
        }

        // Fetch packages from API
        const response = await fetch(`/api/packages?providerId=${providerId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch packages');
        }

        const data = await response.json();
        setPackages(data.packages || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching packages:', error);
        showToast(error instanceof Error ? error.message : 'Failed to fetch packages', 'error');
        setPackages([]);
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [userData, showToast]);

  // Filter packages based on search term and category
  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || pkg.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Handle package deletion
  const handleDeleteClick = (packageId: number) => {
    setPackageToDelete(packageId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (packageToDelete) {
      try {
        // Delete package via API
        const response = await fetch(`/api/packages/${packageToDelete}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete package');
        }

        // Remove from local state
        setPackages(packages.filter(pkg => pkg.id !== packageToDelete));
        setShowDeleteModal(false);
        setPackageToDelete(null);

        // Show success toast
        showToast('Package deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting package:', error);
        showToast(error instanceof Error ? error.message : 'Failed to delete package', 'error');
      }
    }
  };

  const handleCreatePackage = () => {
    router.push('/cremation/packages/create');
  };

  return (
    <CremationDashboardLayout activePage="packages" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Service Packages</h1>
            <p className="text-gray-600 mt-1">Manage your cremation service packages</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search packages"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            >
              <option value="all">All Categories</option>
              <option value="Private">Private</option>
              <option value="Communal">Communal</option>
            </select>
            <button
              onClick={handleCreatePackage}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Package
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="mt-4 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
                viewMode === 'card'
                  ? 'bg-[var(--primary-green)] text-white border-[var(--primary-green)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]`}
            >
              <ViewColumnsIcon className="h-5 w-5 mr-1" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`relative inline-flex items-center px-3 py-2 rounded-r-md border ${
                viewMode === 'list'
                  ? 'bg-[var(--primary-green)] text-white border-[var(--primary-green)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]`}
            >
              <TableCellsIcon className="h-5 w-5 mr-1" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading packages...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPackages.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto h-24 w-24 text-gray-400 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No packages found</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm || categoryFilter !== 'all'
              ? 'No packages match your search criteria. Try adjusting your filters.'
              : 'Get started by creating your first service package.'}
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreatePackage}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Package
            </button>
          </div>
        </div>
      )}

      {/* List view */}
      {!isLoading && filteredPackages.length > 0 && viewMode === 'list' && (
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
                {filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden">
                          {pkg.images && pkg.images.length > 0 ? (
                            <img src={pkg.images[0]} alt={pkg.name} className="h-10 w-10 object-cover" />
                          ) : (
                            <div className="h-10 w-10 flex items-center justify-center text-gray-400">
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
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
                        onClick={() => router.push(`/cremation/packages/edit/${pkg.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        aria-label={`Edit ${pkg.name}`}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(pkg.id)}
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
      )}

      {/* Card view */}
      {!isLoading && filteredPackages.length > 0 && viewMode === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="relative h-48 bg-gray-200">
                {pkg.images && pkg.images.length > 0 ? (
                  <img
                    src={pkg.images[0]}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pkg.category === 'Private' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {pkg.category}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{pkg.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{pkg.description}</p>

                <div className="flex flex-wrap gap-y-2 mb-4">
                  <div className="w-1/2 flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                    {pkg.processingTime}
                  </div>
                  <div className="w-1/2 flex items-center text-sm text-gray-600">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1 text-gray-400" />
                    ₱{pkg.price.toLocaleString()}
                  </div>
                </div>

                {pkg.inclusions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Inclusions</h4>
                    <ul className="space-y-1">
                      {pkg.inclusions.slice(0, 3).map((inclusion, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <CheckIcon className="h-4 w-4 mr-1 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600 line-clamp-1">{inclusion}</span>
                        </li>
                      ))}
                      {pkg.inclusions.length > 3 && (
                        <li className="text-sm text-gray-500 italic">
                          +{pkg.inclusions.length - 3} more inclusions
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/cremation/packages/edit/${pkg.id}`)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
                  >
                    <PencilSquareIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(pkg.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this package? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(PackagesPage);
