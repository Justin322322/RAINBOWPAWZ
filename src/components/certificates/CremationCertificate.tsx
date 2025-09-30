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
    pet_image_url?: string | null;
    pet_dob?: string | null;
    pet_date_of_death?: string | null;
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

  const getYear = (dateString?: string | null) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    const y = d.getFullYear();
    return isNaN(y) ? null : y;
  };

  const lifespan = (() => {
    const birthYear = getYear(booking.pet_dob);
    const deathYear = getYear(booking.pet_date_of_death);
    if (birthYear && deathYear) return `${birthYear}–${deathYear}`;
    if (birthYear && !deathYear) return `${birthYear}–`;
    if (!birthYear && deathYear) return `–${deathYear}`;
    return null;
  })();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 mt-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-title"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-[9999] print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:w-full print:h-full"
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
        <div ref={certificateRef} className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-blue-50 to-purple-50 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          <style jsx global>{`
            @media print {
              @page {
                size: A4;
                margin: 0.75in;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                height: 100vh !important;
                width: 100vw !important;
                overflow: hidden !important;
              }

              /* Hide everything except certificate content */
              body * {
                visibility: hidden !important;
              }

              /* Show only certificate content */
              .certificate-print-content,
              .certificate-print-content * {
                visibility: visible !important;
              }

              .certificate-print-content {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: white !important;
                padding: 0.75in !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                overflow: hidden !important;
                border: 2pt solid #9ca3af !important;
              }

              /* Ensure certificate content fills the available space properly */
              .certificate-print-content > div {
                flex-shrink: 0 !important;
              }

              .certificate-print-content .text-center.space-y-6 {
                flex-grow: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
              }

              .print\\:hidden {
                display: none !important;
              }

              .print\\:p-0 {
                padding: 0 !important;
              }

              .print\\:m-0 {
                margin: 0 !important;
              }

              .print\\:bg-white {
                background: white !important;
              }

              .print\\:shadow-none {
                box-shadow: none !important;
              }

              .print\\:page-break-inside-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Certificate content - optimized for single page */
              .certificate-content {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 !important;
                padding: 12pt !important;
                width: 100% !important;
                height: auto !important;
                box-sizing: border-box !important;
                max-height: none !important;
              }

              /* Optimized font sizes for print - larger for full A4 */
              .text-4xl { font-size: 24pt !important; line-height: 1.3 !important; }
              .text-3xl { font-size: 20pt !important; line-height: 1.3 !important; }
              .text-2xl { font-size: 18pt !important; line-height: 1.3 !important; }
              .text-xl { font-size: 16pt !important; line-height: 1.3 !important; }
              .text-lg { font-size: 14pt !important; line-height: 1.3 !important; }
              .text-base { font-size: 12pt !important; line-height: 1.3 !important; }
              .text-sm { font-size: 10pt !important; line-height: 1.3 !important; }
              .text-xs { font-size: 9pt !important; line-height: 1.3 !important; }

              /* Optimized spacing for print - larger for full A4 */
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
              .space-y-6 > * + * { margin-top: 8pt !important; }

              /* Preserve colors for print but ensure visibility */
              .bg-gradient-to-br {
                background: linear-gradient(to bottom right, #dbeafe, #e9d5ff) !important;
              }

              .bg-gradient-to-r {
                background: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
              }

              .bg-blue-50 {
                background-color: #eff6ff !important;
              }

              .bg-purple-50 {
                background-color: #faf5ff !important;
              }

              .bg-blue-100 {
                background-color: #dbeafe !important;
              }

              .bg-purple-100 {
                background-color: #e9d5ff !important;
              }

              .bg-yellow-50 {
                background-color: #fefce8 !important;
              }

              /* Ensure borders are visible with colors */
              .border-4,
              .border-double {
                border: 1.5pt double #9ca3af !important;
              }

              .border-gray-400 {
                border-color: #9ca3af !important;
              }

              .border-gray-300 {
                border-color: #d1d5db !important;
              }

              .border-gray-200 {
                border-color: #e5e7eb !important;
              }

              .border-yellow-200 {
                border-color: #fde68a !important;
              }

              .border-b-2 {
                border-bottom: 1pt solid #d1d5db !important;
              }

              .border-t,
              .border-b {
                border-top: 1pt solid #d1d5db !important;
                border-bottom: 1pt solid #d1d5db !important;
              }

              /* Optimized icons for print - larger for full A4 */
              .h-16.w-16 {
                width: 24pt !important;
                height: 24pt !important;
              }

              .h-6.w-6 {
                width: 12pt !important;
                height: 12pt !important;
              }

              /* Grid adjustments for print */
              .grid-cols-1 {
                display: block !important;
              }

              .md\\:grid-cols-3 {
                display: flex !important;
                justify-content: space-between !important;
                gap: 6pt !important;
              }

              .md\\:grid-cols-3 > div {
                flex: 1 !important;
                text-align: center !important;
              }

              /* Preserve text colors for print */
              .text-gray-800 {
                color: #1f2937 !important;
              }

              .text-gray-700 {
                color: #374151 !important;
              }

              .text-gray-600 {
                color: #4b5563 !important;
              }

              .text-gray-500 {
                color: #6b7280 !important;
              }

              .text-yellow-400 {
                color: #fbbf24 !important;
              }

              .text-red-400 {
                color: #f87171 !important;
              }

              .bg-gray-400 {
                background-color: #9ca3af !important;
              }

              /* Compact decorative elements */
              .w-32 {
                width: 40pt !important;
              }

              .h-1 {
                height: 1pt !important;
              }

              .w-48 {
                width: 60pt !important;
              }

              .w-2.h-2 {
                width: 1.5pt !important;
                height: 1.5pt !important;
              }

              /* Rounded corners for print */
              .rounded-lg {
                border-radius: 3pt !important;
              }

              .rounded-full {
                border-radius: 50% !important;
              }

              /* Ensure proper spacing between elements */
              .space-x-2 > * + * {
                margin-left: 3pt !important;
              }

              .gap-6 {
                gap: 6pt !important;
              }

              /* Remove excessive line height that causes page breaks */
              .leading-relaxed {
                line-height: 1.3 !important;
              }

              /* Ensure inline-block elements don't break */
              .inline-block {
                display: inline-block !important;
              }

              /* Compact padding for better fit */
              .pb-2 {
                padding-bottom: 2pt !important;
              }
            }
          `}</style>
          {/* Decorative Border */}
          <div className="certificate-content certificate-print-content border-4 border-double border-gray-400 p-8 bg-white shadow-lg print:shadow-none print:page-break-inside-avoid print:border-2 print:border-gray-300 print:p-0">
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
                {/* Pet photo or placeholder */}
                {booking.pet_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={booking.pet_image_url} alt={booking.pet_name} className="h-24 w-24 rounded-full object-cover border border-gray-300" onError={(e) => { (e.target as HTMLImageElement).src = '/icons/pet-placeholder.png'; }} />
                ) : (
                  <HeartIcon className="h-16 w-16 text-red-400 fill-current" />
                )}
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
                {lifespan && (
                  <p className="mt-2 text-base text-gray-700 font-medium tracking-wide">
                    {lifespan}
                  </p>
                )}
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

              {/* Dates Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mt-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                  <p className="font-semibold text-gray-800">
                    {booking.pet_dob ? formatDate(booking.pet_dob) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cremation Date</p>
                  <p className="font-semibold text-gray-800">{formatDate(booking.booking_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date of Passing</p>
                  <p className="font-semibold text-gray-800">
                    {booking.pet_date_of_death ? formatDate(booking.pet_date_of_death) : '—'}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
                <p className="text-gray-700 italic">
                  &quot;Until we meet again at the Rainbow Bridge, you will forever remain in our hearts.&quot;
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
