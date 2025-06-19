'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const { setLoading, setLoadingMessage, setLoadingSection, clearAllLoading } = useLoading();

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fetchData = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const newAbortController = new AbortController();
    abortControllerRef.current = newAbortController;

    if (!silent) {
      setIsLoading(true);
      setError(null);

      if (showGlobalLoading) {
        setLoading(true);
        setLoadingMessage(loadingMessage);
      }

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
        signal: newAbortController.signal,
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

      if (onSuccessRef.current) {
        onSuccessRef.current(result);
      }

      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      if (onErrorRef.current) {
        onErrorRef.current(error);
      }

      return null;
    } finally {
      if (abortControllerRef.current === newAbortController) {
        abortControllerRef.current = null;
      }

      if (!silent) {
        setIsLoading(false);

        if (showGlobalLoading) {
          setLoading(false);
        }

        if (showSectionLoading) {
          setLoadingSection(null);
        }
      }
    }
  }, [url, method, body, headers, loadingMessage, showGlobalLoading, showSectionLoading, sectionId, setLoading, setLoadingMessage, setLoadingSection]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Track if initial fetch has been performed for the current set of dependencies
  const initialFetchPerformedRef = useRef<string>('');
  
  // Create a stable key from dependencies to track when they change
  const dependencyKey = JSON.stringify([...dependencies, skipInitialFetch]);

  useEffect(() => {
    // Only perform initial fetch if:
    // 1. skipInitialFetch is false
    // 2. We haven't already fetched for this exact set of dependencies
    if (!skipInitialFetch && initialFetchPerformedRef.current !== dependencyKey) {
      initialFetchPerformedRef.current = dependencyKey;
      fetchData();
    }
    
    // If skipInitialFetch becomes true, reset the ref so that when it becomes false again,
    // we can fetch even if other dependencies haven't changed
    if (skipInitialFetch) {
      initialFetchPerformedRef.current = '';
    }
  }, [dependencyKey, skipInitialFetch, fetchData]);

  return { data, isLoading, error, fetchData, setData };
}

export default useDataFetching;
