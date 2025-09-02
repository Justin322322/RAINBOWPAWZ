'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Define the uploading files type
type UploadingFiles = {
  businessPermit: File | null;
  birCertificate: File | null;
  governmentId: File | null;
};

// Document type mapping - moved outside component to avoid useEffect dependency issues
const documentTypeMap: Record<string, { label: string; description: string; apiField: keyof UploadingFiles }> = {
  business_permit: {
    label: 'Business Permit',
    description: 'Official business registration document',
    apiField: 'businessPermit'
  },
  bir_certificate: {
    label: 'BIR Certificate',
    description: 'Bureau of Internal Revenue certificate',
    apiField: 'birCertificate'
  },
  government_id: {
    label: 'Government ID',
    description: 'Valid government-issued identification',
    apiField: 'governmentId'
  }
};

export default function PendingVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serviceProvider, setServiceProvider] = useState<any>(null);
  const [documentsRequired, setDocumentsRequired] = useState(false);
  const [documentsReason, setDocumentsReason] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);

  // Document upload states
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFiles>({
    businessPermit: null,
    birCertificate: null,
    governmentId: null,
  });


  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Check if we have valid required documents
  useEffect(() => {
    if (documentsRequired && requiredDocuments.length === 0) {
      // If documents are required but no specific documents are found, show error
      setDocumentsReason('No specific documents were specified in the request. Please contact support for clarification.');
    }
  }, [documentsRequired, requiredDocuments]);

  // Check verification status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // With JWT authentication, we don't need to parse cookies client-side
        // Just make the API call and let the server handle authentication

        // Use our new business status API endpoint
        const response = await fetch('/api/auth/check-business-status', {
          credentials: 'include', // Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If unauthorized, redirect to home
          if (response.status === 401) {
            router.push('/');
            return;
          }
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (!result.success) {
          setLoading(false);
          return;
        }

        const serviceProvider = result.serviceProvider;
        setServiceProvider(serviceProvider);

        // If no service provider data exists, stay on pending page
        if (!serviceProvider) {
          setLoading(false);
          return;
        }

        // Check if documents are required (based on verification_notes or application_status)
        const checkDocumentsRequired = async () => {
          try {
            // Fetch detailed service provider data including verification notes
            const detailResponse = await fetch(`/api/businesses/applications/${serviceProvider.provider_id}`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (detailResponse.ok) {
              const detailResult = await detailResponse.json();
              const verificationNotes = detailResult.verificationNotes || '';

              // Check if documents are required based on notes or status
              const normalized = verificationNotes.toLowerCase();
              const knownDocCodes = Object.keys(documentTypeMap);
              const hasDocCodeMention = knownDocCodes.some((code) =>
                normalized.includes(code) || normalized.includes(code.replace(/_/g, ' '))
              );
              const requiresDocuments =
                /(documents?|additional|upload|required|missing|need|provide|submit)/i.test(normalized) ||
                hasDocCodeMention;

              if (requiresDocuments) {
                setDocumentsRequired(true);
                setDocumentsReason(verificationNotes);

                // Try to parse specific required documents from the notes with stricter logic
                // Look for structured format: "Required documents: business_permit, bir_certificate"
                const requiredDocsMatch = normalized.match(/required documents?:?\s*([^.\n]*)/i);
                if (requiredDocsMatch) {
                  const docsText = requiredDocsMatch[1].trim();
                  // Split by comma and clean up each document name
                  const docs = docsText
                    .split(',')
                    .map((d: string) => d.trim().toLowerCase().replace(/\s+/g, '_'))
                    .filter((d: string) => d.length > 0 && knownDocCodes.includes(d));
                  setRequiredDocuments(docs);
                } else {
                  // Stricter fallback: only show documents that are explicitly mentioned by their exact codes
                  const inferred = knownDocCodes.filter(
                    (code) => normalized.includes(code) && !normalized.includes(code.replace(/_/g, ' '))
                  );
                  setRequiredDocuments(inferred);
                }

                // Debug logging to help identify parsing issues
                console.log('Document parsing debug:', {
                  verificationNotes,
                  normalized,
                  requiredDocsMatch: requiredDocsMatch ? requiredDocsMatch[1] : null,
                  parsedDocs: requiredDocsMatch ? requiredDocsMatch[1].split(',').map((d: string) => d.trim().toLowerCase().replace(/\s+/g, '_')).filter((d: string) => knownDocCodes.includes(d)) : []
                });
              }
            }
          } catch (error) {
            console.error('Error checking document requirements:', error);
          }
        };

        await checkDocumentsRequired();

        // Check application_status
        const applicationStatus = serviceProvider.application_status ?
                                 String(serviceProvider.application_status).toLowerCase() : null;

        // If approved, redirect to dashboard
        if (applicationStatus === 'approved') {
          router.push('/cremation/dashboard');
          return;
        }

        // If restricted, redirect to restricted page
        if (applicationStatus === 'restricted') {
          router.push('/cremation/restricted');
          return;
        }

        // Otherwise, stay on this pending page
        setLoading(false);
      } catch (error) {
        console.error('Error checking status:', error);
        setLoading(false);
      }
    };

    checkStatus();
  }, [router]);

  // File handling functions
  const handleFileChange = (documentType: keyof typeof uploadingFiles, file: File | null) => {
    setUploadingFiles(prev => ({
      ...prev,
      [documentType]: file
    }));
  };

  const handleUpload = async () => {
    const files = Object.values(uploadingFiles).filter(file => file !== null);
    if (files.length === 0) {
      alert('Please select at least one document to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Add files to form data based on required documents
      requiredDocuments.forEach(docType => {
        const docInfo = documentTypeMap[docType];
        if (docInfo) {
          const file = uploadingFiles[docInfo.apiField];
          if (file) {
            formData.append(docInfo.apiField, file);
          }
        }
      });

      // Add service provider ID if available
      if (serviceProvider?.provider_id) {
        formData.append('serviceProviderId', serviceProvider.provider_id.toString());
      }

      const response = await fetch('/api/businesses/upload-documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      await response.json(); // Success response
      setUploadComplete(true);

      // Create notification for admin about document upload
      try {
        const notificationResponse = await fetch('/api/notifications/system', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: 'Business Documents Uploaded',
            message: `${serviceProvider?.name || 'A business'} has uploaded additional documents for verification review.`,
            type: 'info',
            targetUserType: 'admin',
            relatedEntityType: 'business_application',
            relatedEntityId: serviceProvider?.provider_id,
            actionRequired: true,
            actionUrl: `/admin/applications/${serviceProvider?.provider_id}`,
          }),
        });

        if (notificationResponse.ok) {
          console.log('Admin notification created for document upload');
        }
      } catch (notificationError) {
        console.error('Failed to create admin notification:', notificationError);
        // Don't fail the upload if notification fails
      }

      // Show success message and redirect to dashboard after delay
      setTimeout(() => {
        // Redirect to dashboard instead of just reloading
        window.location.href = '/cremation/dashboard';
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden text-center">
        <div className="bg-[var(--primary-green)] p-6 mb-4">
          <Image
            src="/logo.png"
            alt="Rainbow Paws Logo"
            width={120}
            height={120}
            className="mx-auto"
          />
          <h1 className="text-2xl font-semibold text-white mt-4">Account Pending Verification</h1>
        </div>

        <div className="px-8 pb-8">

        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : uploadComplete ? (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-green-800 mb-2 text-center">
              Documents Submitted Successfully!
            </h3>
            <p className="text-green-700 text-center mb-4">
              Your documents have been uploaded and your application status has been updated to &ldquo;Under Review&rdquo;.
              You will be redirected to your dashboard shortly.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5 }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <p className="text-gray-700 mb-2">
                Your business account is currently under review by our administrators.
              </p>
              <p className="text-gray-700">
                You will receive an email notification once your account has been verified.
              </p>
            </div>

            {/* Document Upload Section */}
            <AnimatePresence>
              {documentsRequired && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div className="flex items-center justify-center mb-4">
                    <DocumentIcon className="h-8 w-8 text-orange-500 mr-2" />
                    <h3 className="text-lg font-medium text-orange-800">Additional Documents Required</h3>
                  </div>

                  <p className="text-orange-700 mb-4 text-center">
                    Our administrators have requested specific documents for your verification.
                    Please upload only the documents listed below.
                  </p>

                  {requiredDocuments.length === 0 && (
                    <div className="mb-4 p-3 bg-red-50 rounded border border-red-300">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> No specific documents were specified in the request.
                        Please contact support for clarification on what documents are required.
                      </p>
                    </div>
                  )}

                  {documentsReason && (
                    <div className="mb-4 p-3 bg-white rounded border border-orange-300">
                      <p className="text-sm text-orange-800">
                        <strong>Reason:</strong> {documentsReason}
                      </p>
                    </div>
                  )}

                  {/* Document Upload Form */}
                  <div className="space-y-4">
                    {requiredDocuments.length > 0 ? (
                      requiredDocuments.map(docType => {
                        const docInfo = documentTypeMap[docType];
                        if (!docInfo) return null;

                        return (
                          <div key={docType} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-400 transition-colors">
                            <div className="flex items-center mb-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                              <label className="text-sm font-medium text-gray-700">
                                {docInfo.label}
                              </label>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                              {docInfo.description}
                            </p>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(docInfo.apiField, e.target.files?.[0] || null)}
                              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                              disabled={uploading}
                            />
                            {uploadingFiles[docInfo.apiField] && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ {uploadingFiles[docInfo.apiField]?.name}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          No specific documents have been requested yet.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Please contact support if you believe this is an error.
                        </p>
                      </div>
                    )}

                    {/* Upload Button */}
                    {requiredDocuments.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={handleUpload}
                          disabled={uploading || requiredDocuments.every(docType => {
                            const docInfo = documentTypeMap[docType];
                            return !docInfo || uploadingFiles[docInfo.apiField] === null;
                          })}
                          className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {uploading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mr-2"
                              >
                                <CloudArrowUpIcon className="h-5 w-5" />
                              </motion.div>
                              Uploading... {uploadProgress}%
                            </>
                          ) : uploadComplete ? (
                            <>
                              <CheckCircleIcon className="h-5 w-5 mr-2" />
                              Documents Submitted Successfully!
                            </>
                          ) : (
                            <>
                              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                              Upload Required Documents
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Please upload at least one of the required documents above.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-2">What happens next?</h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Our admin team will review your business information and documents</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You&apos;ll receive an email notification when your account is verified</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Once verified, you&apos;ll have full access to the cremation center dashboard</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-300"
          >
            Return to Home
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
          >
            Check Status Again
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
