// This file contains reusable UI components and code snippets for the admin services page
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import SectionLoader from '@/components/ui/SectionLoader';
import PageLoader from '@/components/ui/PageLoader';

/**
 * Loading Spinner Component with consistent styling throughout the application
 * @param {string} [message] - Optional loading message to display below the spinner
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [fullScreen] - Whether to display as a full screen loader
 */
type LoadingSpinnerProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
};

// Using our standardized loading components
export const LoadingSpinner = ({
  message = 'Loading...',
  className = '',
  fullScreen = false
}: LoadingSpinnerProps) => {
  if (fullScreen) {
    return (
      <PageLoader
        message={message}
        fullScreen={true}
        className={className}
        spinnerSize="lg"
        spinnerColor="primary"
        withOverlay={true}
      />
    );
  }

  return (
    <SectionLoader
      message={message}
      className={className}
      spinnerSize="md"
      spinnerColor="primary"
      minHeight="min-h-[200px]"
      withBackground={true}
      withShadow={false}
      rounded={true}
    />
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