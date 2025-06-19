'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
  checkboxSize?: 'sm' | 'md' | 'lg';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    label,
    description,
    error,
    containerClassName,
    labelClassName,
    descriptionClassName,
    errorClassName,
    checkboxSize = 'md',
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };
    
    const labelSizeClasses = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    };
    
    return (
      <div className={cn("flex items-start", containerClassName)}>
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              "focus:ring-[var(--primary-green)] text-[var(--primary-green)] border-gray-300 rounded",
              error && "border-red-500",
              sizeClasses[checkboxSize],
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        
        {(label || description || error) && (
          <div className="ml-3 text-sm">
            {label && (
              <label 
                htmlFor={props.id} 
                className={cn(
                  "font-medium text-gray-700",
                  labelSizeClasses[checkboxSize],
                  props.disabled && "opacity-50",
                  labelClassName
                )}
              >
                {label}
              </label>
            )}
            
            {description && (
              <p className={cn(
                "text-gray-500",
                labelSizeClasses[checkboxSize] === "text-base" ? "text-sm" : "text-xs",
                props.disabled && "opacity-50",
                descriptionClassName
              )}>
                {description}
              </p>
            )}
            
            {error && (
              <p className={cn("text-sm text-red-500", errorClassName)}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
