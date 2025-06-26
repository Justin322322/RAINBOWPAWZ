import React, { ChangeEvent, memo } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ProductionSafeImage } from '@/components/ui/ProductionSafeImage';

interface ImageUploaderProps {
  images: string[];
  uploadingImages: Set<string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemove: (index: number) => void | Promise<void>;
}

const ImageUploaderComponent: React.FC<ImageUploaderProps> = ({
  images,
  uploadingImages,
  fileInputRef,
  onUpload,
  onRemove
}) => (
  <div className="mb-8">
    <h2 className="text-lg font-medium text-gray-800 mb-4">Images</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((img, i) => (
        <div key={i} className="aspect-square bg-gray-100 rounded-md relative overflow-hidden">
          <ProductionSafeImage
            src={img}
            alt={`Package image ${i + 1}`}
            className="h-full w-full object-cover"
            fallbackSrc="/images/placeholder-image.jpg"
            fill
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md hover:bg-red-50"
          >
            <XMarkIcon className="h-5 w-5 text-red-500" />
          </button>
        </div>
      ))}

      {/* Show loading indicators for uploading images */}
      {Array.from(uploadingImages).map((uploadId) => (
        <div
          key={uploadId}
          className="aspect-square bg-gray-100 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-blue-300 animate-pulse"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-xs text-blue-500 mt-2">Uploading...</span>
        </div>
      ))}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center hover:border-[var(--primary-green)] hover:bg-gray-50 transition-colors"
      >
        <PhotoIcon className="h-8 w-8 text-gray-400" />
        <span className="mt-2 text-sm text-gray-500">Add Image</span>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onUpload}
        accept="image/*"
        className="hidden"
        multiple
      />
    </div>
  </div>
);

ImageUploaderComponent.displayName = 'ImageUploader';

export const ImageUploader = memo(ImageUploaderComponent);