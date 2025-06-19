'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// Helper function to create a stable hash from dependencies
function createDependencyHash(deps: any[]): string {
  return deps.map((dep, index) => {
    if (dep === null || dep === undefined) {
      return `${index}:${dep}`;
    }
    if (typeof dep === 'function') {
      return `${index}:function:${dep.name || 'anonymous'}`;
    }
    if (typeof dep === 'object') {
      try {
        return `${index}:object:${JSON.stringify(dep)}`;
      } catch {
        return `${index}:object:non-serializable`;
      }
    }
    return `${index}:${typeof dep}:${String(dep)}`;
  }).join('|');
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
  
  // Create a stable, memoized dependency key that includes core fetch parameters
  const dependencyKey = useMemo(() => {
    const coreDeps = [url, method, body, headers];
    const allDeps = [...coreDeps, ...dependencies, skipInitialFetch];
    return createDependencyHash(allDeps);
  }, [url, method, body, headers, dependencies, skipInitialFetch]);

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
  }, [dependencyKey, skipInitialFetch]);

  return { data, isLoading, error, fetchData, setData };
}

export default useDataFetching;
