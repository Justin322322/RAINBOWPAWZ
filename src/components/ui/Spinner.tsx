'use client';

import React from 'react';
import { cn } from '@/utils/classNames';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray' | 'black';
  className?: string;
  label?: string;
  showLabel?: boolean;
  centered?: boolean;
  fullWidth?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
  label = 'Loading...',
  showLabel = false,
  centered = true,
  fullWidth = false,
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const colorClasses = {
    primary: 'text-[var(--primary-green)]',
    white: 'text-white',
    gray: 'text-gray-500',
    black: 'text-black',
  };

  const labelSizes = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div
      className={cn(
        centered && "flex items-center justify-center",
        fullWidth && "w-full",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center">
        <svg
          className={cn(
            'animate-spin',
            sizeClasses[size],
            colorClasses[color]
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {showLabel && (
          <p className={cn("mt-2 text-gray-600", labelSizes[size])}>
            {label}
          </p>
        )}
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
};

export default Spinner;
