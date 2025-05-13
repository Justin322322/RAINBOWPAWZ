import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentType: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentType,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement | HTMLIFrameElement>) => {
    console.error('Document loading error:', e);
    setIsLoading(false);
    setError(`Failed to load document: ${formattedDocumentUrl}. Please check if the file exists.`);

    // Log the document URL for debugging
    console.log('Attempted to load document from URL:', formattedDocumentUrl);
  };

  // Ensure document URL is properly formatted with leading slash if it's a relative path
  const formattedDocumentUrl = documentUrl && !documentUrl.startsWith('http') && !documentUrl.startsWith('/')
    ? `/${documentUrl}`
    : documentUrl;

  const isImageFile = formattedDocumentUrl?.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);
  const isPdfFile = formattedDocumentUrl?.toLowerCase().endsWith('.pdf');

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {documentType || 'Document'} Viewer
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '60vh' }}>
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ArrowPathIcon className="h-10 w-10 text-gray-400 animate-spin" />
                      </div>
                    )}

                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-4">
                          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-red-500">{error}</p>
                        </div>
                      </div>
                    )}

                    {isImageFile ? (
                      <img
                        src={formattedDocumentUrl}
                        alt={documentType || 'Document'}
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '60vh' }}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    ) : isPdfFile ? (
                      <iframe
                        src={formattedDocumentUrl}
                        className="w-full h-full"
                        style={{ height: '60vh' }}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
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

                {error && (
                  <div className="mt-4 bg-red-50 p-3 rounded-md">
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-red-500 mb-2">{error}</p>
                      <button
                        onClick={() => window.open(formattedDocumentUrl, '_blank')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                      >
                        Open Document in New Tab
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DocumentViewerModal;
