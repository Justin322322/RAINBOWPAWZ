'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';
import { cva, type VariantProps } from 'class-variance-authority';

// Define textarea variants
const textareaVariants = cva(
  "flex w-full min-h-[80px] border border-gray-300 bg-white text-gray-900 transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-green)] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 p-3",
  {
    variants: {
      rounded: {
        default: "rounded-md",
        none: "rounded-none",
      },
      variant: {
        default: "border-gray-300",
        error: "border-red-500 focus-visible:ring-red-500",
      },
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        horizontal: "resize-x",
        both: "resize",
      },
    },
    defaultVariants: {
      rounded: "default",
      variant: "default",
      resize: "vertical",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  required?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    rounded,
    variant,
    resize,
    label,
    error,
    fullWidth = true,
    containerClassName,
    labelClassName,
    errorClassName,
    required,
    ...props 
  }, ref) => {
    // If there's an error, set the variant to error
    const textareaVariant = error ? "error" : variant;
    
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
        
        <textarea
          className={cn(
            textareaVariants({ rounded, variant: textareaVariant, resize }),
            className
          )}
          ref={ref}
          {...props}
        />
        
        {error && (
          <p className={cn("text-sm text-red-500", errorClassName)}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
