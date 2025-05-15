// This file contains reusable UI components and code snippets for the admin services page

/**
 * Loading Spinner Component to be used when content is loading
 */
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="p-3 rounded-full bg-gray-200 animate-pulse">
      <div className="h-8 w-8"></div>
    </div>
    <div className="ml-4 text-gray-500">Loading services...</div>
  </div>
);

/**
 * Empty State Component for when no services are found
 */
export const EmptyState = () => (
  <div className="bg-white rounded-xl shadow-sm p-8 text-center">
    <div className="mx-auto h-12 w-12 text-gray-400">
      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
    <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
    <p className="mt-1 text-sm text-gray-500">No service packages match your current filters.</p>
  </div>
); 