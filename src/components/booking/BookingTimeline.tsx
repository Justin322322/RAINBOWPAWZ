'use client';

import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface BookingTimelineProps {
  currentStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  className?: string;
}

const BookingTimeline: React.FC<BookingTimelineProps> = ({ currentStatus, className = '' }) => {
  const steps: TimelineStep[] = [
    {
      id: 'pending',
      title: 'Booking Created',
      description: 'Your booking has been submitted',
      icon: ClockIcon
    },
    {
      id: 'confirmed',
      title: 'Booking Confirmed',
      description: 'We have confirmed your booking',
      icon: CheckCircleIcon
    },
    {
      id: 'in_progress',
      title: 'Service in Progress',
      description: 'Your pet is being cared for',
      icon: ArrowPathIcon
    },
    {
      id: 'completed',
      title: 'Service Completed',
      description: 'Your service has been completed',
      icon: DocumentCheckIcon
    }
  ];

  // Handle cancelled status
  if (currentStatus === 'cancelled') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <XCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Booking Cancelled</h3>
            <p className="text-red-600">This booking has been cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = steps.findIndex(step => step.id === currentStatus);
  const validCurrentIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Service Progress</h3>

      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isCompleted = index <= validCurrentIndex;
              const isCurrent = index === validCurrentIndex;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="flex flex-col items-center relative">
                  {/* Progress Line - positioned behind circles */}
                  {!isLast && (
                    <div className="absolute top-6 left-6 w-full h-0.5 bg-gray-200 z-0">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${
                          index < validCurrentIndex ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                        style={{
                          width: index < validCurrentIndex ? '100%' : '0%'
                        }}
                      ></div>
                    </div>
                  )}

                  {/* Circle */}
                  <div className={`
                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                    }
                    ${isCurrent && !isCompleted ? 'ring-4 ring-green-200 animate-pulse' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="mt-4 text-center max-w-32">
                    <div className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Timeline */}
      <div className="md:hidden">
        <div className="relative">
          {steps.map((step, index) => {
            const isCompleted = index <= validCurrentIndex;
            const isCurrent = index === validCurrentIndex;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative flex items-start pb-8 last:pb-0">
                {/* Vertical Line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200">
                    <div
                      className={`w-full transition-all duration-300 ${
                        index < validCurrentIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{
                        height: index < validCurrentIndex ? '100%' : '0%'
                      }}
                    ></div>
                  </div>
                )}

                {/* Circle */}
                <div className={`
                  relative z-10 w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-all duration-300
                  ${isCompleted
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                  }
                  ${isCurrent && !isCompleted ? 'ring-4 ring-green-200 animate-pulse' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status Message */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-blue-800">
            {getCurrentStatusMessage(currentStatus)}
          </span>
        </div>
      </div>
    </div>
  );
};

function getCurrentStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Your booking is pending confirmation from the service provider.';
    case 'confirmed':
      return 'Your booking has been confirmed. Please arrive on time for your appointment.';
    case 'in_progress':
      return 'Your pet is being cared for with the utmost respect and compassion.';
    case 'completed':
      return 'Your service has been completed. Thank you for choosing our services.';
    default:
      return 'Booking status updated.';
  }
}

export default BookingTimeline;
