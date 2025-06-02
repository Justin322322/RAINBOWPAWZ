'use client';

import { useState, useEffect } from 'react';

export interface AddOn {
  id?: number;
  name: string;
  price: number;
  isSelected?: boolean;
  isCustomPrice?: boolean;
}

interface AddOnSelectorProps {
  packageId: number;
  selectedAddOns: AddOn[];
  onAddOnsChange: (addOns: AddOn[]) => void;
  onTotalPriceChange?: (addOnsTotalPrice: number) => void;
}

export default function AddOnSelector({
  packageId,
  selectedAddOns,
  onAddOnsChange,
  onTotalPriceChange
}: AddOnSelectorProps) {
  const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  // Custom add-on feature removed
  const [error, setError] = useState<string | null>(null);

  // Fetch available add-ons for the package
  useEffect(() => {
    const fetchAddOns = async () => {
      if (!packageId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/packages/${packageId}/addons`);

        if (!response.ok) {
          throw new Error('Failed to fetch add-ons');
        }

        const data = await response.json();

        if (data.success) {
          // Map the add-ons to our format, handle empty arrays gracefully
          const addOns = (data.addOns || []).map((addon: any) => ({
            id: addon.id,
            name: addon.description || addon.name, // Support both formats
            price: parseFloat(addon.price) || 0,
            isSelected: false,
            isCustomPrice: false
          }));

          setAvailableAddOns(addOns);
          // Clear any previous errors when successful
          setError(null);
        } else {
          setError(data.error || 'Failed to load add-ons');
          setAvailableAddOns([]);
        }
      } catch (error) {
        // Only show error for actual network/server errors, not empty results
        console.warn('Add-ons loading error:', error);
        setError('Error loading add-ons. Please try again.');
        setAvailableAddOns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAddOns();
  }, [packageId]);

  // Calculate total price of selected add-ons
  useEffect(() => {
    if (onTotalPriceChange) {
      const totalPrice = selectedAddOns.reduce((total, addon) => total + addon.price, 0);
      onTotalPriceChange(totalPrice);
    }
  }, [selectedAddOns, onTotalPriceChange]);

  // Handle add-on selection
  const handleAddOnSelect = (addon: AddOn, isSelected: boolean) => {
    const updatedAddOns = [...selectedAddOns];

    if (isSelected) {
      // Add the add-on if it's not already selected
      if (!updatedAddOns.some(a => a.id === addon.id && a.name === addon.name)) {
        updatedAddOns.push({ ...addon, isSelected: true });
      }
    } else {
      // Remove the add-on
      const index = updatedAddOns.findIndex(a => a.id === addon.id && a.name === addon.name);
      if (index !== -1) {
        updatedAddOns.splice(index, 1);
      }
    }

    onAddOnsChange(updatedAddOns);
  };

  // Custom price change feature removed

  // Custom add-on feature removed

  // Custom add-on removal feature removed

  // Format price as PHP
  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Add-ons (Optional)</h3>

      {loading ? (
        <div className="py-4 text-center text-sm text-gray-500">
          Loading available add-ons...
        </div>
      ) : error ? (
        <div className="py-4 text-center text-sm text-red-500">
          {error}
        </div>
      ) : availableAddOns.length === 0 && selectedAddOns.length === 0 ? (
        <div className="py-4 text-center text-sm text-gray-500">
          No add-ons available for this package
        </div>
      ) : (
        <div className="space-y-3">
          {/* Available add-ons */}
          {availableAddOns.map((addon) => {
            const isSelected = selectedAddOns.some(a => a.id === addon.id && a.name === addon.name);

            return (
              <div key={addon.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`addon-${addon.id}`}
                    checked={isSelected}
                    onChange={(e) => handleAddOnSelect(addon, e.target.checked)}
                    className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300 rounded"
                  />
                  <label htmlFor={`addon-${addon.id}`} className="ml-2 block text-sm text-gray-700">
                    {addon.name} <span className="text-[var(--primary-green)]">({formatPrice(addon.price)})</span>
                  </label>
                </div>

                {/* Custom price input removed */}
              </div>
            );
          })}

          {/* Custom add-ons section removed */}

          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
