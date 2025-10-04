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
  fallbackSrc = '',
  priority = false,
  fill = false,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [error, setError] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [triedInternalFallback, setTriedInternalFallback] = useState<boolean>(false);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setError(false);
    setLoaded(false);
    setTriedInternalFallback(false);
  }, [src]);

  // Handle image load error
  const handleError = () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Image failed to load:', imgSrc);
    }
    // Try a one-time automatic fallback if none was provided or original failed
    if (!triedInternalFallback) {
      const fallback = fallbackSrc && fallbackSrc.trim().length > 0 ? fallbackSrc : '/placeholder-pet.png';
      if (imgSrc !== fallback) {
        setTriedInternalFallback(true);
        setImgSrc(fallback);
        setLoaded(false);
        return;
      }
    }
    setError(true);
  };

  // Determine the final source URL
  // Handle base64 data URLs, API routes, and file paths
  const getFinalSrc = () => {
    // If there's an error, use fallback
    if (error) {
      return fallbackSrc;
    }

    // If it's already a base64 data URL, validate and use it
    if (imgSrc.startsWith('data:image/')) {
      try {
        // Validate the base64 data URL format
        const urlParts = imgSrc.split(',');
        if (urlParts.length === 2) {
          const header = urlParts[0];
          const data = urlParts[1];

          // Check if header is valid
          if (header.includes('data:image/') && header.includes('base64')) {
            // Test if base64 data is valid
            atob(data);
            return imgSrc;
          }
        }
        // If validation fails, fall through to other options
        console.warn('Invalid base64 data URL format:', imgSrc.substring(0, 50));
      } catch (e) {
        console.warn('Invalid base64 data:', e);
      }
    }

    // If it's already an API route, add cache-busting parameter
    if (imgSrc.startsWith('/api/image/')) {
      // Add timestamp to prevent caching issues when images are updated
      const separator = imgSrc.includes('?') ? '&' : '?';
      return `${imgSrc}${separator}t=${Date.now()}`;
    }

    // If it's a file path that starts with /uploads/, convert to API route with cache-busting
    if (imgSrc.startsWith('/uploads/')) {
      return `/api/image${imgSrc}?t=${Date.now()}`;
    }

    // If it's a relative path without /uploads/, assume it's a public asset
    if (imgSrc.startsWith('/') && !imgSrc.startsWith('/api/')) {
      return imgSrc;
    }

    // If it's a bare filename like "placeholder-pet.png" or "images/foo.png",
    // try to serve from public by prefixing with '/'
    if (!imgSrc.startsWith('http') && !imgSrc.startsWith('data:') && !imgSrc.startsWith('/')) {
      return `/${imgSrc}`;
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
    console.log('ProductionSafeImage - Is base64:', imgSrc.startsWith('data:'));
    console.log('ProductionSafeImage - Is API path:', imgSrc.startsWith('/api/'));
  }

  // If the image errored or there is no usable src, render an inline SVG placeholder
  if (error || !finalSrc || finalSrc === '/') {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${fill ? 'w-full h-full' : ''} ${className}`} style={!fill ? { width: width || 400, height: height || 300 } : undefined}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  // Use Next.js Image component for better optimization
  return fill ? (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onError={error ? undefined : handleError}
      onLoad={() => setLoaded(true)}
      priority={priority}
      unoptimized={finalSrc.startsWith('data:')} // Disable optimization for base64 data URLs
    />
  ) : (
    <Image
      src={finalSrc}
      alt={alt}
      width={width || 400}
      height={height || 300}
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onError={error ? undefined : handleError}
      onLoad={() => setLoaded(true)}
      priority={priority}
      unoptimized={finalSrc.startsWith('data:')} // Disable optimization for base64 data URLs
    />
  );
};


