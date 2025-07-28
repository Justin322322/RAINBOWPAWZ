'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/utils/classNames';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectInputProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

const SelectInput = forwardRef<HTMLDivElement, SelectInputProps>(
  ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    error,
    className = '',
    containerClassName = '',
    labelClassName = '',
    errorClassName = '',
    disabled = false,
    required = false,
    id,
    name,
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    
    const selectedOption = options.find(option => option.value === value);
    
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    
    return (
      <div className={cn("space-y-2", containerClassName)} ref={ref || selectRef}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {!required && <span className="text-gray-500 text-xs">(optional)</span>}
          </label>
        )}
        
        <div className="relative">
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] transition-colors",
              isOpen && "ring-2 ring-[var(--primary-green)] border-[var(--primary-green)]",
              error && "border-red-500 focus:ring-red-500",
              disabled && "opacity-50 cursor-not-allowed bg-gray-100",
              className
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDownIcon
              className={cn(
                "w-5 h-5 text-gray-400 transition-transform duration-200",
                isOpen && "transform rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
          
          {isOpen && !disabled && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              <ul className="py-1">
                {options.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors",
                        option.value === value && "bg-[var(--primary-green-bg)] text-[var(--primary-green)] font-medium",
                        option.disabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (!option.disabled) {
                          onChange(option.value);
                          setIsOpen(false);
                        }
                      }}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {error && (
          <p className={cn("text-sm text-red-500", errorClassName)}>
            {error}
          </p>
        )}
        
        {/* Hidden input for form submission */}
        {name && (
          <input 
            type="hidden" 
            name={name} 
            value={value || ''} 
          />
        )}
      </div>
    );
  }
);

SelectInput.displayName = "SelectInput";

export { SelectInput };
