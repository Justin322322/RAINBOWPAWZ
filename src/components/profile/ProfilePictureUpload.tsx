'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CameraIcon, CheckCircleIcon, XCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { uploadProfilePictureAjax, getImagePath, handleImageError } from '@/utils/imageUtils';
import { useToast } from '@/context/ToastContext';
import { clearProfileImageCache } from '@/utils/profileImageUtils';

interface ProfilePictureUploadProps {
  currentImagePath?: string;
  userType: 'user' | 'admin' | 'business';
  apiEndpoint: string;
  additionalData?: Record<string, string>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onUploadSuccess?: (profilePicturePath: string) => void;
  onUploadError?: (error: string) => void;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32'
};

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16'
};

const buttonSizes = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5'
};

const buttonIconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

export default function ProfilePictureUpload({
  currentImagePath,
  userType,
  apiEndpoint,
  additionalData,
  size = 'md',
  className = '',
  onUploadSuccess,
  onUploadError
}: ProfilePictureUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [resolvedImageSrc, setResolvedImageSrc] = useState<string | null>(null);
  const [hadImageError, setHadImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Debug logging for prop changes
  useEffect(() => {
    console.log('ProfilePictureUpload: currentImagePath prop changed to:', currentImagePath);
    console.log('ProfilePictureUpload: currentImagePath type:', typeof currentImagePath);
    if (currentImagePath) {
      console.log('ProfilePictureUpload: currentImagePath starts with data:', currentImagePath.startsWith('data:'));
      console.log('ProfilePictureUpload: currentImagePath length:', currentImagePath.length);
    }
  }, [currentImagePath]);

  // Helper function to get the correct image source
  const getImageSource = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '';
    
    // If it's a base64 data URL, return as is
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a file path, convert to API path
    return getImagePath(imagePath, false);
  };

  // Resolve DB-backed API endpoint to actual image data (data URL or path)
  useEffect(() => {
    let isCancelled = false;
    async function resolveImage() {
      try {
        // Reset when path changes
        setResolvedImageSrc(null);
        setHadImageError(false);
        if (!currentImagePath) return;
        // If path is already a data URL or a normal file path, no async work needed
        if (currentImagePath.startsWith('data:')) return;
        if (!currentImagePath.startsWith('/api/image/profile/')) return;

        const res = await fetch(currentImagePath, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        // Prefer direct imageData (base64 data URL). Fallback to imagePath normalized.
        const src = json.imageData
          ? json.imageData as string
          : (json.imagePath ? getImagePath(json.imagePath as string, false) : '');
        if (!isCancelled) {
          setResolvedImageSrc(src || null);
        }
      } catch {
        // Swallow; component will fall back to placeholder UI
      }
    }
    resolveImage();
    return () => {
      isCancelled = true;
    };
  }, [currentImagePath]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Profile picture must be less than 5MB', 'error');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const result = await uploadProfilePictureAjax(
        selectedFile,
        apiEndpoint,
        userType,
        additionalData
      );

      if (result.success && result.profilePicturePath) {
        // Clear profile image cache to force refresh
        if (additionalData?.userId) {
          clearProfileImageCache(additionalData.userId);
        }
        
        // Update timestamp to force image refresh
        setImageTimestamp(Date.now());
        
        // Persist to lightweight dedicated key so other views can immediately reflect it
        try {
          if (userType === 'business') {
            sessionStorage.setItem('business_profile_picture', result.profilePicturePath);
          }
        } catch {}

        // Clear selection
        setSelectedFile(null);
        setPreviewUrl(null);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        showToast('Profile picture updated successfully!', 'success');
        
        // Call success callback
        if (onUploadSuccess) {
          onUploadSuccess(result.profilePicturePath);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
      showToast(errorMessage, 'error');
      
      // Call error callback
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Main Upload Area */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 border-2 border-dashed border-green-200 hover:border-green-300 transition-colors duration-200">

        {/* Profile Picture Display */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative group">
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-white border-4 border-green-100 shadow-xl group-hover:shadow-2xl transition-shadow duration-300`}>
              {(() => {
                const isProfileApi = (currentImagePath || '').startsWith('/api/image/profile/');
                const readySrc = previewUrl || resolvedImageSrc || (!isProfileApi ? getImageSource(currentImagePath) : '');
                if (!readySrc || hadImageError) {
                  return (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <UserIcon className={`${iconSizes[size]} text-white`} />
                    </div>
                  );
                }
                return (
                <Image
                  src={readySrc}
                  alt="Profile"
                  width={parseInt(sizeClasses[size].split(' ')[0].replace('w-', '')) * 4}
                  height={parseInt(sizeClasses[size].split(' ')[1].replace('h-', '')) * 4}
                  className="w-full h-full object-cover"
                  key={imageTimestamp}
                  unoptimized={(readySrc || '').toString().startsWith('data:')}
                  onError={(e) => {
                    console.error('Profile picture load error:', e);
                    setHadImageError(true);
                    handleImageError(e as unknown as React.SyntheticEvent<HTMLImageElement>);
                  }}
                />
                );
              })()}
            </div>

            {/* Camera Button with Enhanced Design */}
            <button
              onClick={triggerFileInput}
              className={`absolute -bottom-2 -right-2 bg-green-600 text-white ${buttonSizes[size]} rounded-full shadow-lg hover:bg-green-700 hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 ring-4 ring-white`}
              disabled={isUploading}
              title="Change profile picture"
            >
              <CameraIcon className={buttonIconSizes[size]} />
            </button>

            {/* Loading Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Instructions and Status */}
          <div className="text-center space-y-3">
            {!selectedFile && !isUploading && (
              <>
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentImagePath ? 'Update Your Photo' : 'Add Your Photo'}
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Click the camera icon to {currentImagePath ? 'change' : 'upload'} your profile picture
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 mr-1 text-green-500" />
                      JPG, PNG supported
                    </span>
                    <span className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 mr-1 text-green-500" />
                      Max 5MB
                    </span>
                  </div>
                </div>
              </>
            )}

            {selectedFile && !isUploading && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Ready to Upload</h3>
                <p className="text-sm text-gray-600">
                  Selected: <span className="font-medium text-green-600">{selectedFile.name}</span>
                </p>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">Uploading...</h3>
                <p className="text-sm text-gray-600">Please wait while we update your profile picture</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
      />

      {/* Upload Controls */}
      {selectedFile && !isUploading && (
        <div className="mt-6 flex items-center justify-center space-x-3">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Upload Picture
          </button>

          <button
            onClick={handleCancel}
            disabled={isUploading}
            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <XCircleIcon className="h-5 w-5 mr-2" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
