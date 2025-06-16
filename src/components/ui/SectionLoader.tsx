'use client';

import React from 'react';
import { motion, Easing } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import { cn } from '@/utils/classNames';

export interface SectionLoaderProps {
  message?: string;
  className?: string;
  spinnerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  spinnerColor?: 'primary' | 'white' | 'gray' | 'black';
  minHeight?: string;
  withAnimation?: boolean;
  withBackground?: boolean;
  withBorder?: boolean;
  withShadow?: boolean;
  rounded?: boolean;
  sectionId?: string; // Optional section ID for conflict prevention
}

export const SectionLoader: React.FC<SectionLoaderProps> = ({
  message = 'Loading...',
  className,
  spinnerSize = 'md',
  spinnerColor = 'primary',
  minHeight = 'min-h-[200px]',
  withAnimation = true,
  withBackground = true,
  withBorder = false,
  withShadow = false,
  rounded = true,
  sectionId, // Optional section ID for conflict prevention
}) => {
  const Container = withAnimation ? motion.div : 'div';
  
  const animationProps = withAnimation
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: "easeOut" as Easing }
      }
    : {};

  return (
    <Container
      className={cn(
        'flex flex-col items-center justify-center w-full',
        minHeight,
        withBackground && 'bg-white',
        withBorder && 'border border-gray-200',
        withShadow && 'shadow-sm',
        rounded && 'rounded-lg',
        className
      )}
      {...animationProps}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner 
        size={spinnerSize} 
        color={spinnerColor} 
        label={message}
        showLabel={true}
      />
    </Container>
  );
};

export default SectionLoader;
