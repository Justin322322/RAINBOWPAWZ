'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getProductionImagePath } from '@/utils/imageUtils';

interface ProductionSafeImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  priority?: boolean;
  fill?: boolean;
}

/**
 * A component that handles image loading safely in both development and production
 * It provides consistent fallback behavior and error handling
 */
export const ProductionSafeImage: React.FC<ProductionSafeImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  fallbackSrc = '/bg_4.png',
  priority = false,
  fill = false,
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

  // Handle image load error
  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setError(true);
    }
  };

  // Use our utility function to get a production-ready image path
  // Always use the API route in production for better reliability
  const finalSrc = error ? fallbackSrc : getProductionImagePath(imgSrc);

  // Use Next.js Image component for better optimization
  return fill ? (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onError={handleError}
      onLoad={() => setLoaded(true)}
      priority={priority}
    />
  ) : (
    <Image
      src={finalSrc}
      alt={alt}
      width={width || 400}
      height={height || 300}
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onError={handleError}
      onLoad={() => setLoaded(true)}
      priority={priority}
    />
  );
};

export default ProductionSafeImage;
