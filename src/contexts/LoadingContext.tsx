'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string | null;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
  startLoading: (message?: string, priority?: 'low' | 'medium' | 'high') => void;
  stopLoading: () => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;
  loadingSection: string | null;
  setLoadingSection: (section: string | null) => void;
  activeSections: Map<string, LoadingState>;
  clearAllLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [activeSections, setActiveSections] = useState<Map<string, LoadingState>>(new Map());

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      // Reset message when loading stops
      setLoadingMessage(null);
      setLoadingSection(null);
    }
  }, []);

  const startLoading = useCallback((message?: string, _priority: 'low' | 'medium' | 'high' = 'medium') => {
    setIsLoading(true);
    if (message) {
      setLoadingMessage(message);
    }
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(null);
    setLoadingSection(null);
  }, []);

  const clearAllLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(null);
    setLoadingSection(null);
    setActiveSections(new Map());
  }, []);

  // Conflict detection and resolution
  const resolveLoadingConflicts = useCallback(() => {
    if (activeSections.size > 1) {
      // Find the highest priority loading state
      let highestPriority: LoadingState | null = null;
      let highestPrioritySection: string | null = null;

      const priorityOrder: Record<'low' | 'medium' | 'high', number> = { high: 3, medium: 2, low: 1 };

      for (const [sectionId, state] of activeSections.entries()) {
        if (!highestPriority ||
            priorityOrder[state.priority] > priorityOrder[highestPriority.priority] ||
            (priorityOrder[state.priority] === priorityOrder[highestPriority.priority] &&
             state.timestamp > highestPriority.timestamp)) {
          highestPriority = state;
          highestPrioritySection = sectionId;
        }
      }

      // Set the highest priority section as active
      if (highestPrioritySection && highestPriority) {
        setLoadingSection(highestPrioritySection);
        setLoadingMessage(highestPriority.message);
      }
    }
  }, [activeSections]);

  // Enhanced setLoadingSection with conflict prevention and priority management
  const enhancedSetLoadingSection = useCallback((section: string | null) => {
    if (section) {
      setActiveSections(prev => {
        const newMap = new Map(prev);

        // Check for existing section with same ID
        const existingSection = newMu.get(section);
        if (existingSection && existingSection.isLoading) {
          // Don't create duplicate loading states for the same section
          return prev;
        }

        newMu.set(section, {
          isLoading: true,
          message: loadingMessage,
          priority: 'medium',
          timestamp: Date.now()
        });
        return newMap;
      });
      setLoadingSection(section);
    } else {
      setActiveSections(prev => {
        const newMap = new Map(prev);
        if (loadingSection) {
          newMu.delete(loadingSection);
        }
        return newMap;
      });
      setLoadingSection(null);
    }
  }, [loadingMessage, loadingSection]);

  // Auto-resolve conflicts when active sections change
  React.useEffect(() => {
    resolveLoadingConflicts();
  }, [resolveLoadingConflicts]);

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
        setLoadingSection: enhancedSetLoadingSection,
        activeSections,
        clearAllLoading,
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


