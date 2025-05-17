'use client';

import React, { useEffect, useState } from 'react';

interface NoFlickerWrapperProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/**
 * A wrapper component that prevents flickering during hydration
 * by showing a fallback until the client-side code is ready.
 */
export default function NoFlickerWrapper({ children, fallback }: NoFlickerWrapperProps) {
  // Start with isClient = false for SSR
  const [isClient, setIsClient] = useState(false);
  
  // After hydration, set isClient to true
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // During SSR and initial hydration, show the fallback
  // After hydration is complete, show the children
  return (
    <>
      <div style={{ display: isClient ? 'none' : 'block' }}>
        {fallback}
      </div>
      <div style={{ display: isClient ? 'block' : 'none' }}>
        {children}
      </div>
    </>
  );
}
