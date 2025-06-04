'use client';

import React, { memo } from 'react';
import SectionLoader from '@/components/ui/SectionLoader';
import PageLoader from '@/components/ui/PageLoader';
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/SkeletonLoader';
import { cn } from '@/utils/classNames';
import { useLoading } from '@/contexts/LoadingContext';

/**
 * Centralized Loading Spinner Component with consistent styling
 * This replaces duplicate implementations across the application
 * @param {string} [message] - Optional loading message to display below the spinner
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [fullScreen] - Whether to display as a full screen loader
 * @param {string} [sectionId] - Unique identifier for section loading to prevent conflicts
 */
type LoadingSpinnerProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
  sectionId?: string;
};

// Centralized loading component to prevent duplicates and conflicts
export const LoadingSpinner = memo(({
  message = 'Loading...',
  className = '',
  fullScreen = false,
  sectionId
}: LoadingSpinnerProps) => {
  const { activeSections } = useLoading();
  
  // Prevent multiple loading indicators for the same section
  if (sectionId && activeSections.has(sectionId)) {
    const existingSection = activeSections.get(sectionId);
    if (existingSection && existingSection.isLoading) {
      return null; // Prevent duplicate loaders
    }
  }

  if (fullScreen) {
    return (
      <PageLoader
        message={message}
        fullScreen={true}
        className={className}
        spinnerSize="lg"
        spinnerColor="primary"
        withOverlay={true}
        withAnimation={true}
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
      withAnimation={true}
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Optimized Stats Card Skeleton for loading states
 * Memoized to prevent unnecessary re-renders
 */
export const StatsCardSkeleton = memo(({ count = 4 }: { count?: number }) => {
  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <SkeletonCard
          key={`stats-skeleton-${index}`}
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
});

StatsCardSkeleton.displayName = 'StatsCardSkeleton';

/**
 * Optimized Table Skeleton for loading states
 * Memoized to prevent unnecessary re-renders
 */
export const TableSkeleton = memo(({ rows = 5 }: { rows?: number }) => {
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
            <div key={`table-row-skeleton-${index}`} className="flex items-center space-x-4">
              <Skeleton height="h-12" width="w-12" rounded="full" animate={true} />
              <div className="flex-1">
                <SkeletonText
                  lines={2}
                  spacing="tight"
                  lastLineWidth="1/2"
                  animate={true}
                />
              </div>
              <Skeleton height="h-8" width="w-20" rounded="md" animate={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

TableSkeleton.displayName = 'TableSkeleton';

/**
 * Empty State Component for when no data is found
 */
export const EmptyState = memo(({ 
  message = "No data found",
  description = "Try adjusting your search criteria or check back later.",
  icon: Icon,
  className = ""
}: {
  message?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={cn("px-6 py-8 text-center", className)}>
    {Icon && <Icon className="h-16 w-16 mx-auto text-gray-300 mb-4" />}
    <h3 className="text-lg font-medium text-gray-700 mb-2">{message}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

/**
 * Error Display Component for error states
 */
export const ErrorDisplay = memo(({
  title = "Something went wrong",
  message = "An error occurred while loading data.",
  onRetry,
  className = ""
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) => (
  <div className={cn("px-6 py-8 text-center", className)}>
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>
    <p className="text-red-700 text-sm mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        Try Again
      </button>
    )}
  </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

// Create a named object for the default export
const LoadingComponents = {
  LoadingSpinner,
  StatsCardSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorDisplay
};

export default LoadingComponents;
