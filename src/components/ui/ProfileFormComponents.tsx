import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ProfileInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
}

interface ProfileTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
  className?: string;
}

interface ProfileSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

interface ProfileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

interface ProfileAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

// Profile Input Component
export const ProfileInput: React.FC<ProfileInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  icon,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {!required && <span className="text-gray-500 text-xs ml-1">(optional)</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">{icon}</div>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            block w-full rounded-lg border border-gray-300 shadow-sm bg-white
            focus:border-[var(--primary-green)] focus:ring-[var(--primary-green)] focus:ring-1
            disabled:bg-gray-50 disabled:text-gray-500
            ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
            transition-colors duration-200 text-gray-900
          `}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

// Profile Textarea Component
export const ProfileTextArea: React.FC<ProfileTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  rows = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {!required && <span className="text-gray-500 text-xs ml-1">(optional)</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`
          block w-full rounded-lg border border-gray-300 shadow-sm bg-white
          focus:border-[var(--primary-green)] focus:ring-[var(--primary-green)] focus:ring-1
          disabled:bg-gray-50 disabled:text-gray-500
          px-3 py-2.5 resize-y
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
          transition-colors duration-200 text-gray-900
        `}
      />
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

// ProfileSelect component removed - not used

// Profile Button Component
export const ProfileButton: React.FC<ProfileButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = ''
}) => {
  const variants = {
    primary: 'bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] text-white border-transparent',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg border
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
      ) : icon ? (
        <div className="h-4 w-4 mr-2">{icon}</div>
      ) : null}
      {children}
    </motion.button>
  );
};

// Profile Alert Component
export const ProfileAlert: React.FC<ProfileAlertProps> = ({
  type,
  message,
  onClose,
  className = ''
}) => {
  const styles = {
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircleIcon className="h-5 w-5 text-red-400" />
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
    }
  };

  const style = styles[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        rounded-lg border p-4 ${style.bg} ${style.border} ${className}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {style.icon}
        </div>
        <div className={`ml-3 flex-1 ${style.text}`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none ${style.text}`}
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Default export removed - not used
