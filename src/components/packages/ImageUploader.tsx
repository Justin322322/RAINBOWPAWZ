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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Package Images</h2>
          <p className="text-sm text-gray-600">Upload high-quality images to showcase your package</p>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {images.length}/10 images
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img, i) => {
          console.log(`Image ${i + 1} URL:`, img);
          // Create a stable key using the image URL and index
          const imageKey = `${img}-${i}`;
          return (
            <div key={imageKey} className="group aspect-square bg-gray-100 rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
              <ProductionSafeImage
                src={img}
                alt={`Package image ${i + 1}`}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                fallbackSrc="/bg_4.png"
                fill
                priority={i === 0} // Prioritize loading the first image
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <button
                type="button"
                onClick={() => {
                  console.log(`Removing image at index ${i}:`, img);
                  onRemove(i);
                }}
                className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg hover:bg-red-50 hover:text-red-600 transition-all duration-200 border border-white/20 opacity-0 group-hover:opacity-100"
                title="Remove image"
              >
                <span className="text-red-500 font-bold text-sm">×</span>
              </button>
              {i === 0 && (
                <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Primary
                </div>
              )}
            </div>
          );
        })}

        {/* Show loading indicators for uploading images */}
        {Array.from(uploadingImages).map((uploadId) => (
          <div
            key={uploadId}
            className="aspect-square bg-gradient-to-br from-green-50 to-green-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-green-300 animate-pulse shadow-sm"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
            <span className="text-xs text-green-600 mt-2 font-medium">Uploading...</span>
          </div>
        ))}

        {images.length < 10 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center hover:border-[var(--primary-green)] hover:bg-green-50 transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-green-100 transition-colors">
              <PhotoIcon className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-green-700 font-medium">Add Image</span>
            <span className="text-xs text-gray-400 mt-1">Max 10 images</span>
          </button>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={onUpload}
        accept="image/*"
        className="hidden"
        multiple
      />
    </div>
  );
};

ImageUploaderComponent.displayName = 'ImageUploader';

export const ImageUploader = memo(ImageUploaderComponent);
