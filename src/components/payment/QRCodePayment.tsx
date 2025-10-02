'use client';

import React from 'react';
import Image from 'next/image';
import { QrCodeIcon, DocumentArrowUpIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface QRCodePaymentProps {
  qrCodeUrl: string;
  providerName: string;
  amount: number;
  onReceiptUpload: (file: File) => void;
  onReferenceNumberChange: (refNumber: string) => void;
  receiptFile: File | null;
  receiptPreview: string | null;
  referenceNumber: string;
  onRemoveReceipt: () => void;
}

export default function QRCodePayment({
  qrCodeUrl,
  providerName,
  amount,
  onReceiptUpload,
  onReferenceNumberChange,
  receiptFile,
  receiptPreview,
  referenceNumber,
  onRemoveReceipt
}: QRCodePaymentProps) {
  const [showImageModal, setShowImageModal] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReceiptUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <QrCodeIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Scan QR Code to Pay</h3>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 bg-white rounded-lg border-4 border-gray-200 overflow-hidden">
              <Image
                src={qrCodeUrl}
                alt={`${providerName} Payment QR Code`}
                fill
                className="object-contain p-2"
                priority
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Scan with GCash app</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 mt-1">{providerName}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-blue-100 rounded-lg p-3 flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to pay:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open your GCash app</li>
              <li>Tap &quot;Scan QR&quot; and scan the code above</li>
              <li>Confirm the amount and complete payment</li>
              <li>Save your reference number and upload receipt below</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Receipt Upload Section */}
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <DocumentArrowUpIcon className="h-6 w-6 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Upload Payment Receipt</h3>
        </div>

        {/* Receipt Guide */}
        <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-2 mb-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">How to Upload Your Receipt</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Complete payment using the QR code above</li>
                <li>Take a screenshot or photo of your payment confirmation</li>
                <li>Upload the receipt image below</li>
              </ol>
            </div>
          </div>

          {/* Example Receipt Image - Clickable */}
          <div className="mt-3 flex flex-col items-center">
            <div
              className="bg-white rounded-lg p-2 border-2 border-dashed border-blue-300 w-40 h-96 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => {
                console.log('Image clicked, opening modal');
                setShowImageModal(true);
              }}
            >
              <Image
                src="/receipt_guide.png"
                alt="Example Receipt Guide"
                width={150}
                height={350}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
            <p className="text-xs text-blue-600 mt-2 text-center cursor-pointer" onClick={() => {
              console.log('Text clicked, opening modal');
              setShowImageModal(true);
            }}>Click to view larger</p>
          </div>
        </div>

        {/* Reference Number Input */}
        <div className="mb-4">
          <label htmlFor="reference-number" className="block text-sm font-medium text-gray-700 mb-2">
            GCash Reference Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="reference-number"
            value={referenceNumber}
            onChange={(e) => onReferenceNumberChange(e.target.value)}
            placeholder="Enter 13-digit reference number"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={13}
          />
          <p className="text-xs text-gray-500 mt-1">
            Find this in your GCash transaction history
          </p>
        </div>

        {/* File Upload */}
        {!receiptFile ? (
          <div>
            <label
              htmlFor="receipt-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mb-3" />
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 10MB)</p>
              </div>
              <input
                id="receipt-upload"
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            {receiptPreview && (
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                <Image
                  src={receiptPreview}
                  alt="Receipt Preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <DocumentArrowUpIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700 font-medium">{receiptFile.name}</span>
              </div>
              <button
                type="button"
                onClick={onRemoveReceipt}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <XMarkIcon className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 bg-yellow-50 rounded-lg p-3 flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Upload a clear screenshot of your GCash receipt</li>
              <li>Make sure the reference number is visible</li>
              <li>Receipt will be verified by the business</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
            <Image
              src="/receipt_guide.png"
              alt="Receipt Guide - Full Size"
              width={600}
              height={800}
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
