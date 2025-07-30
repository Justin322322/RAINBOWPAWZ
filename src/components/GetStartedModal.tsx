'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { renderStepContent } from './GetStartedSteps';
import {
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Step labels for the get started guide
const STEP_LABELS = ["Find", "Locate", "Explore", "Select", "Complete"];

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Getting Started with RainbowPaws"
      size="xlarge"
      closeOnOverlayClick={false}
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        <p className="text-gray-700 text-lg">
          Welcome, {userName}! This guide will walk you through finding and booking trusted cremation services for your beloved pets.
        </p>

        <div className="flex justify-between items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-sm ${
                  index + 1 === currentStep
                    ? 'bg-[var(--primary-green)] text-white'
                    : index + 1 < currentStep
                      ? 'bg-green-100 text-green-600 border border-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {index + 1 < currentStep ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-xs text-gray-500 text-center">
                {STEP_LABELS[index]}
              </div>
            </div>
          ))}
        </div>

        <div className="min-h-[450px] overflow-y-auto">
          {renderStepContent(currentStep)}
        </div>

        <div className="flex justify-between mt-8">
          {currentStep === 1 ? (
            <button
              onClick={onNotNow}
              className="px-4 py-2 text-gray-600 hover:underline"
            >
              Not Now
            </button>
          ) : (
            <button
              onClick={handlePrev}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            {currentStep === totalSteps ? 'Finish' : 'Next'}
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GetStartedModal;
