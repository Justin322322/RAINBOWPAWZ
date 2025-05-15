'use client';

import React, { useState } from 'react';

interface PackageImageProps {
  src?: string | null;
  images?: string[];
  alt: string;
  className?: string;
  size?: 'small' | 'large';
}

export const PackageImage: React.FC<PackageImageProps> = ({ 
  src, 
  images = [], 
  alt, 
  className = '', 
  size = 'large'
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // Use either a single src or an array of images
  const imagesList = images.length ? images : (src ? [src] : []);
  const [finalSrc, setFinalSrc] = useState(imagesList[0] || '');
  
  // Reset current image index when images list changes
  React.useEffect(() => {
    if (imagesList.length > 0) {
      setCurrentImageIndex(0);
      setFinalSrc(imagesList[0]);
      setImageFailed(false);
    }
  }, [images, src]);
  
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
    
    if (isLeftSwipe && imagesList.length > 1) {
      goToNextImage({ stopPropagation: () => {} } as React.MouseEvent);
    }
    if (isRightSwipe && imagesList.length > 1) {
      goToPrevImage({ stopPropagation: () => {} } as React.MouseEvent);
    }
    
    // Reset values
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Determine classes based on size
  const sizeClasses = {
    small: "h-10 w-10",
    large: "absolute inset-0 w-full h-full"
  };
  
  // Base style for the container
  const containerStyle = size === 'small' 
    ? "flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden" 
    : "";
  const handleImageError = () => {
    // If image already failed after retries, don't try more alternatives
    if (imageFailed) return;
    
    // Try to fix common path issues
    if (finalSrc) {
      // If src starts with a double slash, fix it
      if (finalSrc.startsWith('//')) {
        const newSrc = finalSrc.replace('//', '/');
        console.log(`Trying alternative path: ${newSrc}`);
        setFinalSrc(newSrc);
        return;
      }
      
      // If the path has uploads/packages/ format
      if (finalSrc.includes('uploads/packages/')) {
        // Try with absolute path
        const fileName = finalSrc.split('/').pop();
        if (fileName) {
          const newSrc = `/uploads/packages/${fileName}`;
          console.log(`Trying direct path: ${newSrc}`);
          setFinalSrc(newSrc);
          return;
        }
      }
    }
    
    // If we reach here, all attempts failed
    setImageFailed(true);
  };  // Navigation functions for the carousel
  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (imagesList.length <= 1) return;
    
    const nextIndex = (currentImageIndex + 1) % imagesList.length;
    setCurrentImageIndex(nextIndex);
    setFinalSrc(imagesList[nextIndex]);
    setImageFailed(false); // Reset error state for new image
  };
  
  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (imagesList.length <= 1) return;
    
    const prevIndex = (currentImageIndex - 1 + imagesList.length) % imagesList.length;
    setCurrentImageIndex(prevIndex);
    setFinalSrc(imagesList[prevIndex]);
    setImageFailed(false); // Reset error state for new image
  };
  
  // Handle direct navigation to a specific image
  const goToImage = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
    setFinalSrc(imagesList[index]);
    setImageFailed(false);
  };

  // If we have images and haven't failed, display the current image with navigation
  if (imagesList.length > 0 && !imageFailed) {
    return (      <div 
        className={`${containerStyle} relative group overflow-hidden`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >        <div className="absolute inset-0 bg-gray-100">
          <img 
            src={finalSrc}
            alt={`${alt} (${currentImageIndex + 1} of ${imagesList.length})`}
            className={`object-cover ${sizeClasses[size]} ${className} transition-opacity duration-300 ease-in-out animate-fadeIn`}
            onError={handleImageError}
            onLoad={() => console.log(`Successfully loaded image: ${finalSrc}`)}
            key={finalSrc} /* Key helps React recognize this as a new image for animation */
          />
        </div>
        
        {/* Photo counter display */}
        {size === 'large' && imagesList.length > 1 && (
          <div className="absolute top-2 left-2 bg-black/40 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
            {currentImageIndex + 1}/{imagesList.length}
          </div>
        )}
        
        {/* Only show navigation for large images with multiple photos */}
        {size === 'large' && imagesList.length > 1 && (
          <>            {/* Previous button with improved visibility */}
            <button 
              onClick={goToPrevImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 shadow-md backdrop-blur-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white opacity-80 hover:opacity-100 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Next button with improved visibility */}
            <button 
              onClick={goToNextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 shadow-md backdrop-blur-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white opacity-80 hover:opacity-100 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>{/* Enhanced and more visible dot indicators */}            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black/30 px-3 py-1.5 rounded-full shadow-lg">
              {imagesList.map((_, index) => (
                <button 
                  key={index}
                  onClick={goToImage(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    currentImageIndex === index 
                      ? 'bg-white scale-110 ring-2 ring-white/50' 
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`View image ${index + 1} of ${imagesList.length}`}
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
    return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>      <span className="text-sm font-medium">{imageFailed ? 'Image failed to load' : 'No image available'}</span>
      {imageFailed && finalSrc && <span className="text-xs mt-1 max-w-[90%] truncate text-gray-500">{finalSrc}</span>}
      
      {/* If we have multiple images but this one failed, show button to try next image */}
      {imageFailed && imagesList.length > 1 && (
        <button 
          onClick={(e) => goToNextImage({ stopPropagation: () => {} } as React.MouseEvent)}
          className="mt-3 px-3 py-1 bg-primary/80 text-white text-xs rounded hover:bg-primary transition-colors"
        >
          Try next image
        </button>
      )}
    </div>
  );
};
