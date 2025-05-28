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
        <div ref={certificateRef} className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 print:bg-white print:p-0 print:m-0">
          <style jsx global>{`
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: white !important;
                font-size: 12pt !important;
                line-height: 1.4 !important;
              }

              .print\\:hidden {
                display: none !important;
              }

              .print\\:bg-white {
                background: white !important;
                background-color: white !important;
                background-image: none !important;
              }

              .print\\:p-0 {
                padding: 0 !important;
              }

              .print\\:m-0 {
                margin: 0 !important;
              }

              .print\\:text-black {
                color: black !important;
              }

              .print\\:w-full {
                width: 100% !important;
              }

              .print\\:h-auto {
                height: auto !important;
              }

              .print\\:page-break-inside-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              .print\\:border-black {
                border-color: black !important;
              }

              /* Hide modal overlay and ensure certificate takes full page */
              .fixed.inset-0 {
                position: static !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
                max-width: none !important;
                max-height: none !important;
                overflow: visible !important;
              }

              .max-w-4xl {
                max-width: none !important;
                width: 100% !important;
              }

              .rounded-lg, .shadow-2xl, .shadow-lg {
                border-radius: 0 !important;
                box-shadow: none !important;
              }

              /* Ensure certificate content fits on one page */
              .certificate-content {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 !important;
                padding: 20pt !important;
                width: 100% !important;
                box-sizing: border-box !important;
              }

              /* Adjust font sizes for print */
              .text-4xl { font-size: 24pt !important; }
              .text-3xl { font-size: 20pt !important; }
              .text-2xl { font-size: 16pt !important; }
              .text-xl { font-size: 14pt !important; }
              .text-lg { font-size: 12pt !important; }
              .text-base { font-size: 11pt !important; }
              .text-sm { font-size: 10pt !important; }
              .text-xs { font-size: 9pt !important; }

              /* Adjust spacing for print */
              .mb-8 { margin-bottom: 16pt !important; }
              .mb-6 { margin-bottom: 12pt !important; }
              .mb-4 { margin-bottom: 8pt !important; }
              .mb-2 { margin-bottom: 4pt !important; }
              .mt-8 { margin-top: 16pt !important; }
              .mt-6 { margin-top: 12pt !important; }
              .mt-4 { margin-top: 8pt !important; }
              .mt-2 { margin-top: 4pt !important; }
              .p-8 { padding: 16pt !important; }
              .p-6 { padding: 12pt !important; }
              .p-4 { padding: 8pt !important; }
              .pt-6 { padding-top: 12pt !important; }

              /* Remove gradients and backgrounds for print */
              .bg-gradient-to-br,
              .bg-gradient-to-r,
              .bg-blue-50,
              .bg-purple-50,
              .bg-blue-100,
              .bg-purple-100,
              .bg-yellow-50 {
                background: white !important;
                background-image: none !important;
              }

              /* Ensure borders are visible */
              .border-4,
              .border-double {
                border: 2pt double black !important;
              }

              .border-gray-400 {
                border-color: black !important;
              }

              .border-b-2 {
                border-bottom: 1pt solid black !important;
              }

              .border-t {
                border-top: 1pt solid black !important;
              }

              /* Icon adjustments for print */
              .h-16.w-16 {
                width: 24pt !important;
                height: 24pt !important;
              }

              .h-6.w-6 {
                width: 12pt !important;
                height: 12pt !important;
              }

              /* Grid adjustments for print */
              .grid-cols-3 {
                display: flex !important;
                justify-content: space-between !important;
              }

              .grid-cols-3 > div {
                flex: 1 !important;
                text-align: center !important;
              }
            }
          `}</style>
          {/* Decorative Border */}
          <div className="certificate-content border-4 border-double border-gray-400 p-8 bg-white shadow-lg print:shadow-none print:border-black print:page-break-inside-avoid">
            {/* Header with Logo/Emblem */}
            <div className="text-center mb-8">
              {/* Decorative Stars */}
              <div className="flex justify-center space-x-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>

              <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2 print:text-black">
                Certificate of Cremation
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4 print:bg-black"></div>
              <p className="text-lg text-gray-600 font-medium print:text-black">
                Rainbow Paws Cremation Services
              </p>
            </div>

            {/* Main Content */}
            <div className="text-center space-y-6 mb-8">
              <div className="flex justify-center mb-6">
                <HeartIcon className="h-16 w-16 text-red-400 fill-current" />
              </div>

              <p className="text-lg text-gray-700 leading-relaxed print:text-black">
                This is to certify that
              </p>

              <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-lg border border-gray-200 print:bg-white print:border-black">
                <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2 print:text-black">
                  {booking.pet_name}
                </h2>
                <p className="text-lg text-gray-600 print:text-black">
                  Beloved {booking.pet_type}
                </p>
              </div>

              <p className="text-lg text-gray-700 leading-relaxed print:text-black">
                has been cremated with dignity, respect, and care on
              </p>

              <div className="text-xl font-semibold text-gray-800 border-b-2 border-gray-300 pb-2 inline-block print:text-black print:border-black">
                {formatDate(booking.booking_date)}
              </div>

              <p className="text-lg text-gray-700 leading-relaxed print:text-black">
                under the {booking.service_name} service package
              </p>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6 print:bg-white print:border-black">
                <p className="text-gray-700 italic print:text-black">
                  &quot;Until we meet again at the Rainbow Bridge, you will forever remain in our hearts.&quot;
                </p>
              </div>
            </div>

            {/* Footer Information */}
            <div className="border-t border-gray-300 pt-6 print:border-black">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-black">Pet Parent</p>
                  <p className="font-semibold text-gray-800 print:text-black">
                    {booking.first_name && booking.last_name
                      ? `${booking.first_name} ${booking.last_name}`
                      : 'Pet Owner'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-black">Certificate Number</p>
                  <p className="font-semibold text-gray-800 print:text-black">{certificateNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-black">Date Issued</p>
                  <p className="font-semibold text-gray-800 print:text-black">
                    {formatDate(new Date().toISOString())}
                  </p>
                </div>
              </div>

              <div className="text-center mt-6">
                <div className="w-48 border-b border-gray-400 mx-auto mb-2 print:border-black"></div>
                <p className="text-sm text-gray-600 print:text-black">
                  {booking.provider_name || 'Rainbow Paws Cremation Center'}
                </p>
                <p className="text-xs text-gray-500 print:text-black">Authorized Cremation Service Provider</p>
              </div>
            </div>

            {/* Decorative Footer */}
            <div className="text-center mt-8">
              <div className="flex justify-center space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full print:bg-black"></div>
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
