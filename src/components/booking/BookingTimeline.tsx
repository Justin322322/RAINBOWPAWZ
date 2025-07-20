'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,

  DocumentCheckIcon,
  XCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: {
    bg: string;
    text: string;
    border: string;
    progress: string;
  };
}

interface BookingTimelineProps {
  currentStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  className?: string;
  showCertificateButton?: boolean;
  onShowCertificate?: () => void;
}

const BookingTimeline: React.FC<BookingTimelineProps> = ({
  currentStatus,
  className = '',
  showCertificateButton = false,
  onShowCertificate
}) => {
  const steps: TimelineStep[] = [
    {
      id: 'pending',
      title: 'Booking Received',
      description: 'Your booking has been submitted and is being reviewed',
      icon: ClockIcon,
      color: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        progress: 'bg-amber-500'
      }
    },
    {
      id: 'confirmed',
      title: 'Booking Confirmed',
      description: 'We have confirmed your booking and scheduled your service',
      icon: CheckCircleIcon,
      color: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        progress: 'bg-blue-500'
      }
    },
    {
      id: 'in_progress',
      title: 'Service in Progress',
      description: 'Your beloved pet is being cared for with dignity and respect',
      icon: SparklesIcon,
      color: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        progress: 'bg-purple-500'
      }
    },
    {
      id: 'completed',
      title: 'Service Completed',
      description: 'Your service has been completed with care and compassion',
      icon: DocumentCheckIcon,
      color: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        progress: 'bg-emerald-500'
      }
    }
  ];

  // Handle cancelled status
  if (currentStatus === 'cancelled') {
    return (
      <motion.div
        className={`bg-red-50 border-2 border-red-200 rounded-xl p-8 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start space-x-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-red-800 mb-2">Booking Cancelled</h3>
            <p className="text-red-700 leading-relaxed">
              This booking has been cancelled. If you have any questions or need assistance,
              please don&apos;t hesitate to contact our support team.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentIndex = steps.findIndex(step => step.id === currentStatus);
  const validCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
  const currentStep = steps[validCurrentIndex];

  // Get status message based on current status
  const getStatusMessage = () => {
    switch (currentStatus) {
      case 'pending':
        return 'We have received your booking and will confirm it shortly.';
      case 'confirmed':
        return 'Your booking has been confirmed. We will begin the service soon.';
      case 'in_progress':
        return 'Your beloved pet is currently being cared for with the utmost respect and dignity.';
      case 'completed':
        return 'Your service has been completed. Thank you for trusting us during this difficult time.';
      default:
        return 'Your booking status has been updated.';
    }
  };

  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-8 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Only show on desktop, mobile gets it from modal header */}
      <div className="mb-8 hidden md:block">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Service Progress</h3>
        <p className="text-gray-600">Track your booking journey with us</p>
      </div>

      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="relative px-8">
          {/* Background Progress Line */}
          <div className="timeline-progress-line">
            <motion.div
              className="timeline-progress-fill"
              initial={{ width: '0%' }}
              animate={{
                width: currentStatus === 'completed' ? '100%' :
                       validCurrentIndex === 0 ? '0%' : `${(validCurrentIndex / (steps.length - 1)) * 100}%`
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>

          {/* Steps */}
          <div className="timeline-desktop-grid">
            {steps.map((step, index) => {
              const isCompleted = index <= validCurrentIndex;
              const isCurrent = index === validCurrentIndex && currentStatus !== 'completed';
              const IconComponent = step.icon;

              return (
                <motion.div
                  key={step.id}
                  className="flex flex-col items-center relative z-10"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  {/* Circle */}
                  <motion.div
                    className={`
                      relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-4
                      ${isCompleted
                        ? `${step.color.progress} text-white border-white shadow-lg timeline-step-completed`
                        : isCurrent
                        ? `bg-white ${step.color.border} ${step.color.text} shadow-lg ring-4 ring-opacity-30 ${step.color.bg.replace('bg-', 'ring-')} timeline-step-current`
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}
                    whileHover={{ scale: isCompleted ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <IconComponent className="h-8 w-8" />
                    {isCompleted && (
                      <motion.div
                        className="timeline-check-mark"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.3 }}
                      >
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Text */}
                  <div className="mt-6 text-center">
                    <div className={`text-sm font-semibold mb-2 leading-tight ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs leading-relaxed ${
                      isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Timeline - Simple Vertical Layout */}
      <div className="md:hidden">
        <div className="relative">
          {/* Continuous Vertical Line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200">
            <motion.div
              className="w-full bg-emerald-500"
              initial={{ height: '0%' }}
              animate={{
                height: currentStatus === 'completed' ? '100%' :
                        validCurrentIndex === 0 ? '0%' :
                        `${(validCurrentIndex / (steps.length - 1)) * 100}%`
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => {
              const isCompleted = index <= validCurrentIndex;
              const isCurrent = index === validCurrentIndex && currentStatus !== 'completed';
              const IconComponent = step.icon;

              return (
                <motion.div
                  key={step.id}
                  className="relative flex items-start space-x-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  {/* Circle */}
                  <div
                    className={`
                      relative w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300
                      ${isCompleted
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isCurrent
                        ? `bg-white ${step.color.border} ${step.color.text} border-2`
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}
                  >
                    <IconComponent className="h-5 w-5" />
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="h-3 w-3 text-emerald-500" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`
                      p-4 rounded-lg border transition-all duration-200
                      ${isCompleted || isCurrent
                        ? 'bg-white border-gray-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                      }
                    `}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium text-sm ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </h4>
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed ${
                        isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Current Status Summary - Mobile */}
      <motion.div
        className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200 md:hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 rounded-full mt-1.5 bg-emerald-500"></div>
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-1 text-gray-900">
              Current Status: {currentStep.title}
            </h4>
            <p className="text-sm leading-relaxed text-gray-600">
              {getStatusMessage()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Current Status Message - Desktop */}
      <div className="hidden md:block">
        <motion.div
          className={`mt-8 p-6 rounded-xl border-l-4 ${currentStep.color.bg} ${currentStep.color.border}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <div className="flex items-start space-x-4">
            <div className={`w-3 h-3 rounded-full mt-1 ${currentStep.color.progress} animate-pulse`}></div>
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${currentStep.color.text}`}>
                Current Status: {currentStep.title}
              </h4>
              <p className={`text-sm leading-relaxed ${currentStep.color.text.replace('700', '600')}`}>
                {getStatusMessage()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Certificate Button for Completed Status */}
      {currentStatus === 'completed' && showCertificateButton && onShowCertificate && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          <motion.button
            onClick={onShowCertificate}
            className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:bg-emerald-700 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <DocumentCheckIcon className="h-5 w-5 mr-2" />
            View Certificate
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BookingTimeline;
