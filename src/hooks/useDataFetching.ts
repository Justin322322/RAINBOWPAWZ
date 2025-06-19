'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLoading } from '@/contexts/LoadingContext';

interface FetchOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  loadingMessage?: string;
  showGlobalLoading?: boolean;
  showSectionLoading?: boolean;
  sectionId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  dependencies?: any[];
  skipInitialFetch?: boolean;
}

export function useDataFetching<T = any>({
  url,
  method = 'GET',
  body,
  headers = {},
  loadingMessage = 'Loading data...',
  showGlobalLoading = false,
  showSectionLoading = true,
  sectionId = 'default',
  onSuccess,
  onError,
  dependencies = [],
  skipInitialFetch = false,
}: FetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Get global loading context
  const { setLoading, setLoadingMessage, setLoadingSection, _clearAllLoading } = useLoading();

  const fetchData = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;

    // Cancel any existing request
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller for this request
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    if (!silent) {
      setIsLoading(true);
      setError(null);

      // Prevent overlapping global loaders
      if (showGlobalLoading) {
        setLoading(true);
        setLoadingMessage(loadingMessage);
      }

      // Prevent overlapping section loaders
      if (showSectionLoading) {
        setLoadingSection(sectionId);
      }
    }

    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: newAbortController.signal, // Add abort signal
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      if (onError) {
        onError(error);
      }

      return null;
    } finally {
      // Clear abort controller
      setAbortController(null);

      if (!silent) {
        setIsLoading(false);

        // Ensure loading states are properly cleared
        if (showGlobalLoading) {
          setLoading(false);
        }

        if (showSectionLoading) {
          setLoadingSection(null);
        }
      }
    }
  }, [url, method, body, headers, loadingMessage, showGlobalLoading, showSectionLoading, sectionId, onSuccess, onError, setLoading, setLoadingMessage, setLoadingSection, abortController]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  useEffect(() => {
    if (!skipInitialFetch) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, skipInitialFetch, fetchData]);

  return { data, isLoading, error, fetchData, setData };
}

export default useDataFetching;
