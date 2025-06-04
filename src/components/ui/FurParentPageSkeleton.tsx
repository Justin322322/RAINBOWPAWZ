'use client';

import React, { memo } from 'react';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

interface FurParentPageSkeletonProps {
  type?: 'services' | 'bookings' | 'cart' | 'checkout' | 'profile' | 'package';
}

export default memo(function FurParentPageSkeleton({ type = 'services' }: FurParentPageSkeletonProps) {
  // Simplified skeleton rendering using optimized SkeletonCard components
  const renderSkeleton = () => {
    switch (type) {
      case 'services':
        return renderServicesPageSkeleton();
      case 'bookings':
        return renderBookingsPageSkeleton();
      case 'cart':
        return renderCartPageSkeleton();
      case 'checkout':
        return renderCheckoutPageSkeleton();
      case 'profile':
        return renderProfilePageSkeleton();
      case 'package':
        return renderPackagePageSkeleton();
      default:
        return renderServicesPageSkeleton();
    }
  };

  // Simplified services page skeleton
  const renderServicesPageSkeleton = () => (
    <div className="space-y-8">
      {/* Hero section */}
      <SkeletonCard
        withImage={true}
        imageHeight="h-32"
        withHeader={true}
        contentLines={2}
        withFooter={false}
        withShadow={true}
        rounded="lg"
        animate={true}
      />

      {/* Map section */}
      <SkeletonCard
        withImage={true}
        imageHeight="h-[500px]"
        withHeader={true}
        contentLines={1}
        withFooter={false}
        withShadow={true}
        rounded="lg"
        animate={true}
      />

      {/* Service Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard
            key={i}
            withImage={true}
            imageHeight="h-14"
            withHeader={true}
            contentLines={3}
            withFooter={true}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        ))}
      </div>
    </div>
  );

  // Simplified bookings page skeleton
  const renderBookingsPageSkeleton = () => (
    <div className="space-y-8">
      {/* Page header */}
      <SkeletonCard
        withHeader={true}
        contentLines={1}
        withFooter={true}
        withShadow={false}
        rounded="lg"
        animate={true}
      />

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-md w-24 animate-pulse" />
        ))}
      </div>

      {/* Booking cards */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard
            key={i}
            withHeader={true}
            contentLines={4}
            withFooter={true}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        ))}
      </div>
    </div>
  );

  // Simplified cart page skeleton
  const renderCartPageSkeleton = () => (
    <div className="space-y-8">
      {/* Back button and header */}
      <SkeletonCard
        withHeader={true}
        contentLines={1}
        withFooter={false}
        withShadow={false}
        rounded="lg"
        animate={true}
      />

      {/* Cart items and summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard
            withHeader={true}
            contentLines={6}
            withFooter={false}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        </div>
        <div className="lg:col-span-1">
          <SkeletonCard
            withHeader={true}
            contentLines={8}
            withFooter={true}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        </div>
      </div>
    </div>
  );

  // Simplified checkout page skeleton
  const renderCheckoutPageSkeleton = () => (
    <div className="space-y-8">
      {/* Back button and header */}
      <SkeletonCard
        withHeader={true}
        contentLines={1}
        withFooter={false}
        withShadow={false}
        rounded="lg"
        animate={true}
      />

      {/* Checkout form and summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard
            withHeader={true}
            contentLines={8}
            withFooter={false}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        </div>
        <div className="lg:col-span-1">
          <SkeletonCard
            withHeader={true}
            contentLines={6}
            withFooter={true}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        </div>
      </div>
    </div>
  );

  // Simplified profile page skeleton
  const renderProfilePageSkeleton = () => (
    <div className="space-y-8">
      <SkeletonCard
        withImage={true}
        imageHeight="h-32"
        withHeader={true}
        contentLines={4}
        withFooter={true}
        withShadow={true}
        rounded="lg"
        animate={true}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <SkeletonCard
            key={i}
            withHeader={true}
            contentLines={6}
            withFooter={false}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        ))}
      </div>
    </div>
  );

  // Simplified package page skeleton
  const renderPackagePageSkeleton = () => (
    <div className="space-y-8">
      <SkeletonCard
        withImage={true}
        imageHeight="h-64"
        withHeader={true}
        contentLines={3}
        withFooter={true}
        withShadow={true}
        rounded="lg"
        animate={true}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard
            key={i}
            withHeader={true}
            contentLines={4}
            withFooter={true}
            withShadow={true}
            rounded="lg"
            animate={true}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full animate-pulse">
      {renderSkeleton()}
    </div>
  );
});
