'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import { PackageData } from '@/types/packages';

export interface UsePackagesProps {
  userData?: any;
}

export function usePackages({ userData }: UsePackagesProps) {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<number | null>(null);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const { showToast } = useToast();
  
  // **🔥 FIX: Use useRef to prevent infinite re-renders**
  const showToastRef = useRef(showToast);
  
  // Update ref when showToast changes
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);
  
  // Fetch packages function - stabilize the dependency on userData.business_id
  const providerId = userData?.business_id || userData?.provider_id || 999; // Fallback to 999 for demo

  const fetchPackages = useCallback(async () => {
    try {
      // Log the provider ID for debugging
      console.log('Using provider ID:', providerId);

      // Fetch packages from API
      const response = await fetch(`/api/packages?providerId=${providerId}&includeInactive=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch packages');
      }

      const data = await response.json();

      // Process the packages to ensure add-ons are properly formatted
      const processedPackages = (data.packages || []).map((pkg: any) => {
        // Process add-ons to ensure they're in the correct format
        let processedAddOns = [];

        if (Array.isArray(pkg.addOns)) {
          processedAddOns = pkg.addOns.map((addon: any) => {
            // If it's a string (legacy format)
            if (typeof addon === 'string') {
              // Parse price from string if it exists
              const priceMatch = addon.match(/\(\+₱([\d,]+)\)/);
              let price = null;
              let name = addon;

              if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/,/g, ''));
                name = addon.replace(/\s*\(\+₱[\d,]+\)/, '').trim();
              }

              return { name, price };
            }
            // If it's already an object
            else if (typeof addon === 'object' && addon !== null) {
              return {
                name: addon.name || '',
                price: addon.price !== null && addon.price !== undefined ?
                  (typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price) :
                  null
              };
            }
            // Fallback for any other format
            return { name: String(addon), price: null };
          });
        }

        return {
          ...pkg,
          addOns: processedAddOns
        };
      });

      setPackages(processedPackages);
    } catch (error) {
      // **🔥 FIX: Use ref to avoid dependency issues**
      if (showToastRef.current) {
        showToastRef.current(error instanceof Error ? error.message : 'Failed to fetch packages', 'error');
      }
      setPackages([]);
    }
  }, [providerId]); // **🔥 FIX: Removed showToast from dependencies**

  // Handle package deletion
  const handleDeleteClick = useCallback((packageId: number) => {
    setPackageToDelete(packageId);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (packageToDelete) {
      try {
        // Delete package via API
        const response = await fetch(`/api/packages/${packageToDelete}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete package');
        }

        // Remove from local state
        setPackages(prevPackages => prevPackages.filter(pkg => pkg.id !== packageToDelete));
        setPackageToDelete(null);

        // Return a resolved promise for ConfirmationModal
        return Promise.resolve();
      } catch (error) {
        // **🔥 FIX: Use ref to avoid dependency issues**
        if (showToastRef.current) {
          showToastRef.current(error instanceof Error ? error.message : 'Failed to delete package', 'error');
        }
        // Re-throw the error to let the ConfirmationModal know it failed
        throw error;
      }
    }
  }, [packageToDelete]); // **🔥 FIX: Removed showToast from dependencies**

  const handleToggleActive = useCallback(async (packageId: number, currentActiveState: boolean) => {
    setToggleLoading(packageId);
    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentActiveState }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to update package status: ${response.status}`);
      }

      // Update local state
      setPackages(prevPackages =>
        prevPackages.map(pkg =>
          pkg.id === packageId ? { ...pkg, isActive: !currentActiveState } : pkg
        )
      );

      // **🔥 FIX: Use ref to avoid dependency issues**
      if (showToastRef.current) {
        showToastRef.current(
          result.message || `Package ${!currentActiveState ? 'activated' : 'deactivated'} successfully`,
          'success'
        );
      }
    } catch (error) {
      console.error('Package toggle error:', error);
      // **🔥 FIX: Use ref to avoid dependency issues**
      if (showToastRef.current) {
        showToastRef.current(
          error instanceof Error ? error.message : 'Failed to update package status. Please try again later.', 
          'error'
        );
      }
    } finally {
      setToggleLoading(null);
    }
  }, []); // **🔥 FIX: Removed showToast from dependencies**
  
  // Load packages when fetchPackages function changes
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]); // Include fetchPackages to satisfy exhaustive-deps

  // Filter packages based on search term and category (memoized)
  const filteredPackages = useCallback(() => {
    return packages.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || pkg.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [packages, searchTerm, categoryFilter]);

  return {
    packages,
    isLoading,
    setIsLoading,
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
    filteredPackages: filteredPackages(),
    fetchPackages,
  };
}
