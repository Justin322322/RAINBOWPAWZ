'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;
  loadingSection: string | null;
  setLoadingSection: (section: string | null) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      // Reset message when loading stops
      setLoadingMessage(null);
      setLoadingSection(null);
    }
  }, []);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(null);
    setLoadingSection(null);
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        startLoading,
        stopLoading,
        loadingMessage,
        setLoadingMessage,
        loadingSection,
        setLoadingSection,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Utility hook for section-specific loading
export const useSectionLoading = (sectionId: string): {
  isSectionLoading: boolean;
  startSectionLoading: (message?: string) => void;
  stopSectionLoading: () => void;
} => {
  const { loadingSection, setLoadingSection, setLoadingMessage } = useLoading();

  const isSectionLoading = loadingSection === sectionId;

  const startSectionLoading = useCallback(
    (message?: string) => {
      setLoadingSection(sectionId);
      if (message) {
        setLoadingMessage(message);
      }
    },
    [sectionId, setLoadingSection, setLoadingMessage]
  );

  const stopSectionLoading = useCallback(() => {
    if (loadingSection === sectionId) {
      setLoadingSection(null);
      setLoadingMessage(null);
    }
  }, [loadingSection, sectionId, setLoadingSection, setLoadingMessage]);

  return {
    isSectionLoading,
    startSectionLoading,
    stopSectionLoading,
  };
};
