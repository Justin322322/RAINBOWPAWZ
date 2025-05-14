"use client";

import { useState, useEffect } from 'react';
import DirectImageWithFallback from './DirectImageWithFallback';

interface ImageFixerViewProps {
  packageId: string | number;
  imagePath: string;
}

const ImageFixerView = ({ packageId, imagePath }: ImageFixerViewProps) => {
  const [showDebug, setShowDebug] = useState(true);
  const [fixedPath, setFixedPath] = useState(imagePath);
  const [status, setStatus] = useState<'checking' | 'fixing' | 'fixed' | 'error'>('checking');
  const [message, setMessage] = useState('Checking image accessibility...');
  const [imageDataURL, setImageDataURL] = useState<string | null>(null);
  
  // Check if the image can be accessed
  useEffect(() => {
    if (!imagePath) return;
    
    const checkImage = async () => {
      setStatus('checking');
      setMessage('Checking image accessibility...');
      
      try {
        // Try to access the image directly
        const imageResponse = await fetch(imagePath, { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (imageResponse.ok) {
          // Image is accessible, but let's still try to build a more reliable path
          const pathParts = imagePath.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const standardPath = `/uploads/packages/${packageId}/${fileName}`;
          
          console.log('Image is accessible. Standard path:', standardPath);
          setStatus('fixed');
          setMessage('Image is accessible ✅');
          setFixedPath(standardPath);
          return;
        }
        
        // Image is not accessible, try to fix it
        setStatus('fixing');
        setMessage('Image not accessible directly, attempting to fix...');
        
        // Try to load image via a special endpoint that can check server-side
        const fixResponse = await fetch(`/api/cremation/packages/${packageId}/image-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            imagePath,
            packageId
          })
        });
        
        if (fixResponse.ok) {
          const fixData = await fixResponse.json();
          
          if (fixData.success) {
            setFixedPath(fixData.fixedPath);
            setStatus('fixed');
            setMessage(`Image fixed ✅ New path: ${fixData.fixedPath}`);
            
            // If the response included the image data as base64, use it
            if (fixData.imageData) {
              setImageDataURL(`data:image/png;base64,${fixData.imageData}`);
            }
            
            return;
          } else {
            setStatus('error');
            setMessage(`Error: ${fixData.error || 'Failed to fix image'}`);
          }
        } else {
          // The server-side fix failed
          setStatus('error');
          setMessage('Server-side fix failed. API not available or returned error.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    checkImage();
  }, [imagePath, packageId]);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-medium mb-4">Package {packageId} Image Fix</h2>
      
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Original Path:</div>
        <div className="text-sm bg-gray-100 p-2 rounded">{imagePath}</div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Fixed/Standardized Path:</div>
        <div className="text-sm bg-gray-100 p-2 rounded">{fixedPath}</div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Status:</div>
        <div className={`text-sm p-2 rounded font-medium ${
          status === 'fixed' ? 'bg-green-100 text-green-700' : 
          status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {message}
        </div>
      </div>
      
      <div className="flex items-start space-x-4 mb-6">
        <div className="flex-1">
          <h3 className="text-md font-medium mb-2">Using DirectImageWithFallback:</h3>
          <div className="bg-gray-100 rounded-lg overflow-hidden h-60 w-full">
            <DirectImageWithFallback 
              src={fixedPath} 
              alt="Package Image" 
              debug={showDebug}
            />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-md font-medium mb-2">Using regular img tag:</h3>
          <div className="bg-gray-100 rounded-lg overflow-hidden h-60 w-full relative">
            {/* Regular img tag */}
            <img 
              src={`${fixedPath}?t=${Date.now()}`} 
              alt="Package Image"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Regular img tag failed to load:', fixedPath);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                
                // Add error message
                const parent = target.parentElement;
                if (parent) {
                  const errorMsg = document.createElement('div');
                  errorMsg.className = 'w-full h-full flex items-center justify-center flex-col';
                  errorMsg.innerHTML = `
                    <span class="text-gray-400">Image failed to load</span>
                    <span class="text-xs text-gray-400 mt-1 truncate max-w-full px-4">${fixedPath}</span>
                  `;
                  parent.appendChild(errorMsg);
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Image data URL fallback */}
      {imageDataURL && (
        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">Using embedded base64 data:</h3>
          <div className="bg-gray-100 rounded-lg overflow-hidden h-60 w-full">
            <img 
              src={imageDataURL} 
              alt="Package Image Data" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <button 
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
        
        <button 
          className="ml-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
      </div>
    </div>
  );
};

export default ImageFixerView; 