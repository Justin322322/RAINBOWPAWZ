'use client';

import React from 'react';
import SectionLoader from '@/components/ui/SectionLoader';
import PageLoader from '@/components/ui/PageLoader';
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/SkeletonLoader';
import { cn } from '@/utils/classNames';

/**
 * Loading Spinner Component with consistent styling for the cremation module
 * @param {string} [message] - Optional loading message to display below the spinner
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [fullScreen] - Whether to display as a full screen loader
 */
type LoadingSpinnerProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
};

// Using our standardized loading components
export const LoadingSpinner = ({
  message = 'Loading...',
  className = '',
  fullScreen = false
}: LoadingSpinnerProps) => {
  if (fullScreen) {
    return (
      <PageLoader
        message={message}
        fullScreen={true}
        className={className}
        spinnerSize="lg"
        spinnerColor="primary"
        withOverlay={true}
      />
    );
  }

  return (
    <SectionLoader
      message={message}
      className={className}
      spinnerSize="md"
      spinnerColor="primary"
      minHeight="min-h-[200px]"
      withBackground={true}
      withShadow={false}
      rounded={true}
    />
  );
};

/**
 * Stats Card Skeleton for loading states
 */
export const StatsCardSkeleton = ({ count = 4 }: { count?: number }) => {
  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <SkeletonCard
          key={index}
          withHeader={true}
          contentLines={1}
          withFooter={false}
          withShadow={true}
          rounded="lg"
          animate={true}
        />
      ))}
    </>
  );
};

/**
 * Table Skeleton for loading states
 */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6">
        <SkeletonText
          lines={1}
          height="h-6"
          spacing="tight"
          lastLineWidth="1/4"
          className="mb-6"
        />
        <div className="space-y-4">
          {Array(rows).fill(0).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton height="h-12" width="w-12" rounded="full" />
              <div className="flex-1">
                <SkeletonText
                  lines={2}
                  spacing="tight"
                  lastLineWidth="1/2"
                />
              </div>
              <Skeleton height="h-8" width="w-20" rounded="md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Empty State Component for when no items are found
 */
export const EmptyState = ({
  message = 'No items found',
  description = 'There are no items to display at this time.',
  icon,
  className
}: {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("bg-white rounded-xl shadow-sm p-8 text-center", className)}>
    {icon && <div className="text-gray-400 mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-gray-900 mb-1">{message}</h3>
    <p className="text-gray-500 max-w-md mx-auto">{description}</p>
  </div>
);

/**
 * Error Display Component for standardized error handling
 */
export const ErrorDisplay = ({
  message = 'An error occurred',
  description = 'There was a problem loading the data. Please try again later.',
  icon,
  className,
  onRetry
}: {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  onRetry?: () => void;
}) => (
  <div className={cn("bg-white rounded-xl shadow-sm p-8 text-center", className)}>
    {icon && <div className="text-red-400 mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-red-600 mb-1">{message}</h3>
    <p className="text-gray-600 max-w-md mx-auto mb-4">{description}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Try Again
      </button>
    )}
  </div>
);

// Create a named object for the default export
const LoadingComponents = {
  LoadingSpinner,
  StatsCardSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorDisplay
};

export default LoadingComponents;
