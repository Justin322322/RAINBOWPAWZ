'use client';

import React from 'react';
import Image from 'next/image';
import { motion, Easing } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import { cn } from '@/utils/classNames';

export interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
  showLogo?: boolean;
  logoSrc?: string;
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
  spinnerColor?: 'primary' | 'white' | 'gray' | 'black';
  withOverlay?: boolean;
  withAnimation?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Loading...',
  fullScreen = false,
  className,
  showLogo = false,
  logoSrc = '/images/logo.png',
  spinnerSize = 'lg',
  spinnerColor = 'primary',
  withOverlay = false,
  withAnimation = true,
}) => {
  const Container = withAnimation ? motion.div : 'div';

  const animationProps = withAnimation
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: "easeOut" as Easing }
      }
    : {};

  return (
    <Container
      className={cn(
        'flex flex-col items-center justify-center',
        fullScreen ? 'fixed inset-0 z-50' : 'min-h-[300px]',
        withOverlay && 'bg-white/80 backdrop-blur-sm',
        className
      )}
      {...animationProps}
    >
      <div className="flex flex-col items-center justify-center p-6 rounded-lg">
        {showLogo && (
          <div className="mb-6">
            <Image
              src={logoSrc}
              alt="Logo"
              width={64}
              height={64}
              className="h-16 w-auto"
            />
          </div>
        )}

        <Spinner
          size={spinnerSize}
          color={spinnerColor}
          label={message}
          showLabel={true}
        />
      </div>
    </Container>
  );
};

export default PageLoader;
