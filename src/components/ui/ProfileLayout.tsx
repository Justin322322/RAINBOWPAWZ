import React from 'react';

interface ProfileLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  className?: string;
  showSkeleton?: boolean;
}

interface ProfileSectionProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  headerClassName?: string;
  action?: React.ReactNode;
  showSkeleton?: boolean;
}

interface ProfileCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  noPadding?: boolean;
}

interface ProfileFieldProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

interface ProfileFormGroupProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

// Main Profile Layout Component
export const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  children,
  title,
  subtitle,
  icon,
  className = '',
  showSkeleton = false
}) => {
  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      <div className="space-y-8">
        {/* Page Header */}
        <ProfileCard className="bg-gradient-to-r from-[var(--primary-green)] to-[var(--primary-green-hover)]">
          {showSkeleton ? (
            /* Header Skeleton */
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <div className="w-8 h-8 bg-white/30 rounded animate-pulse"></div>
              </div>
              <div className="text-white space-y-2">
                <div className="h-8 bg-white/30 rounded w-64 animate-pulse"></div>
                <div className="h-5 bg-white/20 rounded w-96 animate-pulse"></div>
              </div>
            </div>
          ) : (
            /* Actual Header Content */
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                {icon}
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">{title}</h1>
                <p className="text-white/90 text-lg">{subtitle}</p>
              </div>
            </div>
          )}
        </ProfileCard>

        {children}
      </div>
    </div>
  );
};

// Profile Section Component
export const ProfileSection: React.FC<ProfileSectionProps> = ({
  children,
  title,
  subtitle,
  className = '',
  headerClassName = '',
  action,
  showSkeleton = false
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className={`flex items-center justify-between ${headerClassName}`}>
        {showSkeleton ? (
          /* Section Header Skeleton */
          <div>
            <div className="h-8 bg-gray-200 rounded w-44 mb-2 animate-pulse"></div>
            {subtitle && (
              <div className="h-5 bg-gray-200 rounded w-80 animate-pulse"></div>
            )}
          </div>
        ) : (
          /* Actual Section Header */
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
            {subtitle && (
              <p className="text-gray-600 text-base">{subtitle}</p>
            )}
          </div>
        )}
        {action && !showSkeleton && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

// Profile Card Component
export const ProfileCard: React.FC<ProfileCardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  noPadding = false
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-visible ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4 sm:p-6'}>
        {children}
      </div>
    </div>
  );
};

// Profile Field Component
export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  icon,
  className = '',
  valueClassName = ''
}) => {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 sm:p-4 ${className}`}>
      <div className="flex items-center mb-2">
        {icon && <div className="text-gray-500 mr-2">{icon}</div>}
        <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</h4>
      </div>
      <div className={`text-base font-semibold ${valueClassName || 'text-gray-900'}`}>
        {value || 'Not provided'}
      </div>
    </div>
  );
};

// Profile Form Group Component
export const ProfileFormGroup: React.FC<ProfileFormGroupProps> = ({
  children,
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-b border-gray-200 pb-3">
        <h4 className="text-lg font-medium text-gray-900">{title}</h4>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// Profile Grid Component
export const ProfileGrid: React.FC<{ children: React.ReactNode; cols?: number; className?: string }> = ({
  children,
  cols = 2,
  className = ''
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[cols as keyof typeof gridCols]} gap-6 ${className}`}>
      {children}
    </div>
  );
};


