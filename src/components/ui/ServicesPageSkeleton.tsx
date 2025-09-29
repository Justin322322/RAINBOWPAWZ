'use client';

import React from 'react';
import { motion } from 'framer-motion';

const ServicesPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section Skeleton */}
      <div className="relative py-16 bg-[var(--primary-green)] -mt-20 md:-mt-24 pt-36 md:pt-40">
        <div className="absolute inset-0 bg-[url('/bg_4.png')] bg-repeat opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="h-12 bg-white/20 rounded-lg mx-auto max-w-4xl animate-pulse"></div>
            <div className="h-6 bg-white/20 rounded-lg mx-auto max-w-2xl animate-pulse"></div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-8 -mt-16 relative z-20">
            
            {/* Filters Skeleton */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>

            {/* Content Grid Skeleton */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Services List Skeleton */}
              <div className="lg:w-1/4 xl:w-1/3">
                <div className="bg-white rounded-lg shadow-md border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="border rounded-lg p-3 animate-pulse">
                        <div className="flex justify-between items-start mb-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-5 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                          <div className="flex-1 h-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map Skeleton */}
              <div className="lg:w-3/4 xl:w-2/3">
                <div className="bg-white rounded-lg shadow-md border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                  <div className="p-4">
                    <div className="w-full h-[500px] bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 bg-gray-300 rounded-full animate-pulse"></div>
                        <div className="h-4 bg-gray-300 rounded w-32 mx-auto animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesPageSkeleton;
