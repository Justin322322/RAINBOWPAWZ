'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
// Removed localStorage dependency for better performance

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
 * Now supports base64 data URLs from database storage
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
    if (process.env.NODE_ENV === 'development') {
      console.warn('Image failed to load:', imgSrc);
    }
    if (imgSrc !== fallbackSrc) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to:', fallbackSrc);
      }
      setImgSrc(fallbackSrc);
      setError(true);
    }
  };

  // Determine the final source URL
  // Handle base64 data URLs, API routes, and file paths
  const getFinalSrc = () => {
    // If there's an error, use fallback
    if (error) {
      return fallbackSrc;
    }

    // If it's already a base64 data URL, use it directly
    if (imgSrc.startsWith('data:image/')) {
      return imgSrc;
    }

    // If it's already an API route, use it directly
    if (imgSrc.startsWith('/api/image/')) {
      return imgSrc;
    }

    // If it's a file path that starts with /uploads/, convert to API route
    if (imgSrc.startsWith('/uploads/')) {
      return `/api/image${imgSrc}`;
    }

    // If it's a file path that starts with uploads/ (no leading slash)
    if (imgSrc.startsWith('uploads/')) {
      return `/api/image/${imgSrc.substring('uploads/'.length)}`;
    }

    // If it's a relative path without /uploads/, assume it's a public asset
    if (imgSrc.startsWith('/') && !imgSrc.startsWith('/api/')) {
      return imgSrc;
    }

    // If it's an absolute URL (http/https), return as-is and rely on unoptimized rendering
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
      return imgSrc;
    }

    // For any other case, use the fallback
    if (process.env.NODE_ENV === 'development') {
      console.warn('Unknown image source format:', imgSrc);
    }
    return fallbackSrc;
  };

  const finalSrc = getFinalSrc();

  // Debug logging for image URLs (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('ProductionSafeImage - Original src:', src);
    console.log('ProductionSafeImage - Current imgSrc:', imgSrc);
    console.log('ProductionSafeImage - Final src:', finalSrc);
    console.log('ProductionSafeImage - Error state:', error);
  }

  // Use Next.js Image component for better optimization
  const shouldUnoptimize = finalSrc.startsWith('data:') || finalSrc.startsWith('http://') || finalSrc.startsWith('https://');

  return fill ? (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onError={handleError}
      onLoad={() => setLoaded(true)}
      priority={priority}
      unoptimized={shouldUnoptimize} // Disable optimization for data URLs and absolute remotes
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
      unoptimized={shouldUnoptimize} // Disable optimization for data URLs and absolute remotes
    />
  );
};


