'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-gray-50 text-gray-900 border-gray-200",
        info: "bg-blue-50 text-blue-800 border-blue-200",
        success: "bg-green-50 text-green-800 border-green-200",
        warning: "bg-amber-50 text-amber-800 border-amber-200",
        error: "bg-red-50 text-red-800 border-red-200",
      },
      size: {
        sm: "text-xs p-2",
        md: "text-sm p-4",
        lg: "text-base p-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className, 
    variant, 
    size,
    title,
    icon,
    onClose,
    dismissible = false,
    children,
    ...props 
  }, ref) => {
    // Default icons based on variant
    const getDefaultIcon = () => {
      switch (variant) {
        case 'info':
          return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
        case 'success':
          return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
        case 'warning':
          return <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />;
        case 'error':
          return <XCircleIcon className="h-5 w-5 text-red-500" />;
        default:
          return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
      }
    };

    const displayIcon = icon || getDefaultIcon();

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, size }), className)}
        {...props}
      >
        {(dismissible || onClose) && (
          <button
            type="button"
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        
        <div className="flex">
          {displayIcon && (
            <div className="flex-shrink-0 mr-3">
              {displayIcon}
            </div>
          )}
          
          <div className={cn(dismissible && "pr-6")}>
            {title && (
              <h3 className="text-sm font-medium mb-1">
                {title}
              </h3>
            )}
            <div className={cn(
              "text-sm",
              size === "sm" && "text-xs",
              size === "lg" && "text-base"
            )}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert };
