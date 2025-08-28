'use client';

import React, { useRef, useState } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { XMarkIcon, PlusIcon, CheckIcon, PhotoIcon, Bars3Icon } from '@heroicons/react/24/outline';

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
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
          <CheckIcon className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Package Inclusions</h2>
          <p className="text-sm text-gray-500">What&apos;s included in your package</p>
        </div>
      </div>

      {/* Add New Inclusion */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded">
            <PlusIcon className="h-3 w-3 text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Add New Inclusion</h3>
        </div>

        {errors.inclusions && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span className="text-red-500">⚠</span>
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
            leftIcon={<PlusIcon className="h-4 w-4" />}
            className="px-6"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Inclusions List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded">
                <Bars3Icon className="h-3 w-3 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Current Inclusions</h3>
                <p className="text-xs text-gray-500">Drag items to reorder • Click images to update</p>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              {inclusions.length} item{inclusions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="p-6">
          {inclusions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No inclusions added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first inclusion above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inclusions.map((inclusion, index) => (
                <div
                  key={`inclusion-${inclusion.description.replace(/\s+/g, '-').toLowerCase()}-${index}`}
                  className="flex items-center bg-gray-50 p-4 rounded-lg border border-gray-200 gap-4 hover:shadow-sm transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  title="Drag to reorder"
                >
                  {/* Drag Handle */}
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded cursor-move hover:bg-gray-300 transition-colors">
                    <Bars3Icon className="h-4 w-4 text-gray-600" />
                  </div>

                  {/* Check Icon */}
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  </div>

                  {/* Image */}
                  <div className="flex-shrink-0">
                    {inclusion.image ? (
                      <div className="relative group">
                        <NextImage
                          src={inclusion.image}
                          alt={inclusion.description}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-lg object-cover border-2 border-gray-200 group-hover:border-green-300 transition-colors cursor-pointer"
                          unoptimized
                          onClick={() => handleUploadClick(index)}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                          <PhotoIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleUploadClick(index)}
                        variant="outline"
                        size="sm"
                        className="h-14 w-14 p-0 border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50"
                      >
                        <PhotoIcon className="h-6 w-6 text-gray-400" />
                      </Button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 break-words">{inclusion.description}</p>
                  </div>

                  {/* Actions */}
                  <Button
                    type="button"
                    onClick={() => onRemoveInclusion(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                    leftIcon={<XMarkIcon className="h-4 w-4" />}
                  >
                    Remove
                  </Button>
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
