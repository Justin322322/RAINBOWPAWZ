'use client';

import React, { useRef } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  DocumentArrowDownIcon,
  PrinterIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface CremationCertificateProps {
  booking: {
    id: number;
    pet_name: string;
    pet_type: string;
    first_name?: string;
    last_name?: string;
    booking_date: string;
    service_name: string;
    provider_name?: string;
    created_at: string;
  };
  onClose?: () => void;
}

const CremationCertificate: React.FC<CremationCertificateProps> = ({ booking, onClose }) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // For now, we'll use the print functionality
    // In a real implementation, you might want to use html2canvas or similar
    window.print();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM dd, yyyy');
  };

  const certificateNumber = `RC-${booking.id.toString().padStart(6, '0')}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header with actions */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">Cremation Certificate</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[var(--primary-green)] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
            >
              Close
            </button>
          </div>
        </div>

        {/* Certificate Content */}
        <div ref={certificateRef} className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 print:bg-white print:p-4">
          <style jsx global>{`
            @media print {
              body { margin: 0; }
              .print\\:hidden { display: none !important; }
              .print\\:bg-white { background: white !important; }
              .print\\:p-4 { padding: 1rem !important; }
              .print\\:text-black { color: black !important; }
            }
          `}</style>
          {/* Decorative Border */}
          <div className="border-4 border-double border-gray-400 p-8 bg-white shadow-lg">
            {/* Header with Logo/Emblem */}
            <div className="text-center mb-8">
              {/* Decorative Stars */}
              <div className="flex justify-center space-x-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>

              <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">
                Certificate of Cremation
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600 font-medium">
                Rainbow Paws Cremation Services
              </p>
            </div>

            {/* Main Content */}
            <div className="text-center space-y-6 mb-8">
              <div className="flex justify-center mb-6">
                <HeartIcon className="h-16 w-16 text-red-400 fill-current" />
              </div>

              <p className="text-lg text-gray-700 leading-relaxed">
                This is to certify that
              </p>

              <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-lg border border-gray-200">
                <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">
                  {booking.pet_name}
                </h2>
                <p className="text-lg text-gray-600">
                  Beloved {booking.pet_type}
                </p>
              </div>

              <p className="text-lg text-gray-700 leading-relaxed">
                has been cremated with dignity, respect, and care on
              </p>

              <div className="text-xl font-semibold text-gray-800 border-b-2 border-gray-300 pb-2 inline-block">
                {formatDate(booking.booking_date)}
              </div>

              <p className="text-lg text-gray-700 leading-relaxed">
                under the {booking.service_name} service package
              </p>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
                <p className="text-gray-700 italic">
                  "Until we meet again at the Rainbow Bridge, you will forever remain in our hearts."
                </p>
              </div>
            </div>

            {/* Footer Information */}
            <div className="border-t border-gray-300 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pet Parent</p>
                  <p className="font-semibold text-gray-800">
                    {booking.first_name && booking.last_name
                      ? `${booking.first_name} ${booking.last_name}`
                      : 'Pet Owner'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                  <p className="font-semibold text-gray-800">{certificateNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date Issued</p>
                  <p className="font-semibold text-gray-800">
                    {formatDate(new Date().toISOString())}
                  </p>
                </div>
              </div>

              <div className="text-center mt-6">
                <div className="w-48 border-b border-gray-400 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">
                  {booking.provider_name || 'Rainbow Paws Cremation Center'}
                </p>
                <p className="text-xs text-gray-500">Authorized Cremation Service Provider</p>
              </div>
            </div>

            {/* Decorative Footer */}
            <div className="text-center mt-8">
              <div className="flex justify-center space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CremationCertificate;
