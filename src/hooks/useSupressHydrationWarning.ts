'use client';

import { useEffect, useState } from 'react';

/**
 * A hook that suppresses React hydration warnings by delaying rendering until after hydration
 * @returns A boolean indicating whether it's safe to render client-specific content
 */
export function useSupressHydrationWarning() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
