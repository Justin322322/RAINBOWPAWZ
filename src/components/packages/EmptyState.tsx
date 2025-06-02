'use client';

import React from 'react';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  hasFilters: boolean;
  onCreatePackage: () => void;
  onRefresh?: () => void;
  isCreatingPackage: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasFilters,
  onCreatePackage,
  onRefresh,
  isCreatingPackage
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
      <div className="mx-auto h-24 w-24 text-gray-400 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl">
        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">No packages found</h3>
      <p className="mt-2 text-gray-500">
        {hasFilters
          ? 'No packages match your search criteria. Try adjusting your filters.'
          : 'Get started by creating your first service package.'}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onCreatePackage}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          disabled={isCreatingPackage}
        >
          {isCreatingPackage ? (
            <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
          ) : (
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          )}
          {isCreatingPackage ? 'Creating...' : 'Create Package'}
        </button>
        
        {hasFilters && onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};
