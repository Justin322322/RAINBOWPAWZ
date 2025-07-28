'use client';

import React, { useState, useEffect } from 'react';
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface FileInputWithThumbnailProps {
  label: string;
  id: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  file?: File | null;
  required?: boolean;
}

const FileInputWithThumbnail: React.FC<FileInputWithThumbnailProps> = ({
  label,
  id,
  name,
  onChange,
  file,
  required = false
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Generate preview when file changes
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  const isImageFile = file && file.type.startsWith('image/');
  const isPdfFile = file && file.type === 'application/pdf';

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a synthetic event to clear the file
    const syntheticEvent = {
      target: {
        name,
        files: null,
        value: ''
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(true);
  };

  return (
    <>
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {!required && <span className="text-gray-500 text-xs">(optional)</span>}
          </label>
        )}
        
        {file ? (
          // File uploaded - show thumbnail
          <div className="relative border-2 border-green-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {isImageFile && preview ? (
              // Image thumbnail
              <div className="relative h-32 w-full">
                <Image
                  src={preview}
                  alt={file.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="bg-white p-2 rounded-full shadow-md hover:bg-red-50"
                    >
                      <XMarkIcon className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Non-image file
              <div className="h-32 flex items-center justify-center bg-gray-50 relative">
                <div className="text-center">
                  {isPdfFile ? (
                    <DocumentTextIcon className="h-10 w-10 text-red-500 mx-auto mb-2" />
                  ) : (
                    <DocumentTextIcon className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                  )}
                  <p className="text-xs text-gray-600">
                    {isPdfFile ? 'PDF Document' : 'Document'}
                  </p>
                </div>
                <div className="absolute top-2 right-2 flex space-x-1">
                  {isPdfFile && (
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="bg-white p-1.5 rounded-full shadow-md hover:bg-gray-50"
                    >
                      <EyeIcon className="h-3 w-3 text-gray-600" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="bg-white p-1.5 rounded-full shadow-md hover:bg-red-50"
                  >
                    <XMarkIcon className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              </div>
            )}
            
            {/* File info bar */}
            <div className="p-3 bg-gray-50 border-t">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <span className="text-xs text-green-600 font-medium flex-shrink-0">
                  ✓ Uploaded
                </span>
              </div>
            </div>
          </div>
        ) : (
          // No file - show upload area
          <label
            htmlFor={id}
            className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[var(--primary-green)] transition-colors duration-200 text-center cursor-pointer block"
          >
            <DocumentArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-[var(--primary-green)]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, JPG, PNG up to 10MB
            </p>
          </label>
        )}
        
        <input
          type="file"
          id={id}
          name={name}
          onChange={onChange}
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
        />
      </div>

      {/* Preview Modal */}
      {showPreview && file && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{file.name}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              {isImageFile ? (
                <Image
                  src={preview}
                  alt={file.name}
                  width={800}
                  height={600}
                  className="max-w-full h-auto"
                  style={{ objectFit: 'contain' }}
                />
              ) : isPdfFile ? (
                <iframe
                  src={preview}
                  className="w-full h-96"
                  title={file.name}
                />
              ) : (
                <div className="flex items-center justify-center h-60">
                  <div className="text-center p-4">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">This document type cannot be previewed</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileInputWithThumbnail;
