'use client';

import { useEffect } from 'react';

/**
 * This component adds JS-based flicker prevention
 * It should be included in the root layout
 */
export default function FlickerPrevention() {
  useEffect(() => {
    // Mark that JavaScript is loaded
    document.body.classList.add('js-loaded');

    // Create a style element to prevent flicker during initial load
    const style = document.createElement('style');
    style.innerHTML = `
      /* Prevent any flicker during initial load */
      .no-flicker-skeleton {
        display: block;
      }
      .js-content {
        display: none;
      }
      body.js-loaded .no-flicker-skeleton {
        display: none;
      }
      body.js-loaded .js-content {
        display: block;
      }
    `;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null; // This component doesn't render anything
}
