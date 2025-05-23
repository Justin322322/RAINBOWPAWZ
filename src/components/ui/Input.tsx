'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';
import { cva, type VariantProps } from 'class-variance-authority';

// Define input variants
const inputVariants = cva(
  "flex w-full border border-gray-300 bg-white text-gray-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-green)] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-8 text-xs px-3 py-1",
        md: "h-10 text-sm px-4 py-2",
        lg: "h-12 text-base px-4 py-3",
      },
      rounded: {
        default: "rounded-md",
        full: "rounded-full",
        none: "rounded-none",
      },
      variant: {
        default: "border-gray-300",
        error: "border-red-500 focus-visible:ring-red-500",
      },
    },
    defaultVariants: {
      size: "md",
      rounded: "default",
      variant: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    size, 
    rounded,
    variant,
    label,
    error,
    leftIcon,
    rightIcon,
    fullWidth = true,
    containerClassName,
    labelClassName,
    errorClassName,
    required,
    ...props 
  }, ref) => {
    // If there's an error, set the variant to error
    const inputVariant = error ? "error" : variant;
    
    return (
      <div className={cn("space-y-2", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label 
            htmlFor={props.id} 
            className={cn(
              "block text-sm font-medium text-gray-700",
              labelClassName
            )}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            className={cn(
              inputVariants({ size, rounded, variant: inputVariant }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className={cn("text-sm text-red-500", errorClassName)}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };
