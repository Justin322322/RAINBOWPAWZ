// This file contains reusable UI components and code snippets for the admin services page
import { ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Loading Spinner Component with consistent styling throughout the application
 * @param {string} [message] - Optional loading message to display below the spinner
 * @param {string} [size='md'] - Size of the spinner (sm, md, lg)
 * @param {string} [className] - Additional CSS classes
 */
type LoadingSpinnerProps = {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
};

export const LoadingSpinner = ({
  message = 'Loading...',
  size = 'md',
  className = '',
  fullScreen = false
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? 'min-h-screen' : 'min-h-[200px] py-12'
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <ArrowPathIcon
        className={`${sizeClasses[size]} text-[var(--primary-green)] animate-spin mb-4`}
        aria-hidden="true"
      />
      {message && (
        <p className={`text-gray-600 ${textSizes[size]}`}>
          {message}
        </p>
      )}
      {/* Screen reader text */}
      <span className="sr-only">Loading{message ? ` ${message}` : ''}...</span>
    </div>
  );
};

/**
 * Empty State Component for when no services are found
 */
export const EmptyState = () => (
  <div className="px-6 py-8 text-center">
    <p className="text-gray-500 text-sm">No services match your search criteria.</p>
  </div>
);