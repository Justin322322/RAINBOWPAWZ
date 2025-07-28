'use client';

import { useState, useEffect } from 'react';

interface PhilippinePhoneInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showFormatPreview?: boolean;
}

/**
 * Format Philippine phone number for display preview
 */
function formatPhilippinePhonePreview(phoneNumber: string): { formatted: string; isValid: boolean } {
  if (!phoneNumber.trim()) {
    return { formatted: '', isValid: false };
  }

  // Remove all non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Handle different input formats
  if (cleanNumber.startsWith('63')) {
    // Already has country code 63
    cleanNumber = cleanNumber.substring(2);
  } else if (cleanNumber.startsWith('0')) {
    // Remove leading 0 (common in Philippine mobile numbers)
    cleanNumber = cleanNumber.substring(1);
  }
  
  // Check if we have exactly 10 digits and starts with 9
  if (cleanNumber.length === 10 && cleanNumber.startsWith('9')) {
    return { formatted: `+63${cleanNumber}`, isValid: true };
  }
  
  return { formatted: 'Invalid format', isValid: false };
}

export default function PhilippinePhoneInput({
  id,
  name,
  value,
  onChange,
  placeholder = "09123456789 or 9123456789",
  className = "",
  label,
  required = false,
  disabled = false,
  showFormatPreview = true
}: PhilippinePhoneInputProps) {
  const [formatPreview, setFormatPreview] = useState({ formatted: '', isValid: false });

  // Update format preview when value changes
  useEffect(() => {
    if (showFormatPreview) {
      setFormatPreview(formatPhilippinePhonePreview(value));
    }
  }, [value, showFormatPreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
  };

  const baseInputClasses = `
    block w-full px-3 py-2 border border-gray-300 rounded-md 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  const inputClasses = className || baseInputClasses;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {!required && <span className="text-gray-500 text-xs ml-1">(optional)</span>}
        </label>
      )}
      
      <input
        type="tel"
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={inputClasses}
        required={required}
        disabled={disabled}
        autoComplete="tel"
      />
      
      <p className="text-xs text-gray-500">
        Philippine mobile number (10 digits starting with 9). Leading 0 will be automatically removed.
      </p>
      
      {showFormatPreview && formatPreview.formatted && (
        <p className={`text-sm font-medium ${
          formatPreview.isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          Will be formatted as: {formatPreview.formatted}
        </p>
      )}
    </div>
  );
}
