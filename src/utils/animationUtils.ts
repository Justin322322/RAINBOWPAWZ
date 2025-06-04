/**
 * Animation utilities for optimized performance
 * Provides standardized animation configurations and performance optimizations
 */

import { useState } from 'react';

// Optimized animation configurations
export const ANIMATION_CONFIG = {
  // Fast animations for UI interactions
  fast: {
    duration: 0.15,
    ease: "easeOut" as const,
  },
  
  // Standard animations for most UI elements
  standard: {
    duration: 0.2,
    ease: "easeOut" as const,
  },
  
  // Slow animations for emphasis
  slow: {
    duration: 0.3,
    ease: "easeInOut" as const,
  },
  
  // Skeleton pulse animation (optimized)
  skeletonPulse: {
    duration: 2,
    ease: "easeInOut" as const,
    repeat: Infinity,
    repeatDelay: 0.5, // Reduce CPU usage
  },
  
  // Modal animations
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15, ease: "easeOut" },
    },
    content: {
      initial: { scale: 0.98, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.98, opacity: 0 },
      transition: { duration: 0.15, ease: "easeOut" },
    },
  },
  
  // Toast animations
  toast: {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { 
      duration: 0.2, 
      ease: "easeOut",
      layout: { duration: 0.15 }
    },
  },
  
  // Loading animations
  loading: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15, ease: "easeOut" },
  },
  
  // Stagger animations for lists
  stagger: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          duration: 0.3,
          staggerChildren: 0.05, // Reduced for better performance
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 10 },
      show: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.2 }
      },
    },
  },
} as const;

// Performance optimization utilities
export const animationUtils = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Get optimized animation config based on user preferences
   */
  getOptimizedConfig: (config: any) => {
    if (animationUtils.prefersReducedMotion()) {
      return {
        ...config,
        transition: {
          ...config.transition,
          duration: 0.01, // Nearly instant for reduced motion
        },
      };
    }
    return config;
  },

  /**
   * Create a throttled animation function to prevent excessive animations
   */
  createThrottledAnimation: (fn: Function, delay: number = 16) => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: any[]) => {
      if (timeoutId) return;
      
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  },

  /**
   * Check if device has limited performance capabilities
   */
  isLowPerformanceDevice: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check for various performance indicators
    const connection = (navigator as any).connection;
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const deviceMemory = (navigator as any).deviceMemory || 1;
    
    // Consider device low performance if:
    // - Less than 4 CPU cores
    // - Less than 2GB RAM
    // - Slow network connection
    return (
      hardwareConcurrency < 4 ||
      deviceMemory < 2 ||
      (connection && connection.effectiveType && 
       ['slow-2g', '2g', '3g'].includes(connection.effectiveType))
    );
  },

  /**
   * Get animation config optimized for device performance
   */
  getPerformanceOptimizedConfig: (config: any) => {
    if (animationUtils.isLowPerformanceDevice()) {
      return {
        ...config,
        transition: {
          ...config.transition,
          duration: Math.min(config.transition?.duration || 0.2, 0.1),
        },
      };
    }
    return config;
  },

  /**
   * Combine multiple optimization strategies
   */
  getOptimalConfig: (config: any) => {
    let optimizedConfig = config;
    
    // Apply reduced motion preferences
    optimizedConfig = animationUtils.getOptimizedConfig(optimizedConfig);
    
    // Apply performance optimizations
    optimizedConfig = animationUtils.getPerformanceOptimizedConfig(optimizedConfig);
    
    return optimizedConfig;
  },
};

// CSS-based animation classes for better performance
export const CSS_ANIMATIONS = {
  fadeIn: 'animate-fadeIn',
  fadeOut: 'animate-fadeOut',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
} as const;

// Utility to conditionally apply animations
export const conditionalAnimation = (
  condition: boolean,
  animationConfig: any,
  fallbackConfig: any = {}
) => {
  return condition ? animationConfig : fallbackConfig;
};

// Hook for managing animation states
export const useOptimizedAnimation = (baseConfig: any) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const optimizedConfig = animationUtils.getOptimalConfig(baseConfig);
  
  const startAnimation = () => setIsAnimating(true);
  const endAnimation = () => setIsAnimating(false);
  
  return {
    config: optimizedConfig,
    isAnimating,
    startAnimation,
    endAnimation,
  };
};

export default ANIMATION_CONFIG;
