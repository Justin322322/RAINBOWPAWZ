'use client';

import React from 'react';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: string;
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
      icon: '📝'
    },
    {
      id: 'confirmed',
      title: 'Booking Confirmed',
      description: 'We have confirmed your booking',
      icon: '✅'
    },
    {
      id: 'in_progress',
      title: 'Service in Progress',
      description: 'Your pet is being cared for',
      icon: '🕐'
    },
    {
      id: 'completed',
      title: 'Service Completed',
      description: 'Your service has been completed',
      icon: '🎉'
    }
  ];

  // Handle cancelled status
  if (currentStatus === 'cancelled') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-lg">❌</span>
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
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index <= validCurrentIndex;
            const isCurrent = index === validCurrentIndex;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  {/* Circle */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300
                    ${isCompleted 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-500'
                    }
                    ${isCurrent ? 'ring-4 ring-green-200 animate-pulse' : ''}
                  `}>
                    {isCompleted ? '✓' : step.icon}
                  </div>
                  
                  {/* Text */}
                  <div className="mt-3 text-center">
                    <div className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
                
                {/* Connecting Line */}
                {!isLast && (
                  <div className={`
                    flex-1 h-1 mx-4 transition-all duration-300
                    ${index < validCurrentIndex ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Timeline */}
      <div className="md:hidden space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index <= validCurrentIndex;
          const isCurrent = index === validCurrentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start">
              {/* Circle and Line */}
              <div className="flex flex-col items-center mr-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-500'
                  }
                  ${isCurrent ? 'ring-4 ring-green-200 animate-pulse' : ''}
                `}>
                  {isCompleted ? '✓' : step.icon}
                </div>
                
                {!isLast && (
                  <div className={`
                    w-0.5 h-8 mt-2 transition-all duration-300
                    ${index < validCurrentIndex ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-4">
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
