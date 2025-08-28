'use client';

import React, { useRef, useState } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhotoIcon } from '@heroicons/react/24/outline';

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
    <div className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Package Inclusions</h2>
        <p className="text-gray-600">What&apos;s included in your package</p>
      </div>

      {/* Add New Inclusion */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Inclusion</h3>
        </div>

        {errors.inclusions && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {errors.inclusions}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newInclusion}
              onChange={(e) => onNewInclusionChange(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="e.g., Premium ceramic urn with engraved nameplate"
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            type="button"
            onClick={onAddInclusion}
            disabled={!newInclusion.trim()}
            variant="primary"
            className="px-6 rounded-lg"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Inclusions List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Inclusions</h3>
              <p className="text-sm text-gray-600">Manage your package inclusions</p>
            </div>
            <Badge variant="outline" size="sm" className="rounded-lg">
              {inclusions.length} item{inclusions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="p-6">
          {inclusions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PhotoIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No inclusions added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first inclusion above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inclusions.map((inclusion, index) => (
                <div
                  key={`inclusion-${inclusion.description.replace(/\s+/g, '-').toLowerCase()}-${index}`}
                  className="flex items-center bg-gray-50 p-5 rounded-lg border border-gray-200 gap-4 hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  title="Drag to reorder"
                >

                  {/* Image - Made more prominent */}
                  <div className="flex-shrink-0">
                    {inclusion.image ? (
                      <div className="relative group cursor-pointer" onClick={() => handleUploadClick(index)}>
                        <NextImage
                          src={inclusion.image}
                          alt={inclusion.description}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200 group-hover:border-green-300 transition-colors"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all"></div>
                        {/* Inclusion Badge */}
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(index)}
                        className="h-16 w-16 border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <PhotoIcon className="w-6 h-6 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 break-words leading-relaxed">{inclusion.description}</p>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveInclusion(index)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-300 hover:border-red-400 transition-colors text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
