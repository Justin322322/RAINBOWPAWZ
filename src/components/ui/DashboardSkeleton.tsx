'use client';

import React, { memo } from 'react';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

interface DashboardSkeletonProps {
  type?: 'admin' | 'cremation' | 'furparent';
}

export default memo(function DashboardSkeleton({ type = 'admin' }: DashboardSkeletonProps) {

  // Simplified skeleton rendering using optimized components
  const renderAdminOrCremationSkeleton = () => (
    <div className="space-y-8">
      {/* Welcome section */}
      <SkeletonCard
        withHeader={true}
        contentLines={1}
        withFooter={false}
        withShadow={true}
        rounded="lg"
        animate={true}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard
            key={i}
            withHeader={false}
            contentLines={2}
            withFooter={false}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard
          withHeader={true}
          contentLines={5}
          withFooter={false}
          withShadow={true}
          rounded="lg"
          animate={true}
          className="h-64"
        />
        <SkeletonCard
          withHeader={true}
          contentLines={5}
          withFooter={false}
          withShadow={true}
          rounded="lg"
          animate={true}
          className="h-64"
        />
      </div>
    </div>
  );

  // Simplified fur parent skeleton
  const renderFurParentSkeleton = () => (
    <div className="space-y-8">
      {/* Hero section */}
      <SkeletonCard
        withImage={true}
        imageHeight="h-48"
        withHeader={true}
        contentLines={3}
        withFooter={true}
        withShadow={true}
        rounded="lg"
        animate={true}
      />

      {/* Services section */}
      <div className="space-y-4">
        <SkeletonCard
          withHeader={true}
          contentLines={1}
          withFooter={false}
          withShadow={false}
          rounded="lg"
          animate={true}
          className="bg-transparent shadow-none"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard
              key={i}
              withImage={true}
              imageHeight="h-12"
              withHeader={true}
              contentLines={2}
              withFooter={true}
              withShadow={true}
              rounded="lg"
              animate={true}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full animate-pulse">
      {type === 'furparent' ? renderFurParentSkeleton() : renderAdminOrCremationSkeleton()}
    </div>
  );
});
