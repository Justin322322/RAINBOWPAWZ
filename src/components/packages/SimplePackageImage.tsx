'use client';

import React, { useState } from 'react';
import { ProductionSafeImage } from '@/components/ui/ProductionSafeImage';

interface SimplePackageImageProps {
  images?: string[] | null;
  alt: string;
  className?: string;
  size?: 'small' | 'large';
}

export const SimplePackageImage: React.FC<SimplePackageImageProps> = ({
  images,
  alt,
  className = '',
  size = 'large'
}) => {
  const [imageError, setImageError] = useState(false);

  // Determine if we have valid images
  const hasValidImages = images && Array.isArray(images) && images.length > 0 && images[0];

  // Size-based classes
  const sizeClasses = {
    small: "h-10 w-10",
    large: "w-full h-full object-cover"
  };

  // Container classes
  const containerClass = size === 'small'
    ? "flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden"
    : "h-full w-full relative";

  // If we have a valid image and no error, show the image
  if (hasValidImages && !imageError) {
    if (size === 'small') {
      return (
        <div className={containerClass}>
          <ProductionSafeImage
            src={images[0]}
            alt={alt}
            className={`${sizeClasses[size]} ${className}`}
          />
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <ProductionSafeImage
          src={images[0]}
          alt={alt}
          className={`${sizeClasses[size]} ${className}`}
          fill
        />
      </div>
    );
  }

  // Otherwise show a placeholder
  if (size === 'small') {
    return (
      <div className="h-10 w-10 flex items-center justify-center text-gray-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
};
