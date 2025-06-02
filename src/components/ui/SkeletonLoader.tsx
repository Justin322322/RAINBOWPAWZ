'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/classNames';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
  animate = true,
  children,
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'bg-gray-200',
        width,
        height,
        roundedClasses[rounded],
        animate && 'animate-pulse',
        className
      )}
    >
      {children}
    </div>
  );
};

export interface SkeletonTextProps extends SkeletonProps {
  lines?: number;
  spacing?: 'tight' | 'normal' | 'loose';
  lastLineWidth?: 'full' | '3/4' | '2/3' | '1/2' | '1/3' | '1/4';
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  className,
  lines = 3,
  spacing = 'normal',
  lastLineWidth = '2/3',
  ...props
}) => {
  const spacingClasses = {
    tight: 'space-y-1',
    normal: 'space-y-2',
    loose: 'space-y-3',
  };

  const lastLineWidthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '2/3': 'w-2/3',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? lastLineWidthClasses[lastLineWidth] : ''}
          {...props}
        />
      ))}
    </div>
  );
};

export interface SkeletonCardProps {
  className?: string;
  animate?: boolean;
  withImage?: boolean;
  imageHeight?: string;
  withHeader?: boolean;
  withFooter?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg';
  withShadow?: boolean;
  withBorder?: boolean;
  contentLines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className,
  animate = true,
  withImage = false,
  imageHeight = 'h-40',
  withHeader = true,
  withFooter = false,
  rounded = 'lg',
  withShadow = true,
  withBorder = false,
  contentLines = 3,
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-white overflow-hidden',
        roundedClasses[rounded],
        withShadow && 'shadow-sm',
        withBorder && 'border border-gray-200',
        className
      )}
    >
      {withImage && (
        <Skeleton
          height={imageHeight}
          rounded="none"
          animate={animate}
        />
      )}
      <div className="p-4">
        {withHeader && (
          <div className="mb-4">
            <Skeleton
              height="h-6"
              rounded="md"
              animate={animate}
              className="mb-2"
            />
            <Skeleton
              height="h-4"
              width="w-2/3"
              rounded="md"
              animate={animate}
            />
          </div>
        )}
        <SkeletonText
          lines={contentLines}
          animate={animate}
        />
        {withFooter && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <Skeleton
              width="w-1/4"
              height="h-8"
              rounded="md"
              animate={animate}
            />
            <Skeleton
              width="w-1/4"
              height="h-8"
              rounded="md"
              animate={animate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const SkeletonLoader = {
  Skeleton,
  SkeletonText,
  SkeletonCard,
};

export default SkeletonLoader;
