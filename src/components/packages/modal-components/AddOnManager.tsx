'use client';

import React, { useRef, useState } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface AddOn {
  name: string;
  price: number;
  image?: string;
}

interface AddOnSuggestion {
  name: string;
  price: number;
}

interface AddOnManagerProps {
  addOns: AddOn[];
  newAddOn: string;
  newAddOnPrice: string;
  addOnSuggestions: AddOnSuggestion[];
  isLoadingSuggestions: boolean;
  isAddOnInputFocused: boolean;
  onNewAddOnChange: (value: string) => void;
  onNewAddOnPriceChange: (value: string) => void;
  onAddAddOn: () => void;
  onRemoveAddOn: (index: number) => void;
  onUploadAddonImage: (index: number, file: File) => void;
  onReorderAddOns: (fromIndex: number, toIndex: number) => void;
  onAddOnInputFocus: () => void;
  onAddOnInputBlur: () => void;
  onSuggestionSelect: (suggestion: AddOnSuggestion) => void;
}

export const AddOnManager: React.FC<AddOnManagerProps> = ({
  addOns,
  newAddOn,
  newAddOnPrice,
  addOnSuggestions,
  isLoadingSuggestions,
  isAddOnInputFocused,
  onNewAddOnChange,
  onNewAddOnPriceChange,
  onAddAddOn,
  onRemoveAddOn,
  onUploadAddonImage,
  onReorderAddOns,
  onAddOnInputFocus,
  onAddOnInputBlur,
  onSuggestionSelect
}) => {
  const addonFileInputRef = useRef<HTMLInputElement>(null);
  const [dragAddonIndex, setDragAddonIndex] = useState<number | null>(null);

  const handleUploadClick = (index: number) => {
    // Store the index in a ref so we can access it in the file change handler
    addonFileInputRef.current?.setAttribute('data-index', index.toString());
    addonFileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const index = parseInt(addonFileInputRef.current?.getAttribute('data-index') || '0');
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      console.error('Please select a valid image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size must be less than 5MB');
      return;
    }

    onUploadAddonImage(index, file);

    // Reset the file input
    if (addonFileInputRef.current) {
      addonFileInputRef.current.value = '';
      addonFileInputRef.current.removeAttribute('data-index');
    }
  };

  const handleDragStart = (index: number) => {
    setDragAddonIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (toIndex: number) => {
    if (dragAddonIndex !== null && dragAddonIndex !== toIndex) {
      onReorderAddOns(dragAddonIndex, toIndex);
    }
    setDragAddonIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, isPriceInput: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isPriceInput) {
        onAddAddOn();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Optional Add-ons</h2>
        <p className="text-gray-600">Additional services customers can purchase</p>
      </div>

      {/* Add New Add-on */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Add-on</h3>
        </div>

        <div className="space-y-4">
          {/* Add-on Name with Suggestions */}
          <div className="relative">
            <input
              type="text"
              value={newAddOn}
              onChange={(e) => onNewAddOnChange(e.target.value)}
              onFocus={onAddOnInputFocus}
              onBlur={onAddOnInputBlur}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              placeholder="e.g., Personalized engraved nameplate"
              autoComplete="off"
              onKeyDown={(e) => handleKeyDown(e)}
            />

            {/* Suggestions Dropdown */}
            {(isAddOnInputFocused && (addOnSuggestions.length > 0 || isLoadingSuggestions)) && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {isLoadingSuggestions ? (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full"></div>
                    Searching suggestions...
                  </div>
                ) : (
                  addOnSuggestions.map((s, i) => (
                    <button
                      type="button"
                      key={`${s.name}-${i}`}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-b-0 rounded-lg"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSuggestionSelect(s);
                      }}
                    >
                      <span className="truncate pr-2">{s.name}</span>
                      <Badge variant="outline" size="sm" className="text-emerald-600 rounded-lg">
                        ₱{Number(s.price || 0).toLocaleString()}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Price Input and Add Button */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">₱</span>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newAddOnPrice}
                  onChange={(e) => onNewAddOnPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  onKeyDown={(e) => handleKeyDown(e, true)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={onAddAddOn}
              disabled={!newAddOn.trim() || !newAddOnPrice.trim()}
              variant="primary"
              className="px-6 rounded-lg"
            >
              Add Add-on
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Price is required for all add-ons and will be added to the base package price
          </p>
        </div>
      </div>

      {/* Add-ons List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Add-ons</h3>
              <p className="text-sm text-gray-600">Manage your package add-ons</p>
            </div>
            <Badge variant="outline" size="sm" className="rounded-lg">
              {addOns.length} add-on{addOns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="p-6">
          {addOns.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PhotoIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No add-ons added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first add-on above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addOns.map((addOn, index) => (
                <div
                  key={`addon-${addOn.name.replace(/\s+/g, '-').toLowerCase()}-${addOn.price}-${index}`}
                  className="flex items-center bg-gray-50 p-5 rounded-lg border border-gray-200 gap-4 hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  title="Drag to reorder"
                >

                  {/* Image - Made more prominent */}
                  <div className="flex-shrink-0">
                    {addOn.image ? (
                      <div className="relative group cursor-pointer" onClick={() => handleUploadClick(index)}>
                        <NextImage
                          src={addOn.image}
                          alt={addOn.name}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200 group-hover:border-amber-300 transition-colors"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all"></div>
                        {/* Add-on Badge */}
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(index)}
                        className="h-16 w-16 border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <PhotoIcon className="w-6 h-6 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 break-words leading-relaxed">{addOn.name}</p>
                  </div>

                  {/* Price and Remove Button */}
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" size="sm" className="text-emerald-600 bg-emerald-50 border-emerald-200 rounded-lg">
                      +₱{addOn.price.toLocaleString()}
                    </Badge>

                    <button
                      type="button"
                      onClick={() => onRemoveAddOn(index)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-300 hover:border-red-400 transition-colors text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        ref={addonFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};
