'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getProductionImagePath } from '@/utils/imageUtils';

interface ProductionSafePetImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  size?: 'small' | 'medium' | 'large';
  onError?: (error: Error) => void;
}

/**
 * A component specifically designed for displaying pet images safely in both development and production
 * It handles proper image path conversion and provides consistent fallback behavior
 */
export const ProductionSafePetImage: React.FC<ProductionSafePetImageProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder-pet.png',
  size = 'medium',
  onError,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [error, setError] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setError(false);
    setLoaded(false);
  }, [src]);

  // Size classes for different image sizes
  const sizeClasses = {
    small: 'h-16 w-16',
    medium: 'h-24 w-24',
    large: 'h-32 w-32',
  };

  // Handle image load error
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (imgSrc !== fallbackSrc) {
      // Log the error for debugging
      console.error('Failed to load pet image:', src);

      // Call the onError callback if provided
      if (onError) {
        onError(new Error(`Failed to load pet image: ${src}`));
      }

      // Set fallback image
      setImgSrc(fallbackSrc);
      setError(true);

      // Update the image element
      const target = e.target as HTMLImageElement;
      target.onerror = null; // Prevent infinite loop
      target.className = `${sizeClasses[size]} object-contain bg-gray-100 rounded-lg ${className}`;
    }
  };

  // Use our utility function to get a production-ready image path
  const finalSrc = error ? fallbackSrc : getProductionImagePath(imgSrc);

  // Get dimensions from size classes
  const getDimensions = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return { width: 64, height: 64 };
      case 'medium': return { width: 96, height: 96 };
      case 'large': return { width: 128, height: 128 };
      default: return { width: 96, height: 96 };
    }
  };

  const { width, height } = getDimensions(size);

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={`${sizeClasses[size]} object-cover rounded-lg shadow-sm ${className} ${loaded ? 'opacity-100' : 'opacity-95'} transition-opacity duration-300`}
      onError={handleError}
      onLoad={() => setLoaded(true)}
    />
  );
};

export default ProductionSafePetImage;
