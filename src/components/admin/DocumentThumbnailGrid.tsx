'use client';

import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { getProductionImagePath } from '@/utils/imageUtils';

interface Document {
  type?: string;
  name?: string;
  url?: string;
  path?: string;
}

interface DocumentThumbnailGridProps {
  documents: Document[];
  onDocumentClick: (url: string, type: string) => void;
}

interface DocumentThumbnailProps {
  document: Document;
  onDocumentClick: (url: string, type: string) => void;
}

const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({ document, onDocumentClick }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isImageFile, setIsImageFile] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const documentUrl = document.url || document.path || '';
  const documentType = document.type || document.name || 'Document';

  useEffect(() => {
    if (documentUrl) {
      // Process the document URL similar to DocumentViewerModal
      let processedUrl = documentUrl;

      // Handle different URL formats
      if (documentUrl.startsWith('/uploads/') || documentUrl.includes('/uploads/')) {
        const uploadPath = documentUrl.substring(documentUrl.indexOf('/uploads/') + '/uploads/'.length);
        processedUrl = `/api/image/${uploadPath}`;
      } else if (documentUrl.includes('/documents/') || documentUrl.includes('/business/')) {
        const parts = documentUrl.split('/');
        const relevantIndex = parts.findIndex(part =>
          part === 'documents' || part === 'business' || part === 'businesses'
        );
        if (relevantIndex >= 0) {
          const relevantPath = parts.slice(relevantIndex).join('/');
          processedUrl = `/api/image/${relevantPath}`;
        }
      } else {
        processedUrl = getProductionImagePath(documentUrl);
      }

      setThumbnailUrl(processedUrl);
      
      // Check if it's an image file
      const imageExtensions = /\.(jpeg|jpg|gif|png|webp)$/i;
      setIsImageFile(imageExtensions.test(processedUrl));
    }
  }, [documentUrl]);

  const isPdfFile = documentUrl.toLowerCase().endsWith('.pdf');

  const handleImageError = () => {
    setLoadError(true);
  };

  return (
    <div
      className="relative bg-white border-2 border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
      onClick={() => onDocumentClick(documentUrl, documentType)}
    >
      {/* Thumbnail Area */}
      <div className="h-32 bg-gray-50 flex items-center justify-center relative">
        {isImageFile && thumbnailUrl && !loadError ? (
          <Image
            src={thumbnailUrl}
            alt={documentType}
            fill
            className="object-cover"
            onError={handleImageError}
          />
        ) : isPdfFile ? (
          <div className="text-center">
            <DocumentTextIcon className="h-8 w-8 text-red-500 mx-auto mb-1" />
            <span className="text-xs text-gray-600">PDF</span>
          </div>
        ) : (
          <div className="text-center">
            <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-600">Document</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="bg-white p-2 rounded-full shadow-md">
            <EyeIcon className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="p-3 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
          {documentType}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {isPdfFile ? 'PDF Document' : isImageFile ? 'Image' : 'Document'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDocumentClick(documentUrl, documentType);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

const DocumentThumbnailGrid: React.FC<DocumentThumbnailGridProps> = ({ 
  documents, 
  onDocumentClick 
}) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8">
        <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No documents have been submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((document, index) => (
        <DocumentThumbnail
          key={index}
          document={document}
          onDocumentClick={onDocumentClick}
        />
      ))}
    </div>
  );
};

export default DocumentThumbnailGrid;
