'use client';

import React, { useRef, useState } from 'react';
import NextImage from 'next/image';
import { XMarkIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface InclusionItem {
  description: string;
  image?: string;
}

interface InclusionManagerProps {
  inclusions: InclusionItem[];
  newInclusion: string;
  errors: Record<string, string | undefined>;
  onNewInclusionChange: (value: string) => void;
  onAddInclusion: () => void;
  onRemoveInclusion: (index: number) => void;
  onUploadInclusionImage: (index: number, file: File) => void;
  onReorderInclusions: (fromIndex: number, toIndex: number) => void;
}

export const InclusionManager: React.FC<InclusionManagerProps> = ({
  inclusions,
  newInclusion,
  errors,
  onNewInclusionChange,
  onAddInclusion,
  onRemoveInclusion,
  onUploadInclusionImage,
  onReorderInclusions
}) => {
  const inclusionFileInputRef = useRef<HTMLInputElement>(null);
  const [dragInclusionIndex, setDragInclusionIndex] = useState<number | null>(null);

  const handleUploadClick = (index: number) => {
    // Store the index in a ref so we can access it in the file change handler
    inclusionFileInputRef.current?.setAttribute('data-index', index.toString());
    inclusionFileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const index = parseInt(inclusionFileInputRef.current?.getAttribute('data-index') || '0');
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      console.error('Please select a valid image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size must be less than 5MB');
      return;
    }

    onUploadInclusionImage(index, file);

    // Reset the file input
    if (inclusionFileInputRef.current) {
      inclusionFileInputRef.current.value = '';
      inclusionFileInputRef.current.removeAttribute('data-index');
    }
  };

  const handleDragStart = (index: number) => {
    setDragInclusionIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (toIndex: number) => {
    if (dragInclusionIndex !== null && dragInclusionIndex !== toIndex) {
      onReorderInclusions(dragInclusionIndex, toIndex);
    }
    setDragInclusionIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddInclusion();
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">Inclusions</h2>
        {errors.inclusions && (
          <p className="text-sm text-red-600 flex items-center mt-1 sm:mt-0">
            <XMarkIcon className="h-4 w-4 mr-1" />
            {errors.inclusions}
          </p>
        )}
      </div>

      <div className="flex mb-2">
        <input
          type="text"
          value={newInclusion}
          onChange={(e) => onNewInclusionChange(e.target.value)}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
          placeholder="e.g., Standard clay urn"
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={onAddInclusion}
          disabled={!newInclusion.trim()}
          className="px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add inclusion"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2 mt-3">
        {inclusions.map((inclusion, index) => (
          <div
            key={`inclusion-${inclusion.description.replace(/\s+/g, '-').toLowerCase()}-${index}`}
            className="flex items-center bg-gray-50 px-3 py-2 rounded-md gap-3"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            title="Drag to reorder"
          >
            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
            {inclusion.image ? (
              <NextImage
                src={inclusion.image}
                alt="inclusion"
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
            <span className="flex-grow text-sm break-words">{inclusion.description}</span>
            <button
              type="button"
              onClick={() => onRemoveInclusion(index)}
              className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2 p-1 rounded transition-colors hover:bg-red-50"
              title="Remove inclusion"
              aria-label={`Remove inclusion: ${inclusion.description}`}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {inclusions.length === 0 && (
          <p className="text-sm text-gray-500 italic">No inclusions added yet</p>
        )}
      </div>

      <input
        ref={inclusionFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};
