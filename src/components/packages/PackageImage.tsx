'use client';

import React, { useState, useEffect } from 'react';

interface PackageImageProps {
  src?: string | null;
  images?: string[];
  alt: string;
  className?: string;
  size?: 'small' | 'large';
  onError?: () => void;
}

export const PackageImage: React.FC<PackageImageProps> = ({ 
  src, 
  images = [], 
  alt, 
  className = '', 
  size = 'large',
  onError
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // Use either a single src or an array of images
  // Filter out any sample or placeholder images
  const filteredImages = images?.length 
    ? images.filter(img => !img.includes('/sample-package-') && !img.includes('/placeholder'))
    : (src && !src.includes('/sample-package-') && !src.includes('/placeholder')) ? [src] : [];
  
  const [finalSrc, setFinalSrc] = useState(filteredImages[0] || '');
  
  // Debug log image sources on component mount
  useEffect(() => {
    console.log(`PackageImage component for ${alt}:`, { 
      filteredImages, 
      srcProp: src, 
      imagesProp: images,
      finalSrc,
      size,
      isEmpty: filteredImages.length === 0
    });
  }, [alt, src, images, filteredImages, finalSrc, size]);
  
  // Reset current image index when images list changes
  useEffect(() => {
    if (filteredImages.length > 0) {
      setCurrentImageIndex(0);
      setFinalSrc(filteredImages[0]);
      setImageFailed(false);
    } else {
      console.log(`No images available for package: ${alt}`);
    }
  }, [images, src, alt, filteredImages]);
  
  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && filteredImages.length > 1) {
      goToNextImage({ stopPropagation: () => {} } as React.MouseEvent);
    }
    if (isRightSwipe && filteredImages.length > 1) {
      goToPrevImage({ stopPropagation: () => {} } as React.MouseEvent);
    }
    
    // Reset values
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Determine classes based on size
  const sizeClasses = {
    small: "h-10 w-10",
    large: "w-full h-full object-cover absolute inset-0"
  };
  
  // Base style for the container
  const containerStyle = size === 'small' 
    ? "flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden" 
    : "h-full w-full relative";
    
  const handleImageError = () => {
    if (imageFailed) return;
    
    console.log(`Image failed to load: ${finalSrc} for package: ${alt}`);
    
    // Call custom onError handler if provided
    if (onError) {
      onError();
    }
    
    // Simple fix attempt for double slashes
    if (finalSrc && finalSrc.startsWith('//')) {
      const newSrc = finalSrc.replace('//', '/');
      console.log(`Trying alternative path: ${newSrc}`);
      setFinalSrc(newSrc);
      return;
    }
    
    // If we reach here, image failed to load
    setImageFailed(true);
  };
  
  // Navigation functions for the carousel
  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (filteredImages.length <= 1) return;
    
    const nextIndex = (currentImageIndex + 1) % filteredImages.length;
    setCurrentImageIndex(nextIndex);
    setFinalSrc(filteredImages[nextIndex]);
    setImageFailed(false); // Reset error state for new image
  };
  
  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (filteredImages.length <= 1) return;
    
    const prevIndex = (currentImageIndex - 1 + filteredImages.length) % filteredImages.length;
    setCurrentImageIndex(prevIndex);
    setFinalSrc(filteredImages[prevIndex]);
    setImageFailed(false); // Reset error state for new image
  };
  
  // Handle direct navigation to a specific image
  const goToImage = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
    setFinalSrc(filteredImages[index]);
    setImageFailed(false);
  };

  // Default placeholder display function to reuse
  const renderPlaceholder = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  // If we have images and haven't failed, display the current image with navigation
  if (filteredImages.length > 0 && !imageFailed) {
    return (
      <div 
        className={`${containerStyle} group overflow-hidden`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-gray-100 w-full h-full">
          <img 
            src={finalSrc}
            alt={`${alt}`}
            className={`object-cover ${sizeClasses[size]} ${className} transition-opacity duration-300 ease-in-out`}
            onError={handleImageError}
            onLoad={() => console.log(`Successfully loaded image: ${finalSrc}`)}
            key={finalSrc}
            style={{width: '100%', height: '100%'}}
          />
        </div>
        
        {/* Photo counter display - always show actual count of images */}
        {size === 'large' && (
          <div className="absolute top-2 left-2 bg-black/40 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm z-10">
            {filteredImages.length}/{filteredImages.length}
          </div>
        )}
        
        {/* Only show navigation for large images with multiple photos */}
        {size === 'large' && filteredImages.length > 1 && (
          <>
            {/* Previous button */}
            <button 
              onClick={goToPrevImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 shadow-md backdrop-blur-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white opacity-80 hover:opacity-100 group-hover:opacity-100 z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Next button */}
            <button 
              onClick={goToNextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 shadow-md backdrop-blur-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white opacity-80 hover:opacity-100 group-hover:opacity-100 z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black/30 px-3 py-1.5 rounded-full shadow-lg z-20">
              {filteredImages.map((_, index) => (
                <button 
                  key={index}
                  onClick={goToImage(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    currentImageIndex === index 
                      ? 'bg-white scale-110 ring-2 ring-white/50' 
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`View image ${index + 1} of ${filteredImages.length}`}
                  aria-current={currentImageIndex === index ? 'true' : 'false'}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  
  // Default placeholder when image is not available or failed to load
  if (size === 'small') {
    return (
      <div className="h-10 w-10 flex items-center justify-center text-gray-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  
  return renderPlaceholder();
};
