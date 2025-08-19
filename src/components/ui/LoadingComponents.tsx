'use client';

import React, { memo } from 'react';
import { SectionLoader } from '@/components/ui/SectionLoader';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/SkeletonLoader';

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
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
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






