'use client';

import React from 'react';

/**
 * A completely static skeleton for the cremation dashboard
 * This will be shown during page load to prevent flicker
 */
export default function CremationStaticSkeleton() {
  return (
    <div className="no-flicker-skeleton min-h-screen bg-gray-50">
      {/* Static Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-10">
        <div className="p-4 border-b">
          <div className="h-10 skeleton-item w-3/4 mx-auto"></div>
        </div>
        <div className="p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mb-2 p-2 rounded-md skeleton-bg">
              <div className="h-6 skeleton-item w-full"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="pl-64">
        {/* Static Navbar */}
        <div className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
          <div className="h-6 skeleton-item w-1/4"></div>
          <div className="ml-auto h-8 skeleton-item w-40"></div>
        </div>

        {/* Static Content */}
        <div className="p-6">
          {/* Welcome section */}
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="h-8 skeleton-item w-1/3 mb-2"></div>
                <div className="h-4 skeleton-item w-2/3"></div>
              </div>
              <div className="h-10 skeleton-item w-40"></div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full skeleton-item mr-4"></div>
                  <div className="w-full">
                    <div className="h-4 skeleton-item w-1/2 mb-2"></div>
                    <div className="h-6 skeleton-item w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Content area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 h-64">
              <div className="h-6 skeleton-item w-1/3 mb-4"></div>
              <div className="h-40 skeleton-item w-full"></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 h-64">
              <div className="h-6 skeleton-item w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 skeleton-item w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
