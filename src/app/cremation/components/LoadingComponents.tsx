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

export default {
  LoadingSpinner,
  StatsCardSkeleton,
  TableSkeleton,
  EmptyState
};
