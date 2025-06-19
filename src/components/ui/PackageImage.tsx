import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PackageImageProps {
  src: string;
  alt: string;
  fallbackText?: string;
}

const PackageImage = ({ src, alt, fallbackText = 'No image available' }: PackageImageProps) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  // Reset error and loaded states when src changes
  useEffect(() => {
    setError(false);
    setLoaded(false);
    // Ensure a fresh cache-busting parameter every time
    setImgSrc(`${src.split('?')[0]}?t=${Date.now()}`);
  }, [src]);

  // Fallback to standard img tag if Next.js Image fails
  const [useFallbackImg, setUseFallbackImg] = useState(false);

  // Direct image check
  useEffect(() => {
    if (error && !useFallbackImg) {
      // Try with a regular image as fallback
      setUseFallbackImg(true);
    }
  }, [error, useFallbackImg]);

  const handleError = () => {
    setError(true);
  };

  return (
    <div className="relative w-full h-full bg-gray-100">
      {!error && !useFallbackImg ? (
        <Image
          src={imgSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => {
            setLoaded(true);
          }}
          onError={handleError}
          unoptimized={true}
          priority
        />
      ) : useFallbackImg ? (
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className="object-cover"
          onLoad={() => {
            setLoaded(true);
            setError(false);
          }}
          onError={() => {
            setError(true);

            // Attempt to fetch the image to see server response
            fetch(imgSrc)
              .then(response => {
                if (!response.ok) {
                }
              })
              .catch(_fetchError => {
              });
          }}
        />
      ) : null}

      {(!loaded || error) && (
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-gray-400">{fallbackText}</span>
          {error && (
            <>
              <span className="text-xs text-gray-400 mt-1 px-2 text-center">
                Unable to load image
              </span>
              <span className="text-xs text-gray-400 mt-1 max-w-full px-4 truncate">
                {imgSrc}
              </span>
              <button
                className="mt-2 px-2 py-1 bg-gray-200 rounded text-xs text-gray-600 hover:bg-gray-300"
                onClick={() => {
                  // Force refresh the image with a new timestamp
                  setImgSrc(`${src.split('?')[0]}?t=${Date.now()}`);
                  setError(false);
                  setUseFallbackImg(false);
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PackageImage;