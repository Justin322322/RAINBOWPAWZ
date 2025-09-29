'use client';

import React, { memo } from 'react';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

interface FurParentPageSkeletonProps {
  type?: 'services' | 'bookings' | 'cart' | 'checkout' | 'profile' | 'package' | 'service-detail';
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
      case 'service-detail':
        return renderServiceDetailPageSkeleton();
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

  // Package page skeleton - matches actual layout
  const renderPackagePageSkeleton = () => (
    <div className="space-y-8">
      {/* Back button skeleton */}
      <div className="flex items-center">
        <div className="h-5 w-5 bg-gray-200 rounded mr-2 animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
      
      {/* Package details grid skeleton - matches 2-column layout */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image carousel skeleton */}
          <div className="relative h-80 bg-gray-200 rounded-lg animate-pulse">
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-2.5 w-2.5 bg-gray-300 rounded-full animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Package info skeleton */}
          <div className="space-y-4">
            {/* Title */}
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            
            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            
            {/* Pet types */}
            <div className="space-y-2">
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Inclusions */}
            <div className="space-y-2">
              <div className="h-3 w-28 bg-gray-200 rounded animate-pulse"></div>
              <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="h-3 w-3 bg-gray-200 rounded mr-2 animate-pulse"></div>
                    <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Buttons */}
            <div className="pt-4 space-y-3">
              <div className="h-12 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-12 w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Service detail page skeleton - matches actual layout exactly
  const renderServiceDetailPageSkeleton = () => (
    <div className="min-h-screen">
      {/* Provider Banner Skeleton - matches the actual banner layout exactly */}
      <div className="relative bg-gray-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/bg_2.png')] bg-cover bg-center"></div>
        </div>
        <div className="absolute inset-0 bg-[var(--primary-green-light)] mix-blend-multiply" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-green)] via-transparent to-transparent md:bg-gradient-to-r" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <div className="flex flex-col items-center lg:items-start gap-3 lg:gap-4 mb-4">
                {/* Provider name - matches text-2xl sm:text-3xl md:text-4xl lg:text-5xl */}
                <div className="h-8 sm:h-10 md:h-12 lg:h-14 w-3/4 bg-white/20 rounded-lg animate-pulse"></div>
                {/* Rating badge */}
                <div className="flex-shrink-0 flex items-center bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  <div className="h-5 w-5 bg-white/20 rounded mr-2 animate-pulse"></div>
                  <div className="h-4 w-8 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
              {/* Address with icon */}
              <div className="mt-3 lg:mt-4 flex items-center justify-center lg:justify-start">
                <div className="h-4 w-4 lg:h-5 lg:w-5 bg-white/20 rounded mr-2 animate-pulse"></div>
                <div className="h-4 lg:h-5 w-full bg-white/20 rounded animate-pulse"></div>
              </div>
              {/* Hours with icon */}
              <div className="mt-2 lg:mt-2 flex items-center justify-center lg:justify-start">
                <div className="h-4 w-4 lg:h-5 lg:w-5 bg-white/20 rounded mr-2 animate-pulse"></div>
                <div className="h-4 lg:h-5 w-2/3 bg-white/20 rounded animate-pulse"></div>
              </div>
              {/* Description with border */}
              <div className="mt-6 lg:mt-8 border-l-4 border-white/30 pl-4 lg:pl-6 max-w-md mx-auto lg:mx-0">
                <div className="h-4 lg:h-5 w-full bg-white/20 rounded animate-pulse mb-1"></div>
                <div className="h-4 lg:h-5 w-3/4 bg-white/20 rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Map Section - Right Side */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2 mb-6 lg:mb-0">
              <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-300 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button and Tabs */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="flex items-center justify-center sm:justify-start">
              <div className="h-5 w-5 bg-gray-200 rounded mr-2 animate-pulse"></div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg self-center sm:self-auto">
              <div className="px-3 sm:px-4 py-2 bg-white rounded-md shadow">
                <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="px-3 sm:px-4 py-2">
                <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Packages Section */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="h-8 sm:h-10 md:h-12 w-48 bg-gray-200 rounded animate-pulse text-center md:text-left mb-4 md:mb-0"></div>
              <div className="flex items-center justify-center md:justify-start">
                <div className="mr-2 h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="relative">
                  <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gray-300 mb-8"></div>

            {/* Packages Carousel */}
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="p-2 rounded-full bg-[var(--primary-green)]">
                  <div className="h-6 w-6 bg-white/20 rounded animate-pulse"></div>
                </div>
 
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full mx-2 sm:mx-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="h-48 relative overflow-hidden bg-gray-100">
                        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
                        {/* Price Badge */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                          <div className="h-5 w-16 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                      </div>

                      <div className="p-5">
                        {/* Package Name */}
                        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2 animate-pulse"></div>

                        {/* Package Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="h-5 w-16 bg-green-100 rounded-full animate-pulse"></div>
                          <div className="h-5 w-20 bg-green-100 rounded-full animate-pulse"></div>
                          <div className="h-5 w-18 bg-green-100 rounded-full animate-pulse"></div>
                        </div>

                        {/* Description Preview */}
                        <div className="space-y-1 mb-3">
                          <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                        </div>

                        {/* Key Inclusions */}
                        <div className="mb-4">
                          <div className="h-3 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <div className="h-3 w-3 bg-gray-200 rounded mr-2 animate-pulse"></div>
                              <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="flex items-center">
                              <div className="h-3 w-3 bg-gray-200 rounded mr-2 animate-pulse"></div>
                              <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="flex items-center">
                              <div className="h-3 w-3 bg-gray-200 rounded mr-2 animate-pulse"></div>
                              <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </div>

                        {/* Supported Pet Types */}
                        <div className="mb-4">
                          <div className="h-3 w-20 bg-gray-200 rounded mb-2 animate-pulse"></div>
                          <div className="flex flex-wrap gap-1">
                            <div className="h-5 w-12 bg-green-100 rounded animate-pulse"></div>
                            <div className="h-5 w-14 bg-green-100 rounded animate-pulse"></div>
                            <div className="h-5 w-10 bg-green-100 rounded animate-pulse"></div>
                          </div>
                        </div>

                        {/* Weight-Based Pricing or Kg Price */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center mb-2">
                            <div className="h-4 w-4 bg-gray-200 rounded mr-2 animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="w-full px-4 py-3 bg-[var(--primary-green)] rounded-lg">
                          <div className="h-4 w-32 bg-white/20 rounded mx-auto animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2 rounded-full bg-[var(--primary-green)]">
                  <div className="h-6 w-6 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Pagination dots */}
              <div className="flex justify-center space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full animate-pulse">
      {renderSkeleton()}
    </div>
  );
});
