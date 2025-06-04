'use client';

import React from 'react';
import {
  LoadingSpinner as CentralizedLoadingSpinner,
  StatsCardSkeleton as CentralizedStatsCardSkeleton,
  TableSkeleton as CentralizedTableSkeleton,
  EmptyState as CentralizedEmptyState,
  ErrorDisplay as CentralizedErrorDisplay
} from '@/components/ui/LoadingComponents';

// Re-export centralized components for backward compatibility
export const LoadingSpinner = CentralizedLoadingSpinner;

// Re-export centralized components for backward compatibility
export const StatsCardSkeleton = CentralizedStatsCardSkeleton;

export const TableSkeleton = CentralizedTableSkeleton;

export const EmptyState = CentralizedEmptyState;
export const ErrorDisplay = CentralizedErrorDisplay;

// Create a named object for the default export
const LoadingComponents = {
  LoadingSpinner,
  StatsCardSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorDisplay
};

export default LoadingComponents;
