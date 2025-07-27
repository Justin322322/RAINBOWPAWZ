'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ViewColumnsIcon,
  TableCellsIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';

// Import our newly created components and hooks
import { PackageList } from '@/components/packages/PackageList';
import { PackageCards } from '@/components/packages/PackageCards';
import { EmptyState } from '@/components/packages/EmptyState';
import { PackageDetailsModal } from '@/components/packages/PackageDetailsModal';
import PackageModal from '@/components/packages/PackageModal';
import { usePackages } from '@/hooks/usePackages';
import { ViewMode, PackageData } from '@/types/packages';
interface PackagesPageProps {
  userData?: any;
}

function PackagesPage({ userData }: PackagesPageProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<number | undefined>();
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);

  // Toggle confirmation modal states
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [packageToToggle, setPackageToToggle] = useState<{id: number, isActive: boolean, name: string} | null>(null);

  // Use our custom hook for packages data and actions
  const {
    packages,
    isLoading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    showDeleteModal,
    setShowDeleteModal,
    packageToDelete,
    handleDeleteClick,
    confirmDelete,
    toggleLoading,
    handleToggleActive,
    filteredPackages,
    fetchPackages,
  } = usePackages({ userData });

  // Modal handlers
  const handleEditPackage = useCallback((packageId: number) => {
    setEditingPackageId(packageId);
    setShowEditModal(true);
  }, []);

  const handleCreatePackage = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleModalSuccess = useCallback(() => {
    // Refresh packages list to show updated data including images
    fetchPackages();
  }, [fetchPackages]);

  const handleDetailsPackage = useCallback((packageId: number) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setSelectedPackage(pkg);
      setShowDetailsModal(true);
    }
  }, [packages]);

  const handleCloseModals = useCallback(() => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailsModal(false);
    setEditingPackageId(undefined);
    setSelectedPackage(null);
  }, []);

  // Handle toggle with confirmation
  const handleToggleWithConfirmation = useCallback((packageId: number, isActive: boolean) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setPackageToToggle({
        id: packageId,
        isActive: isActive,
        name: pkg.name
      });
      setShowToggleModal(true);
    }
  }, [packages]);

  const confirmToggle = useCallback(async () => {
    if (packageToToggle) {
      await handleToggleActive(packageToToggle.id, packageToToggle.isActive);
      setPackageToToggle(null);
    }
  }, [packageToToggle, handleToggleActive]);

  // Check if filters are applied (for empty state messaging)
  const hasFiltersApplied = searchTerm !== '' || categoryFilter !== 'all';

  // Check if user has a business ID before loading packages
  useEffect(() => {
    if (userData) {
      if (!userData.business_id) {
        // Show toast if business ID is missing
        toast.error(
          'Unable to determine business ID. Please try logging out and logging back in.',
          { duration: 5000 }
        );
      }
    }
  }, [userData]);

  return (
    <CremationDashboardLayout activePage="packages" userData={userData}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
                aria-label="Search packages"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="Private">Private</option>
              <option value="Communal">Communal</option>
            </select>
            <button
              onClick={handleCreatePackage}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
              disabled={isCreatingPackage}
              aria-label="Create new package"
            >
              {isCreatingPackage ? (
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
              ) : (
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              )}
              {isCreatingPackage ? 'Creating...' : 'Create Package'}
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="mt-4 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="View mode selection">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
                viewMode === 'card'
                  ? 'bg-[var(--primary-green)] text-white border-[var(--primary-green)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]`}
              aria-pressed={viewMode === 'card'}
              aria-label="Card view"
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
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              <TableCellsIcon className="h-5 w-5 mr-1" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <LoadingSpinner
          message="Loading packages..."
          className="py-8"
        />
      )}

      {/* Empty state - using our EmptyState component */}
      {!isLoading && filteredPackages.length === 0 && (
        <EmptyState
          hasFilters={hasFiltersApplied}
          onCreatePackage={handleCreatePackage}
          isCreatingPackage={isCreatingPackage}
          onRefresh={() => {
            setSearchTerm('');
            setCategoryFilter('all');
          }}
        />
      )}

      {/* List view - using our PackageList component */}
      {!isLoading && filteredPackages.length > 0 && viewMode === 'list' && (
        <PackageList
          packages={filteredPackages}
          onEdit={handleEditPackage}
          onDelete={handleDeleteClick}
          onDetails={handleDetailsPackage}
          onToggleActive={handleToggleWithConfirmation}
          toggleLoading={toggleLoading}
        />
      )}

      {/* Card view - using our PackageCards component */}
      {!isLoading && filteredPackages.length > 0 && viewMode === 'card' && (
        <PackageCards
          packages={filteredPackages}
          onEdit={handleEditPackage}
          onDelete={handleDeleteClick}
          onDetails={handleDetailsPackage}
          onToggleActive={handleToggleWithConfirmation}
          toggleLoading={toggleLoading}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the package "${packages.find(pkg => pkg.id === packageToDelete)?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        icon={<TrashIcon className="h-6 w-6 text-red-600" />}
      />

      {/* Create Package Modal */}
      <PackageModal
        isOpen={showCreateModal}
        onClose={handleCloseModals}
        onSuccess={handleModalSuccess}
        mode="create"
      />

      {/* Edit Package Modal */}
      <PackageModal
        isOpen={showEditModal}
        onClose={handleCloseModals}
        onSuccess={handleModalSuccess}
        mode="edit"
        packageId={editingPackageId}
      />

      {/* Package Details Modal */}
      <PackageDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseModals}
        package={selectedPackage}
      />

      {/* Toggle Status Confirmation Modal */}
      <ConfirmationModal
        isOpen={showToggleModal}
        onClose={() => setShowToggleModal(false)}
        onConfirm={confirmToggle}
        title={packageToToggle?.isActive ? "Deactivate Package" : "Activate Package"}
        message={
          packageToToggle ? (
            <div>
              <p className="mb-2">
                Are you sure you want to {packageToToggle.isActive ? 'deactivate' : 'activate'} the package <strong>"{packageToToggle.name}"</strong>?
              </p>
              <p className="text-sm text-gray-600">
                {packageToToggle.isActive
                  ? "Deactivating this package will hide it from customers and prevent new bookings."
                  : "Activating this package will make it visible to customers for booking."
                }
              </p>
            </div>
          ) : (
            "Are you sure you want to change this package status?"
          )
        }
        confirmText={packageToToggle?.isActive ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        variant={packageToToggle?.isActive ? "warning" : "success"}
        icon={packageToToggle?.isActive ?
          <EyeSlashIcon className="h-6 w-6 text-amber-600" /> :
          <EyeIcon className="h-6 w-6 text-green-600" />
        }
        successMessage={`Package ${packageToToggle?.isActive ? 'deactivated' : 'activated'} successfully!`}
      />
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(PackagesPage);
