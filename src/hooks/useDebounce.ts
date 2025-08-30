import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value to reduce the frequency of updates
 * Useful for optimizing input performance during rapid typing
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds before updating the debounced value
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
