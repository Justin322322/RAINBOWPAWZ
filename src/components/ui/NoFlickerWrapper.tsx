'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/utils/classNames';

interface NoFlickerWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
  suppressHydrationWarning?: boolean;
}

/**
 * Optimized wrapper component that prevents flickering during hydration
 * Uses proper SSR-safe rendering without layout shifts
 */
export default function NoFlickerWrapper({
  children,
  fallback,
  className,
  fallbackClassName,
  suppressHydrationWarning = false
}: NoFlickerWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // If no fallback provided, render children with hydration handling
  if (!fallback) {
    return (
      <div
        className={className}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {isHydrated ? children : null}
      </div>
    );
  }

  // Render fallback during SSR and initial hydration, then switch to children
  return (
    <div className={className}>
      {!isHydrated && (
        <div className={cn("animate-pulse", fallbackClassName)}>
          {fallback}
        </div>
      )}
      {isHydrated && (
        <div className="animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Simple client-only wrapper that renders nothing on server
 */
export function ClientOnly({
  children,
  fallback = null,
  className
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className={className}>
      {isClient ? children : fallback}
    </div>
  );
}
