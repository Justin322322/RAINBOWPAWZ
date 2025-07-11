'use client';

import {
  LoadingSpinner as CentralizedLoadingSpinner,
  StatsCardSkeleton as CentralizedStatsCardSkeleton,
  TableSkeleton as CentralizedTableSkeleton
} from '@/components/ui/LoadingComponents';

// Re-export centralized components for backward compatibility
export const LoadingSpinner = CentralizedLoadingSpinner;

// Re-export centralized components for backward compatibility
export const StatsCardSkeleton = CentralizedStatsCardSkeleton;

export const TableSkeleton = CentralizedTableSkeleton;
