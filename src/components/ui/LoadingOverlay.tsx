'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from './Spinner';
import { cn } from '@/utils/classNames';
import { useLoading } from '@/contexts/LoadingContext';

export interface LoadingOverlayProps {
  isLoading?: boolean;
  message?: string;
  className?: string;
  spinnerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  spinnerColor?: 'primary' | 'white' | 'gray' | 'black';
  blur?: boolean;
  opacity?: 'light' | 'medium' | 'dark';
  zIndex?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading: propIsLoading,
  message: propMessage,
  className,
  spinnerSize = 'lg',
  spinnerColor = 'primary',
  blur = true,
  opacity = 'medium',
  zIndex = 'z-50',
}) => {
  // Use the loading context if no prop is provided
  const loadingContext = useLoading();
  
  const isLoading = propIsLoading !== undefined ? propIsLoading : loadingContext.isLoading;
  const message = propMessage || loadingContext.loadingMessage || 'Loading...';

  const opacityClasses = {
    light: 'bg-white/60',
    medium: 'bg-white/80',
    dark: 'bg-white/95',
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 flex items-center justify-center',
            opacityClasses[opacity],
            blur && 'backdrop-blur-sm',
            zIndex,
            className
          )}
        >
          <div className="flex flex-col items-center justify-center p-6 rounded-lg">
            <Spinner 
              size={spinnerSize} 
              color={spinnerColor} 
              label={message}
              showLabel={true}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
