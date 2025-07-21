'use client';

import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PasswordCriteriaProps {
  password: string;
  onStrengthChange?: (strength: number, isValid: boolean) => void;
}

interface CriteriaItem {
  id: string;
  label: string;
  test: (password: string) => boolean;
  description: string;
}

const PasswordCriteria: React.FC<PasswordCriteriaProps> = ({ password, onStrengthChange }) => {
  const criteria: CriteriaItem[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      test: (pwd) => pwd.length >= 8,
      description: 'Minimum 8 characters required'
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
      description: 'Include at least one lowercase letter (a-z)'
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
      description: 'Include at least one uppercase letter (A-Z)'
    },
    {
      id: 'number',
      label: 'One number',
      test: (pwd) => /\d/.test(pwd),
      description: 'Include at least one number (0-9)'
    },
    {
      id: 'special',
      label: 'One special character',
      test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
      description: 'Include at least one special character (!@#$%^&*)'
    }
  ];

  const passedCriteria = criteria.filter(criterion => criterion.test(password));
  const strength = passedCriteria.length;
  const isValid = strength === criteria.length;

  // Notify parent component of strength changes
  React.useEffect(() => {
    if (onStrengthChange) {
      onStrengthChange(strength, isValid);
    }
  }, [strength, isValid, onStrengthChange]);



  if (!password) {
    return (
      <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Password Requirements</h4>
        <div className="space-y-2">
          {criteria.map((criterion) => (
            <div key={criterion.id} className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>
              <span className="text-sm text-gray-600">{criterion.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Criteria Checklist */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Requirements</h4>
        <div className="space-y-2">
          {criteria.map((criterion) => {
            const isPassed = criterion.test(password);
            return (
              <div key={criterion.id} className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isPassed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {isPassed ? (
                    <CheckIcon className="w-3 h-3" />
                  ) : (
                    <XMarkIcon className="w-3 h-3" />
                  )}
                </div>
                <span className={`text-sm transition-colors duration-200 ${
                  isPassed ? 'text-green-700 font-medium' : 'text-gray-600'
                }`}>
                  {criterion.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Success Message */}
        {isValid && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Great! Your password meets all requirements
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordCriteria;
