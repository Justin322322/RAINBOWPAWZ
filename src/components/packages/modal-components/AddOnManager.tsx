'use client';

import React, { useRef, useState } from 'react';
import NextImage from 'next/image';
import { XMarkIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

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
    <div className="mb-8">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Add-ons (Optional)</h2>
      <div className="flex mb-2 gap-2">
        <div className="flex-grow">
          <div className="relative">
            <input
              type="text"
              value={newAddOn}
              onChange={(e) => onNewAddOnChange(e.target.value)}
              onFocus={onAddOnInputFocus}
              onBlur={onAddOnInputBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
              placeholder="e.g., Personalized nameplate"
              autoComplete="off"
              onKeyDown={(e) => handleKeyDown(e)}
            />
            {(isAddOnInputFocused && (addOnSuggestions.length > 0 || isLoadingSuggestions)) && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {isLoadingSuggestions ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                ) : (
                  addOnSuggestions.map((s, i) => (
                    <button
                      type="button"
                      key={`${s.name}-${i}`}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSuggestionSelect(s);
                      }}
                    >
                      <span className="truncate pr-2">{s.name}</span>
                      <span className="text-gray-500">₱{Number(s.price || 0).toLocaleString()}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="w-32">
          <div className="flex items-center border border-gray-300 rounded-md shadow-sm px-3 py-2 focus-within:ring-1 focus-within:ring-[var(--primary-green)] focus-within:border-[var(--primary-green)]">
            <span className="text-gray-500 mr-1">₱</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={newAddOnPrice}
              onChange={(e) => onNewAddOnPriceChange(e.target.value)}
              placeholder="Price*"
              className="w-full focus:outline-none sm:text-sm"
              onKeyDown={(e) => handleKeyDown(e, true)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onAddAddOn}
          disabled={!newAddOn.trim() || !newAddOnPrice.trim()}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add add-on"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">* Price is required for all add-ons</p>

      <div className="space-y-2 mt-3">
        {addOns.map((addOn, index) => (
          <div
            key={`addon-${addOn.name.replace(/\s+/g, '-').toLowerCase()}-${addOn.price}-${index}`}
            className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md gap-3"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            title="Drag to reorder"
          >
            <div className="flex items-center gap-3">
              <CheckIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
              {addOn.image ? (
                <NextImage
                  src={addOn.image}
                  alt="addon"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover border"
                  unoptimized
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleUploadClick(index)}
                  className="text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-100"
                >
                  Add image
                </button>
              )}
              <span className="text-sm break-words">{addOn.name}</span>
            </div>
            <div className="flex items-center">
              <span className="text-[var(--primary-green)] font-medium mr-3">
                +₱{addOn.price.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAddOn(index)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1 rounded transition-colors hover:bg-red-50"
                title="Remove add-on"
                aria-label={`Remove add-on: ${addOn.name}`}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {addOns.length === 0 && (
          <p className="text-sm text-gray-500 italic">No add-ons added yet</p>
        )}
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
