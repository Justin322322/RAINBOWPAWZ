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

  // Get global loading context
  const { setLoading, setLoadingMessage, setLoadingSection } = useLoading();

  const fetchData = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;

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
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      if (onError) {
        onError(error);
      }

      return null;
    } finally {
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
  }, [url, method, body, headers, loadingMessage, showGlobalLoading, showSectionLoading, sectionId, onSuccess, onError, setLoading, setLoadingMessage, setLoadingSection]);

  useEffect(() => {
    if (!skipInitialFetch) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, skipInitialFetch, fetchData]);

  return { data, isLoading, error, fetchData, setData };
}

export default useDataFetching;
