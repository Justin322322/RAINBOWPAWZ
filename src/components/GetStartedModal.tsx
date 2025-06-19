'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Modal from './Modal';
import {
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotNow?: () => void;
  userName?: string;
}

const GetStartedModal: React.FC<GetStartedModalProps> = ({
  isOpen,
  onClose,
  onNotNow,
  userName = 'there'
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3 sm:mb-4">Finding Cremation Services</h3>
            <div className="space-y-3 sm:space-y-4">
                              <div className="flex items-start">
                <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 text-xs sm:text-sm">1</div>
                <div>
                  <p className="text-sm sm:text-base text-gray-700">Click on the <span className="font-medium">Services</span> tab in the navigation bar to browse cremation services.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 text-xs sm:text-sm">2</div>
                <div>
                  <p className="text-sm sm:text-base text-gray-700">You&apos;ll see all available cremation centers and services in your area.</p>
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <Image
                src="/get_started/1.png"
                alt="Services Navigation"
                width={800}
                height={400}
                className="rounded-lg shadow-md mx-auto w-full max-w-full h-auto"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-medium text-gray-900 mb-4">Locating Nearby Cremation Centers</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                <div>
                  <p className="text-gray-700">View the map to see cremation centers near your location.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">2</div>
                <div>
                  <p className="text-gray-700">Your current location is marked with a blue dot, and nearby cremation centers are shown with markers.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">3</div>
                <div>
                  <p className="text-gray-700">Click on a marker to see more information about that cremation center.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Image
                src="/get_started/2.png"
                alt="Map View"
                width={800}
                height={400}
                className="rounded-lg shadow-md"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-medium text-gray-900 mb-4">Getting Directions & Exploring Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Getting Directions</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Click &quot;Get Directions&quot; to see the route to your chosen cremation center.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">2</div>
                  <div>
                    <p className="text-gray-700">View the estimated drive time and distance.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/3.png"
                    alt="Getting Directions"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Exploring Services</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">View the services offered by each cremation center.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">2</div>
                  <div>
                    <p className="text-gray-700">See pricing, ratings, and available packages.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/4.png"
                    alt="Cremation Center Services"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-medium text-gray-900 mb-4">Selecting and Booking Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Browsing Service Packages</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Browse through available service packages.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">2</div>
                  <div>
                    <p className="text-gray-700">Compare different options and prices.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/5.png"
                    alt="Service Packages"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Package Details</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Click on a package to view detailed information.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">2</div>
                  <div>
                    <p className="text-gray-700">Read descriptions, see included services, and check pricing.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/6.png"
                    alt="Package Details"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Adding to Cart or Booking Now</h4>
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                <div>
                  <p className="text-gray-700">Choose &quot;Book Now&quot; to proceed directly to checkout, or &quot;Add to Cart&quot; to continue shopping.</p>
                </div>
              </div>
              <div className="mt-2 flex justify-center">
                <Image
                  src="/get_started/7.png"
                  alt="Booking Options"
                  width={800}
                  height={400}
                  className="rounded-lg shadow-md"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-medium text-gray-900 mb-4">Completing Your Booking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Cart & Checkout</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Review your cart and click &quot;Proceed to Checkout&quot;.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Image
                    src="/get_started/8.png"
                    alt="Cart Page"
                    width={300}
                    height={200}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <Image
                    src="/get_started/9.png"
                    alt="Proceed to Checkout"
                    width={300}
                    height={200}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Checkout Process</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Fill in your pet&apos;s details and select your preferences.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/10.png"
                    alt="Checkout Page"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Scheduling</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Select a date and time for the service.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/11.png"
                    alt="Date Selection"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Delivery Options</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Choose between pickup or delivery for your pet&apos;s remains.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/12.png"
                    alt="Delivery Options"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Managing Bookings</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">View all your bookings in the &quot;My Bookings&quot; section.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/13.png"
                    alt="My Bookings"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Booking Details</h4>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                  <div>
                    <p className="text-gray-700">Click on a booking to view its details and track its status.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Image
                    src="/get_started/14.png"
                    alt="Booking Details"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle close button (X icon) - should behave like "Not Now"
  const handleCloseButton = () => {
    if (onNotNow) {
      onNotNow();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseButton}
      title="Getting Started with RainbowPaws"
      size="xlarge"
      closeOnOverlayClick={false}
      className="mt-0 pt-0"
    >
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto px-2 sm:px-0">
        <p className="text-gray-700 text-base sm:text-lg">
          Welcome to RainbowPaws, {userName}! Our platform offers a seamless way to find and book trusted cremation services for your beloved pets. This guide will help you get started with our platform effortlessly.
        </p>

        {/* Step indicator */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 px-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mb-1 text-xs sm:text-sm ${
                  index + 1 === currentStep
                    ? 'bg-[var(--primary-green)] text-white'
                    : index + 1 < currentStep
                      ? 'bg-green-100 text-green-600 border border-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {index + 1 < currentStep ? (
                  <CheckCircleIcon className="h-3 w-3 sm:h-5 sm:w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-xs text-gray-500 text-center hidden sm:block">
                {index === 0 && "Find Services"}
                {index === 1 && "Locate Centers"}
                {index === 2 && "Explore"}
                {index === 3 && "Select"}
                {index === 4 && "Complete"}
              </div>
              <div className="text-xs text-gray-500 text-center sm:hidden">
                {index === 0 && "Find"}
                {index === 1 && "Locate"}
                {index === 2 && "Explore"}
                {index === 3 && "Select"}
                {index === 4 && "Done"}
              </div>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[350px] sm:min-h-[450px] overflow-y-auto max-w-3xl mx-auto">
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 sm:mt-8 max-w-3xl mx-auto px-2">
          {currentStep === 1 ? (
            <button
              onClick={onNotNow}
              className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 hover:underline"
            >
              Not Now
            </button>
          ) : (
            <button
              onClick={handlePrev}
              className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-[var(--primary-green)] text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            {currentStep === totalSteps ? 'Finish' : 'Next'}
            <ArrowRightIcon className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GetStartedModal;
