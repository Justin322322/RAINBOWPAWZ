'use client';

import React, { useState, useEffect } from 'react';
import { getImagePath, getProductionImagePath } from '@/utils/imagePathUtils';
import ProductionSafeImage from '@/components/ui/ProductionSafeImage';

export default function ImageTestPage() {
  const [imagePath, setImagePath] = useState('/uploads/packages/1/sample.jpg');
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<string, boolean>>({});

  // Run diagnostics on the current image path
  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/diagnostics/image-paths?path=${encodeURIComponent(imagePath)}`);
      const data = await response.json();
      setDiagnosticResults(data);
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle image load success
  const handleImageLoad = (id: string) => {
    setImageLoadStatus(prev => ({ ...prev, [id]: true }));
  };

  // Handle image load error
  const handleImageError = (id: string) => {
    setImageLoadStatus(prev => ({ ...prev, [id]: false }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Image Loading Diagnostics</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Image Path</h2>
        
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-4 py-2"
            placeholder="Enter image path (e.g., /uploads/packages/1/image.jpg)"
          />
          <button
            onClick={runDiagnostics}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Original Path */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <h3 className="font-medium">Original Path</h3>
              <p className="text-xs text-gray-500 truncate">{imagePath}</p>
            </div>
            <div className="h-48 bg-gray-100 relative">
              <img
                src={imagePath}
                alt="Original Path"
                className="w-full h-full object-contain"
                onLoad={() => handleImageLoad('original')}
                onError={() => handleImageError('original')}
              />
              {imageLoadStatus['original'] === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-50">
                  <span className="text-red-500 text-sm">Failed to load</span>
                </div>
              )}
            </div>
          </div>
          
          {/* API Path */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <h3 className="font-medium">API Path</h3>
              <p className="text-xs text-gray-500 truncate">{getImagePath(imagePath)}</p>
            </div>
            <div className="h-48 bg-gray-100 relative">
              <img
                src={getImagePath(imagePath)}
                alt="API Path"
                className="w-full h-full object-contain"
                onLoad={() => handleImageLoad('api')}
                onError={() => handleImageError('api')}
              />
              {imageLoadStatus['api'] === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-50">
                  <span className="text-red-500 text-sm">Failed to load</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Production Safe Image */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <h3 className="font-medium">ProductionSafeImage Component</h3>
              <p className="text-xs text-gray-500 truncate">{imagePath}</p>
            </div>
            <div className="h-48 bg-gray-100">
              <ProductionSafeImage
                src={imagePath}
                alt="Production Safe"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
      
      {diagnosticResults && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium mb-2">Path Conversions</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="mb-2">
                  <span className="text-sm font-medium">Original Path:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.originalPath}</code>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium">API Path:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.apiPath}</code>
                </div>
                <div>
                  <span className="text-sm font-medium">Production Path:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.productionPath.split('?')[0]}</code>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Environment</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="mb-2">
                  <span className="text-sm font-medium">Node Environment:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.environment.nodeEnv}</code>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium">App URL:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.environment.appUrl}</code>
                </div>
                <div>
                  <span className="text-sm font-medium">Working Directory:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.environment.cwd}</code>
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="font-medium mb-2">File Existence Checks</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="mb-2">
              <span className="text-sm font-medium">Original File Exists:</span>
              <span className={`ml-2 text-sm font-medium ${diagnosticResults.pathChecks.originalExists ? 'text-green-500' : 'text-red-500'}`}>
                {diagnosticResults.pathChecks.originalExists ? 'Yes' : 'No'}
              </span>
              <div className="text-xs text-gray-500 mt-1">
                Path: <code className="bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.pathChecks.originalFullPath}</code>
              </div>
            </div>
            
            {diagnosticResults.pathChecks.apiFullPath && (
              <div>
                <span className="text-sm font-medium">API File Exists:</span>
                <span className={`ml-2 text-sm font-medium ${diagnosticResults.pathChecks.apiExists ? 'text-green-500' : 'text-red-500'}`}>
                  {diagnosticResults.pathChecks.apiExists ? 'Yes' : 'No'}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  Path: <code className="bg-gray-100 px-1 py-0.5 rounded">{diagnosticResults.pathChecks.apiFullPath}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
