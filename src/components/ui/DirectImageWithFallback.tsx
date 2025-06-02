"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface DirectImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  debug?: boolean;
}

const DirectImageWithFallback = ({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackText = 'No image available',
  debug = false
}: DirectImageWithFallbackProps) => {
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [fixedPath, setFixedPath] = useState<string | null>(null);

  // Function to fix image path if needed
  const fixImagePath = async (path: string, packageId?: string) => {
    if (!path) return null;

    // Extract the package ID from the path if possible
    const pathParts = path.split('/');
    const extractedPackageId = packageId ||
      (pathParts.length > 3 ? pathParts[pathParts.length - 2] : null);

    if (!extractedPackageId || isNaN(Number(extractedPackageId))) {
      return null;
    }

    try {
      // Call the image-check API to fix the path
      const response = await fetch(`/api/cremation/packages/${extractedPackageId}/image-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imagePath: path })
      });

      const data = await response.json();

      if (data.success && data.fixedPath) {
        return data.fixedPath;
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  // Apply cache-busting on mount and when src changes
  useEffect(() => {
    if (!src) return;

    // If we already have a fixed path, use that instead
    const sourcePath = fixedPath || src;

    // Ensure the path starts with a slash if it doesn't already
    let cleanSrc = sourcePath?.split('?')[0] || '';
    if (cleanSrc && !cleanSrc.startsWith('/') && !cleanSrc.startsWith('http')) {
      cleanSrc = '/' + cleanSrc;
    }

    // Add cache-busting parameters
    const newSrc = `${cleanSrc}?t=${Date.now()}&attempt=${loadAttempts}`;
    setImgSrc(newSrc);
    setError(false);

    // Log debugging info
    if (debug) {
      // Extract information from the path
      const pathParts = cleanSrc.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const packageId = pathParts.length > 3 ? pathParts[pathParts.length - 2] : 'unknown';

      setDebugInfo({
        originalPath: src,
        fixedPath: fixedPath,
        cleanPath: cleanSrc,
        newSrc,
        fileName,
        packageId,
        timestamp: new Date().toISOString()
      });

      // Try to check if this file exists on the server
      fetch(newSrc, { method: 'HEAD' })
        .then(response => {
          const exists = response.ok;
          const status = response.status;
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');

          setDebugInfo(prev => ({
            ...prev,
            fileExists: exists,
            status,
            contentType,
            contentLength,
            checkedAt: new Date().toISOString()
          }));
        })
        .catch(err => {
          setDebugInfo(prev => ({
            ...prev,
            fileExists: false,
            error: err.message
          }));
        });
    }
  }, [src, loadAttempts, debug, fixedPath]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <span className="text-gray-400">{fallbackText}</span>
      </div>
    );
  }

  // Function to handle image error and try to fix the path
  const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Update debug info
    if (debug) {
      setDebugInfo(prev => ({
        ...prev,
        loaded: false,
        errorAt: new Date().toISOString(),
        errorEvent: e.type
      }));
    }

    // Try to fix the image path if we haven't already
    if (!fixedPath && src) {
      // Extract package ID from path if possible
      const pathParts = src.split('/');
      let packageId = null;

      // Look for a number in the path that could be a package ID
      for (let i = 0; i < pathParts.length; i++) {
        if (!isNaN(Number(pathParts[i]))) {
          packageId = pathParts[i];
          break;
        }
      }

      // If we couldn't find a package ID, try to extract it from the filename
      if (!packageId) {
        const filename = pathParts[pathParts.length - 1];
        const matches = filename.match(/package_(\d+)/);
        if (matches && matches[1]) {
          packageId = matches[1];
        }
      }

      if (packageId) {
        // Try to fix the path using the image-check API
        const fixed = await fixImagePath(src, packageId);
        if (fixed) {
          setFixedPath(fixed);
          setError(false); // Reset error to try with the new path
          return;
        }

        // If the API fix didn't work, try a direct approach
        // Construct a standard path based on the package ID and filename
        const filename = pathParts[pathParts.length - 1];
        const standardPath = `/uploads/packages/${packageId}/${filename}`;

        // Check if this file exists
        try {
          const checkResponse = await fetch(standardPath, { method: 'HEAD' });
          if (checkResponse.ok) {
            setFixedPath(standardPath);
            setError(false);
            return;
          }
        } catch (err) {
          // Silently fail
        }
      }
    }

    // If we couldn't fix the path or already tried, show the error
    setError(true);
  };

  return (
    <div className="relative w-full h-full bg-gray-100">
      {!error && (
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className={className.replace('w-full h-full', '')}
          onLoad={() => {
            if (debug) {
              setDebugInfo(prev => ({
                ...prev,
                loaded: true,
                loadedAt: new Date().toISOString()
              }));
            }
          }}
          onError={handleImageError}
        />
      )}

      {error && (
        <div className="w-full h-full flex items-center justify-center flex-col">
          <span className="text-gray-400">{fallbackText}</span>
          <span className="text-xs text-gray-400 mt-1 truncate max-w-full px-4">{src}</span>
          <div className="flex space-x-2 mt-2">
            <button
              className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-600 hover:bg-gray-300"
              onClick={() => {
                // Force refresh with a new timestamp
                setLoadAttempts(prev => prev + 1);
              }}
            >
              Retry
            </button>
            <button
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              onClick={async () => {
                // Try to fix the path
                const fixed = await fixImagePath(src);
                if (fixed) {
                  setFixedPath(fixed);
                  setError(false);
                } else {
                  // If we couldn't fix it, just retry
                  setLoadAttempts(prev => prev + 1);
                }
              }}
            >
              Fix Path
            </button>
          </div>

          {debug && (
            <div className="mt-4 p-2 bg-gray-100 text-xs text-left w-full max-h-32 overflow-auto">
              <div className="font-bold mb-1">Debug Info:</div>
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DirectImageWithFallback;