'use client';

import React from 'react';
import Image from 'next/image';
import { DocumentArrowUpIcon, InformationCircleIcon, XMarkIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

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
  const [currentStep, setCurrentStep] = React.useState(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReceiptUpload(file);
    }
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Step Indicators */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className={`flex-1 py-4 px-3 text-center ${currentStep === 1 ? 'bg-green-50' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-2 ${currentStep === 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            1
          </div>
          <p className={`text-sm font-medium ${currentStep === 1 ? 'text-green-700' : 'text-gray-600'}`}>Payment</p>
        </div>
        <div className={`flex-1 py-4 px-3 text-center ${currentStep === 2 ? 'bg-green-50' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-2 ${currentStep === 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            2
          </div>
          <p className={`text-sm font-medium ${currentStep === 2 ? 'text-green-700' : 'text-gray-600'}`}>Receipt</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="relative min-h-[380px]">
        {/* Step 1: Payment */}
        <div className={`transition-all duration-300 ${currentStep === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0'}`}>
          <div className="p-5">
            <div className="text-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method</h3>
              <p className="text-sm text-gray-600">Complete your payment using the QR code below</p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              {/* QR Code Container */}
              <div className="relative w-52 h-52 bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <Image
                  src={qrCodeUrl}
                  alt={`${providerName} Payment QR Code`}
                  fill
                  className="object-contain p-3"
                  priority
                />
              </div>

              {/* Payment Info */}
              <div className="text-center space-y-3 w-full">
                <div className="bg-green-50 rounded-lg px-3 py-2 inline-block">
                  <p className="text-sm font-semibold text-green-800">Scan QR Code to Pay</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Pet</p>
                  <p className="text-xl font-bold text-gray-900">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  <p className="text-sm text-gray-500 mt-1">{providerName}</p>
                </div>
                <p className="text-sm text-gray-600 font-medium">Scan with GCash app</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-5 bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-4 w-4 text-gray-600 flex-shrink-0 mt-1" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 mb-3">How to pay:</p>
                  <ol className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      <span>Open your GCash app</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      <span>Tap &quot;Scan QR&quot; and scan the code above</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      <span>Confirm the amount and complete payment</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      <span>Save your reference number for the next step</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Receipt Upload */}
        <div className={`transition-all duration-300 ${currentStep === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute inset-0'}`}>
          <div className="p-5">
            <div className="text-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Payment Receipt</h3>
              <p className="text-sm text-gray-600">Upload your GCash receipt and reference number</p>
            </div>

            {/* Receipt Guide */}
            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 rounded-full p-1.5 flex-shrink-0">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">How to Upload Your Receipt</h4>

                  {/* Two-column layout */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left side: Instructions */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">1</span>
                        <span className="text-gray-700 text-sm leading-relaxed">Take a screenshot or photo of your payment confirmation</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">2</span>
                        <span className="text-gray-700 text-sm leading-relaxed">Put the reference number below</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">3</span>
                        <span className="text-gray-700 text-sm leading-relaxed">Upload the receipt image below</span>
                      </div>
                    </div>

                    {/* Right side: Example Image */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="bg-gray-100 rounded-lg p-2 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors w-full">
                        <div
                          className="bg-white rounded-lg p-2 border border-gray-200 w-full h-40 flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setShowImageModal(true)}
                        >
                          <Image
                            src="/receipt_guide.png"
                            alt="Example Receipt Guide"
                            width={100}
                            height={150}
                            className="max-w-full max-h-full object-contain rounded"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium underline hover:no-underline transition-all text-center"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowImageModal(true);
                        }}
                      >
                        Example Receipt Guide - Click to view larger
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reference Number Input */}
            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <label htmlFor="reference-number" className="block text-sm font-semibold text-gray-900 mb-2">
                    GCash Reference Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="reference-number"
                      value={referenceNumber}
                      onChange={(e) => onReferenceNumberChange(e.target.value)}
                      placeholder="Enter 13-digit reference number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-mono"
                      maxLength={13}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-sm text-gray-400 font-mono">{referenceNumber.length}/13</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    Find this in your GCash transaction history
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload Receipt Image</h4>
              {!receiptFile ? (
                <div>
                  <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 group"
                  >
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <div className="bg-blue-100 rounded-full p-2 mb-2 group-hover:bg-blue-200 transition-colors">
                        <DocumentArrowUpIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="mb-1 text-sm text-gray-700 font-semibold">
                        <span className="text-blue-600">Click to upload</span> or drag and drop
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
                    <div className="relative w-full h-36 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image
                        src={receiptPreview}
                        alt="Receipt Preview"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 rounded-full p-1.5">
                        <DocumentArrowUpIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <span className="text-sm text-gray-900 font-semibold">{receiptFile.name}</span>
                        <p className="text-xs text-gray-600">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onRemoveReceipt}
                      className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 bg-white px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 bg-green-50 rounded-lg p-3 flex items-start gap-2">
              <InformationCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Upload a clear screenshot of your GCash receipt</li>
                  <li>Make sure the reference number is visible</li>
                  <li>Receipt will be verified by the business</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center py-4 px-5 border-t border-gray-200 bg-gray-50">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentStep === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${currentStep === 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div className={`w-2 h-2 rounded-full ${currentStep === 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>

        {currentStep === 1 ? (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <div className="px-4 py-2 text-sm text-gray-500">
            Complete
          </div>
        )}
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
