'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800 hover:bg-gray-200/80",
        primary: "bg-[--primary-green-bg] text-[--primary-green] hover:bg-[--primary-green-bg]/80 [--primary-green-bg:theme(colors.emerald.50)] [--primary-green:theme(colors.emerald.600)]",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200/80",
        success: "bg-green-100 text-green-800 hover:bg-green-200/80",
        warning: "bg-amber-100 text-amber-800 hover:bg-amber-200/80",
        danger: "bg-red-100 text-red-800 hover:bg-red-200/80",
        info: "bg-blue-100 text-blue-800 hover:bg-blue-200/80",
        outline: "bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-100",
      },
      size: {
        xs: "text-xs px-2 py-0.5",
        sm: "text-xs px-2.5 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-sm px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size,
    icon,
    removable = false,
    onRemove,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {icon && (
          <span className="mr-1.5 -ml-0.5">
            {icon}
          </span>
        )}
        {children}
        {removable && onRemove && (
          <button
            type="button"
            className="ml-1.5 -mr-0.5 hover:bg-gray-200/50 rounded-full p-0.5"
            onClick={onRemove}
            aria-label="Remove badge"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3 w-3" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
