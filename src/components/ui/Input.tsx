'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';
import { cva, type VariantProps } from 'class-variance-authority';

// Define input variants with improved mobile touch targets
const inputVariants = cva(
  "flex w-full border border-gray-300 bg-white text-gray-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-green,#10b981)] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-11 text-xs px-3 py-2 xs:h-9 xs:text-xs xs:px-2.5 xs:py-1.5",
        md: "h-12 text-sm px-4 py-3 xs:h-11 xs:text-sm xs:px-3 xs:py-2.5",
        lg: "h-14 text-base px-4 py-3.5 xs:h-13 xs:text-base xs:px-4 xs:py-3",
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

interface InputProps
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
  hideOptionalHint?: boolean;
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
    hideOptionalHint,
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
            {label} {!required && !hideOptionalHint && <span className="text-gray-500 text-xs">(optional)</span>}
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
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p
            id={`${props.id || 'input'}-error`}
            className={cn("text-sm text-red-500", errorClassName)}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
