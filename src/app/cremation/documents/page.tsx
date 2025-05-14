'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import { useToast } from '@/context/ToastContext';
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Cookies from 'js-cookie';

interface FileUpload {
  file: File | null;
  name: string;
  preview: string | null;
  uploaded: boolean;
  required: boolean;
}

export default function DocumentsUploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRefs = {
    businessPermit: useRef<HTMLInputElement>(null),
    birCertificate: useRef<HTMLInputElement>(null),
    governmentId: useRef<HTMLInputElement>(null),
  };

  const [uploading, setUploading] = useState(false);
  const [anyError, setAnyError] = useState(false);
  const [userData, setUserData] = useState<{ id: string | null; name: string | null }>({
    id: null,
    name: null,
  });
  
  const [files, setFiles] = useState<{
    businessPermit: FileUpload;
    birCertificate: FileUpload;
    governmentId: FileUpload;
  }>({
    businessPermit: { file: null, name: 'Business Permit', preview: null, uploaded: false, required: true },
    birCertificate: { file: null, name: 'BIR Certificate', preview: null, uploaded: false, required: true },
    governmentId: { file: null, name: 'Government ID', preview: null, uploaded: false, required: true },
  });

  // Get user data from cookies when component mounts
  useEffect(() => {
    const authCookie = Cookies.get('auth_token');
    if (authCookie) {
      try {
        const [userId] = authCookie.split('_');
        setUserData({ ...userData, id: userId });
      } catch (error) {
        console.error('Error parsing auth cookie:', error);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        setFiles(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            file,
            preview: event.target?.result as string,
            uploaded: false
          }
        }));
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (type: keyof typeof files) => {
    setFiles(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file: null,
        preview: null,
        uploaded: false
      }
    }));
  };

  const handleUpload = async () => {
    if (!userData.id) {
      showToast('User information not found. Please log in again.', 'error');
      return;
    }

    // Check if any required file is missing
    const missingRequiredFiles = Object.entries(files)
      .filter(([_, file]) => file.required && !file.file)
      .map(([_, file]) => file.name);

    if (missingRequiredFiles.length > 0) {
      showToast(`Please upload the following required documents: ${missingRequiredFiles.join(', ')}`, 'error');
      setAnyError(true);
      return;
    }
    
    setUploading(true);
    setAnyError(false);
    
    try {
      const formData = new FormData();
      formData.append('userId', userData.id);
      
      // Append files if they exist
      if (files.businessPermit.file) {
        formData.append('businessPermit', files.businessPermit.file);
      }
      
      if (files.birCertificate.file) {
        formData.append('birCertificate', files.birCertificate.file);
      }
      
      if (files.governmentId.file) {
        formData.append('governmentId', files.governmentId.file);
      }
      
      const response = await fetch('/api/businesses/upload-documents', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload documents');
      }
      
      // Mark all files as uploaded
      setFiles(prev => ({
        businessPermit: { ...prev.businessPermit, uploaded: true },
        birCertificate: { ...prev.birCertificate, uploaded: true },
        governmentId: { ...prev.governmentId, uploaded: true },
      }));
      
      showToast('Documents uploaded successfully!', 'success');
      
      // Redirect to pending verification page
      setTimeout(() => {
        router.push('/cremation/pending-verification');
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      showToast(error instanceof Error ? error.message : 'Failed to upload documents', 'error');
      setAnyError(true);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      ref.current.click();
    }
  };

  return (
    <CremationDashboardLayout activePage="documents">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Upload Business Documents</h1>
        <p className="text-gray-600">
          Please upload the required documents to complete your cremation center verification.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            These documents will be reviewed by our admin team to verify your business.
            Once approved, you'll receive an email notification and gain access to all
            cremation center features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Business Permit Upload */}
          <div className={`border-2 rounded-lg p-4 ${files.businessPermit.uploaded ? 'border-green-200 bg-green-50' : files.businessPermit.file ? 'border-blue-200 bg-blue-50' : anyError && files.businessPermit.required && !files.businessPermit.file ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <h3 className="font-medium text-gray-800 mb-2">{files.businessPermit.name}</h3>
            
            <input 
              type="file" 
              ref={fileInputRefs.businessPermit}
              onChange={(e) => handleFileChange(e, 'businessPermit')} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
            />
            
            {files.businessPermit.preview ? (
              <div className="relative mb-3">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                  {files.businessPermit.preview.startsWith('data:image') ? (
                    <img src={files.businessPermit.preview} alt="Preview" className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <DocumentIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleRemoveFile('businessPermit')}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => triggerFileInput(fileInputRefs.businessPermit)}
                className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer mb-3 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG</p>
              </div>
            )}
            
            {files.businessPermit.uploaded ? (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                <span>Uploaded successfully</span>
              </div>
            ) : files.businessPermit.file ? (
              <p className="text-gray-600 text-sm truncate">{files.businessPermit.file.name}</p>
            ) : (
              <p className="text-gray-500 text-sm">{files.businessPermit.required ? 'Required' : 'Optional'}</p>
            )}
          </div>
          
          {/* BIR Certificate Upload */}
          <div className={`border-2 rounded-lg p-4 ${files.birCertificate.uploaded ? 'border-green-200 bg-green-50' : files.birCertificate.file ? 'border-blue-200 bg-blue-50' : anyError && files.birCertificate.required && !files.birCertificate.file ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <h3 className="font-medium text-gray-800 mb-2">{files.birCertificate.name}</h3>
            
            <input 
              type="file" 
              ref={fileInputRefs.birCertificate}
              onChange={(e) => handleFileChange(e, 'birCertificate')} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
            />
            
            {files.birCertificate.preview ? (
              <div className="relative mb-3">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                  {files.birCertificate.preview.startsWith('data:image') ? (
                    <img src={files.birCertificate.preview} alt="Preview" className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <DocumentIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleRemoveFile('birCertificate')}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => triggerFileInput(fileInputRefs.birCertificate)}
                className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer mb-3 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG</p>
              </div>
            )}
            
            {files.birCertificate.uploaded ? (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                <span>Uploaded successfully</span>
              </div>
            ) : files.birCertificate.file ? (
              <p className="text-gray-600 text-sm truncate">{files.birCertificate.file.name}</p>
            ) : (
              <p className="text-gray-500 text-sm">{files.birCertificate.required ? 'Required' : 'Optional'}</p>
            )}
          </div>
          
          {/* Government ID Upload */}
          <div className={`border-2 rounded-lg p-4 ${files.governmentId.uploaded ? 'border-green-200 bg-green-50' : files.governmentId.file ? 'border-blue-200 bg-blue-50' : anyError && files.governmentId.required && !files.governmentId.file ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <h3 className="font-medium text-gray-800 mb-2">{files.governmentId.name}</h3>
            
            <input 
              type="file" 
              ref={fileInputRefs.governmentId}
              onChange={(e) => handleFileChange(e, 'governmentId')} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
            />
            
            {files.governmentId.preview ? (
              <div className="relative mb-3">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                  {files.governmentId.preview.startsWith('data:image') ? (
                    <img src={files.governmentId.preview} alt="Preview" className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <DocumentIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleRemoveFile('governmentId')}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => triggerFileInput(fileInputRefs.governmentId)}
                className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer mb-3 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG</p>
              </div>
            )}
            
            {files.governmentId.uploaded ? (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                <span>Uploaded successfully</span>
              </div>
            ) : files.governmentId.file ? (
              <p className="text-gray-600 text-sm truncate">{files.governmentId.file.name}</p>
            ) : (
              <p className="text-gray-500 text-sm">{files.governmentId.required ? 'Required' : 'Optional'}</p>
            )}
          </div>
        </div>

        {anyError && (
          <div className="mt-6 flex items-center p-4 bg-red-50 rounded-lg border border-red-100">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Please upload all required documents to complete your verification.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push('/cremation/pending-verification')}
            className="mr-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center ${uploading ? 'opacity-70' : ''}`}
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Upload Documents
              </>
            )}
          </button>
        </div>
      </div>
    </CremationDashboardLayout>
  );
} 