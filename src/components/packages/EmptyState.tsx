'use client';

import React from 'react';

interface EmptyStateProps {
  hasFilters: boolean;
  onCreatePackage: () => void;
  onRefresh?: () => void;
  isCreatingPackage?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasFilters,
  onCreatePackage,
  onRefresh,
  isCreatingPackage = false
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div className="mx-auto h-24 w-24 text-gray-400 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl">
        <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
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
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-2xl shadow-sm text-sm font-medium text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          disabled={isCreatingPackage}
        >
          {isCreatingPackage ? (
            <div className="animate-spin -ml-1 mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
          ) : null}
          {isCreatingPackage ? 'Creating...' : 'Create Package'}
        </button>

        {hasFilters && onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-2xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};
