'use client';

import { useEffect, useState } from 'react';

/**
 * Optimized hook that properly handles hydration without suppressing warnings
 * Instead, it ensures consistent rendering between server and client
 * @returns A boolean indicating whether the component has hydrated
 */
export function useSupressHydrationWarning() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after the first render cycle
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Hook for handling client-only content without hydration mismatches
 * @returns A boolean indicating whether it's safe to render client-specific content
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Hook for handling SSR-safe state initialization
 * @param clientValue - Value to use on client side
 * @param serverValue - Value to use on server side (optional, defaults to clientValue)
 * @returns The appropriate value based on hydration state
 */
export function useSSRSafeState<T>(clientValue: T, serverValue?: T): T {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated ? clientValue : (serverValue ?? clientValue);
}
