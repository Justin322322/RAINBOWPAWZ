import React, { ChangeEvent, memo } from 'react';
import { ProductionSafeImage } from '@/components/ui/ProductionSafeImage';
import { PhotoIcon } from '@heroicons/react/24/outline';

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
}) => {
  // Debug logging to understand image URLs
  console.log('ImageUploader received images:', images);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Images</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img, i) => {
          console.log(`Image ${i + 1} URL:`, img);
          // Create a stable key using the image URL and index
          const imageKey = `${img}-${i}`;
          return (
            <div key={imageKey} className="aspect-square bg-gray-100 rounded-2xl relative overflow-hidden">
              <ProductionSafeImage
                src={img}
                alt={`Package image ${i + 1}`}
                className="h-full w-full object-cover"
                fallbackSrc="/bg_4.png"
                fill
                priority={i === 0} // Prioritize loading the first image
              />
              <button
                type="button"
                onClick={() => {
                  console.log(`Removing image at index ${i}:`, img);
                  onRemove(i);
                }}
                className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md hover:bg-gray-100 transition-all duration-200 border border-white/20"
                title="Remove image"
              >
                <span className="text-red-500 font-bold text-sm">×</span>
              </button>
            </div>
          );
        })}

      {/* Show loading indicators for uploading images */}
      {Array.from(uploadingImages).map((uploadId) => (
        <div
          key={uploadId}
          className="aspect-square bg-gradient-to-br from-green-50 to-green-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-green-300 animate-pulse"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
          <span className="text-xs text-green-600 mt-2 font-medium">Uploading...</span>
        </div>
      ))}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center hover:border-[var(--primary-green)] hover:bg-gray-50 transition-colors"
      >
        <PhotoIcon className="w-8 h-8 text-gray-400" />
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
};

ImageUploaderComponent.displayName = 'ImageUploader';

export const ImageUploader = memo(ImageUploaderComponent);
